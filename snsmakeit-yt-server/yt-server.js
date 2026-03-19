import express from "express";
import cors from "cors";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3001;

const ALLOWED = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["https://snsmakeit.com","https://www.snsmakeit.com","http://localhost:5173","http://localhost:3000"];

app.use(cors({ origin: ALLOWED }));
app.use(express.json({ limit: "1mb" }));

// 헬스체크
app.get("/", (req, res) => res.json({ status:"ok", service:"snsmakeit-yt-processor", version:"1.0" }));

// 유튜브 정보만 가져오기
app.get("/api/youtube-info", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error:"url 파라미터 필요" });
  try {
    const { stdout } = await execAsync(
      `yt-dlp --dump-json --no-playlist "${url.replace(/"/g,"")}"`,
      { timeout:30000 }
    );
    const info = JSON.parse(stdout);
    res.json({
      title:    info.title,
      thumbnail: info.thumbnail,
      duration:  info.duration,
      id:       info.id,
    });
  } catch(e) {
    res.status(500).json({ error:"영상 정보 조회 실패: "+e.message.slice(0,200) });
  }
});

// 구간 추출 + 세로 변환
app.post("/api/youtube-process", async (req, res) => {
  const { url, startTime, endTime, clipTitle="shortform" } = req.body;
  if (!url || startTime == null || endTime == null)
    return res.status(400).json({ error:"url, startTime, endTime 필요" });

  const duration = Math.round(endTime - startTime);
  if (duration <= 0)   return res.status(400).json({ error:"endTime이 startTime보다 커야 해요" });
  if (duration > 300)  return res.status(400).json({ error:"최대 5분까지 지원해요" });

  const safeTitle = String(clipTitle).replace(/[^가-힣a-zA-Z0-9_-]/g,"_").slice(0,40);
  const tid     = `${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  const rawFile = `/tmp/raw_${tid}.mp4`;
  const outFile = `/tmp/out_${tid}.mp4`;

  const toHMS = s => {
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  try {
    // 1. yt-dlp로 해당 구간 다운로드
    const dlCmd = `yt-dlp -f "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best" `
      + `--download-sections "*${toHMS(startTime)}-${toHMS(endTime)}" `
      + `--force-keyframes-at-cuts `
      + `-o "${rawFile}" `
      + `"${url.replace(/"/g,"")}"`;
    console.log("⬇️  다운로드 중...", url.slice(0,60));
    await execAsync(dlCmd, { timeout:180000 });

    // yt-dlp가 확장자 변경할 수 있으므로 실제 파일 찾기
    let actualRaw = rawFile;
    if (!fs.existsSync(rawFile)) {
      const candidates = fs.readdirSync("/tmp").filter(f => f.startsWith(`raw_${tid}`));
      if (candidates.length === 0) throw new Error("다운로드 파일을 찾을 수 없어요");
      actualRaw = `/tmp/${candidates[0]}`;
    }

    // 2. ffmpeg: 9:16 세로 변환 (crop center)
    const ffCmd = `ffmpeg -y -i "${actualRaw}" `
      + `-vf "scale=1920:1080,transpose=1,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" `
      + `-c:v libx264 -preset fast -crf 23 `
      + `-c:a aac -b:a 128k -ar 44100 `
      + `-movflags +faststart `
      + `-t ${duration} `
      + `"${outFile}"`;
    // 더 간단한 방법 (가로→세로 crop)
    const ffCmd2 = `ffmpeg -y -i "${actualRaw}" `
      + `-vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1" `
      + `-c:v libx264 -preset fast -crf 23 `
      + `-c:a aac -b:a 128k `
      + `-movflags +faststart `
      + `-t ${duration} `
      + `"${outFile}"`;
    console.log("🎬 ffmpeg 세로 변환 중...");
    try {
      await execAsync(ffCmd2, { timeout:300000 });
    } catch {
      // 세로crop 실패 시 단순 리사이즈
      const ffFallback = `ffmpeg -y -i "${actualRaw}" `
        + `-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" `
        + `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart -t ${duration} "${outFile}"`;
      await execAsync(ffFallback, { timeout:300000 });
    }

    if (!fs.existsSync(outFile)) throw new Error("변환 출력 파일 없음");
    const stat = fs.statSync(outFile);
    console.log(`✅ 완료 ${(stat.size/1024/1024).toFixed(1)}MB`);

    // 3. 스트리밍 전송
    res.setHeader("Content-Type","video/mp4");
    res.setHeader("Content-Disposition",`attachment; filename="${safeTitle}.mp4"`);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Access-Control-Expose-Headers","Content-Disposition,Content-Length");

    const stream = fs.createReadStream(outFile);
    stream.pipe(res);
    stream.on("close", () => {
      try { fs.unlinkSync(actualRaw); } catch {}
      try { fs.unlinkSync(outFile);   } catch {}
    });
  } catch(e) {
    console.error("❌ 처리 실패:", e.message);
    try { fs.unlinkSync(rawFile);  } catch {}
    try { fs.unlinkSync(outFile);  } catch {}
    if (!res.headersSent)
      res.status(500).json({ error:"처리 실패: "+e.message.slice(0,300) });
  }
});

app.listen(PORT, () => console.log(`🚀 SNS메이킷 YT 서버: http://localhost:${PORT}`));

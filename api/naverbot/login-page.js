// NaverBot SaaS - 메이킷 계정 로그인 브릿지 페이지
// 정적 HTML 파일로 호스팅할 때 Vercel edge cache 이슈가 있어서 API route로 서빙
// no-cache 헤더로 항상 최신 버전 보장

import fs from "node:fs";
import path from "node:path";

let cachedHtml = null;

function loadHtml() {
  if (cachedHtml) return cachedHtml;
  // public/naverbot-auth.html 파일 로드 (빌드 시 serverless function bundle에 포함됨)
  try {
    const htmlPath = path.join(process.cwd(), "public", "naverbot-auth.html");
    cachedHtml = fs.readFileSync(htmlPath, "utf8");
  } catch {
    cachedHtml = null;
  }
  return cachedHtml;
}

export default function handler(req, res) {
  // 브라우저는 표준 GET 요청
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  const html = loadHtml() || INLINE_HTML;
  return res.status(200).send(html);
}

// 파일 로드 실패 시 폴백 인라인 HTML (최소 버전)
const INLINE_HTML = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>메이킷 SNS 자동화 로그인</title>
<style>body{font-family:sans-serif;background:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{max-width:420px;padding:40px;background:#fff;border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,.06);text-align:center}
h1{font-size:22px;margin-bottom:10px}p{color:#6b7280;margin-bottom:20px}
.btn{display:block;width:100%;padding:13px;background:#ef4f5f;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:10px}
.btn-google{background:#fff;color:#111;border:1px solid #e5e7eb}
input{width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;margin-top:10px}
</style></head><body><div class="card" id="card"><div>로딩 중...</div></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script>
const SUPABASE_URL="https://ckzjnpzadeovrasucjmu.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA4NTcsImV4cCI6MjA4OTQ4Njg1N30.qgRa-YIm_ttKYTAcFI3xxXAADGPNPUU1bb7EVz_-Ljs";
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const card=document.getElementById("card");
function callback(session){const u=new URL("makeit-sns://auth");u.searchParams.set("access_token",session.access_token);u.searchParams.set("email",session.user.email||"");u.searchParams.set("uid",session.user.id||"");return u.toString()}
function showOk(session){const url=callback(session);card.innerHTML='<h1>로그인 완료</h1><p>앱으로 이동합니다...</p><button class="btn" onclick="location.href=\\''+url+'\\'">앱으로 이동</button>';setTimeout(()=>{location.href=url},700)}
function showLogin(){card.innerHTML='<h1>메이킷 로그인</h1><p>snsmakeit.com 계정으로 로그인</p><button class="btn btn-google" id="g">Google로 계속하기</button><input type="email" id="email" placeholder="이메일"><input type="password" id="pw" placeholder="비밀번호"><button class="btn" id="em">이메일로 로그인</button>';
document.getElementById("g").onclick=async()=>{await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.href}})};
document.getElementById("em").onclick=async()=>{const{data,error}=await client.auth.signInWithPassword({email:document.getElementById("email").value,password:document.getElementById("pw").value});if(error)return alert(error.message);showOk(data.session)}}
(async()=>{const{data:{session}}=await client.auth.getSession();if(session)showOk(session);else showLogin()})();
</script></body></html>`;

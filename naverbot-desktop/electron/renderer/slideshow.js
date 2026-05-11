// ═══════════════════════════════════════════════════════════
// 슬라이드 영상 생성기 v4 — 타임라인 기반 자막
// ═══════════════════════════════════════════════════════════

(function() {
  "use strict";

  var state = {
    bgmPath: null, bgmDuration: 0, bgmFileName: "",
    photos: [],       // [{ path, name }]
    segments: [],     // [{text, start, end}] — 타임라인 자막
    currentStep: 1,
  };

  var $ = function(id) { return document.getElementById(id); };
  function escHtml(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function fmtTime(sec) { var m=Math.floor(sec/60),s=Math.floor(sec%60); return m+":"+(s<10?"0":"")+s; }
  function fmtSec(sec) { return sec.toFixed(1) + "s"; }

  // DOM
  var bgmDropZone=$("ssBgmDropZone"), bgmInput=$("ssBgmInput"), bgmInfo=$("ssBgmInfo");
  var bgmNameEl=$("ssBgmName"), bgmDurEl=$("ssBgmDuration"), bgmPlayBtn=$("ssBgmPlay"), bgmClearBtn=$("ssBgmClear");
  var bgmVolume=$("ssBgmVolume"), bgmVolLabel=$("ssBgmVolLabel"), bgmAudio=$("ssBgmAudio");
  var lyricsStatus=$("ssLyricsStatus"), lyricsStatusText=$("ssLyricsStatusText");
  var lyricsPreview=$("ssLyricsPreview"), lyricsTextEl=$("ssLyricsText");
  var lyricsEditBtn=$("ssLyricsEdit"), lyricsEditArea=$("ssLyricsEditArea");
  var addPhotosBtn=$("ssAddPhotos"), clearAllBtn=$("ssClearAll"), fileInput=$("ssFileInput");
  var photosEl=$("ssPhotos"), photoEmpty=$("ssPhotoEmpty"), photoHint=$("ssPhotoHint");
  var timelineEl=$("ssTimeline"), timelineEmpty=$("ssTimelineEmpty");
  var generateBtn=$("ssGenerate"), progressDiv=$("ssProgress"), progressBar=$("ssProgressBar");
  var progressLabel=$("ssProgressLabel"), resultDiv=$("ssResult"), resultVideo=$("ssResultVideo");

  if (!bgmDropZone) return;

  // ═══ 스텝 네비게이션 ═══
  function goStep(n) {
    state.currentStep = n;
    [1,2,3,4].forEach(function(i) {
      var panel = $("ssStep" + i);
      if (panel) panel.style.display = i === n ? "" : "none";
    });
    document.querySelectorAll(".ss-step-ind").forEach(function(el) {
      var s = parseInt(el.dataset.step);
      el.style.borderBottomColor = s <= n ? "var(--accent)" : "var(--border)";
      el.style.color = s === n ? "var(--accent)" : s < n ? "var(--text-main)" : "var(--text-dim)";
    });
    if (n === 3) renderTimeline();
    if (n === 4) renderSummary();
  }

  document.querySelectorAll(".ss-step-ind").forEach(function(el) {
    el.addEventListener("click", function() { var s=parseInt(el.dataset.step); if(s<=state.currentStep) goStep(s); });
  });

  var next1=$("ssNext1"), next2=$("ssNext2"), next3=$("ssNext3");
  var prev2=$("ssPrev2"), prev3=$("ssPrev3"), prev4=$("ssPrev4");
  if(next1) next1.onclick=function(){ goStep(2); };
  if(next2) next2.onclick=function(){ goStep(3); };
  if(next3) next3.onclick=function(){ goStep(4); };
  if(prev2) prev2.onclick=function(){ goStep(1); };
  if(prev3) prev3.onclick=function(){ goStep(2); };
  if(prev4) prev4.onclick=function(){ goStep(3); };

  var restartBtn=$("ssRestart");
  if(restartBtn) restartBtn.onclick=function(){
    state.photos=[]; state.segments=[]; state.bgmPath=null; state.bgmDuration=0;
    bgmDropZone.style.display=""; bgmInfo.style.display="none"; bgmInput.value="";
    bgmAudio.pause(); bgmAudio.src="";
    lyricsPreview.style.display="none"; lyricsEditArea.style.display="none"; lyricsStatus.style.display="none";
    next1.style.display="none"; resultDiv.style.display="none"; progressDiv.style.display="none";
    updatePhotosUI(); goStep(1);
  };

  // ═══ STEP 1: 음악 ═══
  bgmDropZone.onclick=function(){ bgmInput.click(); };
  bgmInput.onchange=function(){ if(bgmInput.files&&bgmInput.files[0]) loadBgm(bgmInput.files[0]); };
  if(typeof enableDragDrop==="function") enableDragDrop(bgmDropZone, null, { accept:"audio/*,.mp3,.wav,.ogg,.m4a,.flac", onDrop:function(f){ if(f[0]) loadBgm(f[0]); } });

  function loadBgm(file) {
    state.bgmPath = file.path || file.name;
    state.bgmFileName = file.name;
    bgmNameEl.textContent = file.name;
    var url = URL.createObjectURL(file);
    bgmAudio.src = url;
    bgmAudio.onloadedmetadata = function() {
      state.bgmDuration = bgmAudio.duration || 0;
      bgmDurEl.textContent = fmtTime(state.bgmDuration) + " (" + Math.floor(state.bgmDuration) + "초)";
      bgmDropZone.style.display = "none";
      bgmInfo.style.display = "";
      next1.style.display = "";
      autoFetchLyrics();
    };
    bgmAudio.onerror = function() {
      if (window.nbBridge && window.nbBridge.invoke) {
        window.nbBridge.invoke("slideshow:bgmDuration", state.bgmPath).then(function(dur) {
          state.bgmDuration = dur || 0;
          bgmDurEl.textContent = fmtTime(state.bgmDuration) + " (" + Math.floor(state.bgmDuration) + "초)";
          bgmDropZone.style.display = "none"; bgmInfo.style.display = "";
          next1.style.display = "";
          autoFetchLyrics();
        });
      }
    };
  }

  bgmPlayBtn.onclick=function(){
    if(bgmAudio.paused){ bgmAudio.volume=(bgmVolume.value||50)/100; bgmAudio.play(); bgmPlayBtn.textContent="정지"; }
    else{ bgmAudio.pause(); bgmAudio.currentTime=0; bgmPlayBtn.textContent="재생"; }
  };
  bgmClearBtn.onclick=function(){
    state.bgmPath=null; state.bgmDuration=0; state.segments=[];
    bgmAudio.pause(); bgmAudio.src=""; bgmPlayBtn.textContent="재생";
    bgmDropZone.style.display=""; bgmInfo.style.display="none"; bgmInput.value="";
    next1.style.display="none";
    lyricsPreview.style.display="none"; lyricsEditArea.style.display="none"; lyricsStatus.style.display="none";
  };
  bgmVolume.oninput=function(){ bgmVolLabel.textContent=bgmVolume.value+"%"; bgmAudio.volume=bgmVolume.value/100; };

  // ── Whisper STT → 타임라인 자막 자동 생성 ──
  async function autoFetchLyrics() {
    lyricsStatus.style.display = "";
    lyricsStatusText.textContent = "음원에서 가사를 인식하고 있습니다...";
    lyricsPreview.style.display = "none";
    lyricsEditArea.style.display = "none";
    $("ssLyricsSpinner").style.display = "";

    try {
      var result = await window.nbBridge.invoke("slideshow:extractLyrics", state.bgmPath);

      if (result && result.ok && result.segments && result.segments.length > 0) {
        state.segments = result.segments.map(function(s){return {text:(s.text||"").trim(), start:s.start||0, end:s.end||0};}).filter(function(s){return s.text;});
        $("ssLyricsSpinner").style.display = "none";
        lyricsStatusText.textContent = state.segments.length + "개 구간 인식 완료!";
        setTimeout(function(){ lyricsStatus.style.display="none"; }, 1500);
        lyricsTextEl.textContent = state.segments.map(function(s){ return "["+fmtSec(s.start)+"] "+s.text; }).join("\n");
        lyricsPreview.style.display = "";
        return;
      }

      // Whisper 실패 → AI 가사 검색
      lyricsStatusText.textContent = "AI로 가사를 검색합니다...";
      var songName = state.bgmFileName.replace(/\.[^.]+$/, "").replace(/[_\-]/g, " ");
      var prompt = '노래: "' + songName + '"\n가사를 줄바꿈으로 출력해. 못 찾으면 분위기에 맞는 감성 문구 10~15줄.\n줄바꿈만. 마크다운/번호 없이.';
      var res = await fetch("https://snsmakeit.com/api/ai-proxy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1500, messages: [{ role: "user", content: prompt }] })
      });
      var data = await res.json();
      var text = (data.content && data.content[0] && data.content[0].text) || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
      if (text.trim()) {
        // AI 가사를 균등 타이밍으로 segments 생성
        var lines = text.trim().split(/\n/).filter(function(l){return l.trim();});
        var dur = state.bgmDuration || 60;
        var perLine = dur / lines.length;
        state.segments = lines.map(function(l, idx) {
          return { text: l.trim(), start: idx * perLine, end: (idx + 1) * perLine };
        });
      }

      $("ssLyricsSpinner").style.display = "none";
      lyricsStatusText.textContent = state.segments.length > 0 ? state.segments.length + "개 구간 준비 완료!" : "가사를 찾지 못했습니다";
      setTimeout(function(){ lyricsStatus.style.display="none"; }, 1500);
      if (state.segments.length) {
        lyricsTextEl.textContent = state.segments.map(function(s){ return "["+fmtSec(s.start)+"] "+s.text; }).join("\n");
        lyricsPreview.style.display = "";
      }
    } catch(e) {
      $("ssLyricsSpinner").style.display = "none";
      lyricsStatusText.textContent = "가사 인식 실패";
      console.error("[slideshow] lyrics error:", e);
    }
  }

  // 가사 수정 (원본 텍스트)
  if(lyricsEditBtn) lyricsEditBtn.onclick=function(){
    if(lyricsEditArea.style.display==="none"){
      lyricsEditArea.value = state.segments.map(function(s){ return s.text; }).join("\n");
      lyricsEditArea.style.display=""; lyricsPreview.style.display="none"; lyricsEditBtn.textContent="저장";
    } else {
      // 수정된 텍스트로 segments 재생성 (타이밍 유지)
      var lines = lyricsEditArea.value.split(/\n/).filter(function(l){return l.trim();});
      var dur = state.bgmDuration || 60;
      if (lines.length !== state.segments.length) {
        var perLine = dur / lines.length;
        state.segments = lines.map(function(l, idx) { return { text: l.trim(), start: idx*perLine, end: (idx+1)*perLine }; });
      } else {
        lines.forEach(function(l, idx) { state.segments[idx].text = l.trim(); });
      }
      lyricsTextEl.textContent = state.segments.map(function(s){ return "["+fmtSec(s.start)+"] "+s.text; }).join("\n");
      lyricsEditArea.style.display="none"; lyricsPreview.style.display=""; lyricsEditBtn.textContent="수정";
    }
  };

  // ═══ STEP 2: 사진 ═══
  addPhotosBtn.onclick=function(){ fileInput.click(); };
  photoEmpty.onclick=function(){ fileInput.click(); };
  if(typeof enableDragDrop==="function") enableDragDrop(photoEmpty, null, { accept:"image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp", onDrop:function(files){
    files.forEach(function(f){ if(f.path) state.photos.push({path:f.path,name:f.name}); }); updatePhotosUI();
  }});
  fileInput.onchange=function(){
    if(!fileInput.files) return;
    for(var i=0;i<fileInput.files.length;i++){ var f=fileInput.files[i]; if(f.path) state.photos.push({path:f.path,name:f.name}); }
    fileInput.value=""; updatePhotosUI();
  };
  clearAllBtn.onclick=function(){ state.photos=[]; updatePhotosUI(); };

  function updatePhotosUI() {
    var has=state.photos.length>0;
    photoEmpty.style.display=has?"none":""; clearAllBtn.style.display=has?"":"none"; next2.style.display=has?"":"none";
    var pp=state.bgmDuration>0&&state.photos.length?(state.bgmDuration/state.photos.length).toFixed(1):"3.0";
    photoHint.textContent=has?state.photos.length+"장 x "+pp+"초"+(state.bgmDuration?" = "+fmtTime(state.bgmDuration):""):"";
    photosEl.innerHTML="";
    state.photos.forEach(function(p,i){
      var row=document.createElement("div");
      row.style.cssText="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-dim);border-radius:8px;";
      row.dataset.idx=i;
      row.innerHTML='<span style="font-size:12px;font-weight:700;color:var(--text-dim);min-width:20px;">'+(i+1)+'</span><img src="file:///'+p.path.replace(/\\/g,"/")+'" style="width:48px;height:48px;object-fit:cover;border-radius:6px;"><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escHtml(p.name)+'</div><div style="font-size:11px;color:var(--text-dim);">'+pp+'초</div></div><button class="btn btn-sm ss-up" style="font-size:10px;padding:2px 6px;">&uarr;</button><button class="btn btn-sm ss-down" style="font-size:10px;padding:2px 6px;">&darr;</button><button class="btn btn-sm ss-rm" style="font-size:10px;padding:2px 6px;color:#ef4444;">X</button>';
      photosEl.appendChild(row);
    });
    photosEl.onclick=function(e){ var b=e.target,row=b.closest("[data-idx]"); if(!row) return; var i=parseInt(row.dataset.idx);
      if(b.classList.contains("ss-up")&&i>0){var t=state.photos[i];state.photos[i]=state.photos[i-1];state.photos[i-1]=t;updatePhotosUI();}
      else if(b.classList.contains("ss-down")&&i<state.photos.length-1){var t2=state.photos[i];state.photos[i]=state.photos[i+1];state.photos[i+1]=t2;updatePhotosUI();}
      else if(b.classList.contains("ss-rm")){state.photos.splice(i,1);updatePhotosUI();}
    };
  }

  // ═══ STEP 3: 타임라인 자막 ═══
  function renderTimeline() {
    if (!timelineEl) return;
    var hasSegs = state.segments.length > 0;
    timelineEmpty.style.display = hasSegs ? "none" : "";

    timelineEl.innerHTML = "";
    state.segments.forEach(function(seg, i) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--bg-dim);border-radius:6px;font-size:12px;";
      row.dataset.idx = i;

      // 타임라인 바 (전체 음악 길이 대비 위치)
      var pctStart = state.bgmDuration ? (seg.start / state.bgmDuration * 100) : 0;
      var pctWidth = state.bgmDuration ? ((seg.end - seg.start) / state.bgmDuration * 100) : 5;

      row.innerHTML =
        '<span style="min-width:16px;font-weight:700;color:var(--text-dim);">' + (i+1) + '</span>' +
        '<input type="number" class="ss-seg-start" data-idx="'+i+'" value="'+seg.start.toFixed(1)+'" step="0.5" min="0" style="width:50px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;text-align:center;" title="시작(초)">' +
        '<span style="color:var(--text-dim);">~</span>' +
        '<input type="number" class="ss-seg-end" data-idx="'+i+'" value="'+seg.end.toFixed(1)+'" step="0.5" min="0" style="width:50px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;text-align:center;" title="끝(초)">' +
        '<input type="text" class="ss-seg-text" data-idx="'+i+'" value="'+escHtml(seg.text)+'" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;">' +
        '<button class="btn btn-sm ss-seg-del" data-idx="'+i+'" style="font-size:10px;padding:2px 6px;color:#ef4444;">X</button>';

      timelineEl.appendChild(row);
    });

    // 이벤트
    timelineEl.oninput = function(e) {
      var t = e.target, idx = parseInt(t.dataset.idx);
      if (isNaN(idx)) return;
      if (t.classList.contains("ss-seg-start")) state.segments[idx].start = parseFloat(t.value) || 0;
      if (t.classList.contains("ss-seg-end")) state.segments[idx].end = parseFloat(t.value) || 0;
      if (t.classList.contains("ss-seg-text")) state.segments[idx].text = t.value;
    };
    timelineEl.onclick = function(e) {
      var btn = e.target.closest(".ss-seg-del");
      if (btn) { state.segments.splice(parseInt(btn.dataset.idx), 1); renderTimeline(); }
    };
  }

  // 구간 추가
  $("ssSubAddSeg").onclick = function() {
    var lastEnd = state.segments.length ? state.segments[state.segments.length-1].end : 0;
    state.segments.push({ text: "", start: lastEnd, end: Math.min(lastEnd + 3, state.bgmDuration || 999) });
    renderTimeline();
    // 스크롤 맨 아래
    timelineEl.scrollTop = timelineEl.scrollHeight;
  };
  $("ssSubClearAll").onclick = function() { state.segments = []; renderTimeline(); };

  // ═══ STEP 4: 요약 + 생성 ═══
  function renderSummary() {
    var pp = state.bgmDuration>0&&state.photos.length?(state.bgmDuration/state.photos.length).toFixed(1):"3";
    var motionLabel = {kenburns:"켄 번즈",zoom:"줌 인/아웃",pan:"좌우 패닝",none:"정지"};
    var motion = $("ssMotion")?$("ssMotion").value:"kenburns";
    var color = $("ssColorGrade")?$("ssColorGrade").value:"none";
    var colorLabel = {none:"원본",warm:"따뜻한 톤",cool:"차가운 톤",vintage:"빈티지",bw:"흑백"};
    var res = $("ssResolution")?$("ssResolution").value:"1920x1080";
    var summary = $("ssSummary");
    if(summary) summary.innerHTML =
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 16px;">'+
      '<span style="color:var(--text-dim);">음악</span><span style="font-weight:600;">'+escHtml(state.bgmFileName)+'</span>'+
      '<span style="color:var(--text-dim);">길이</span><span>'+fmtTime(state.bgmDuration)+'</span>'+
      '<span style="color:var(--text-dim);">사진</span><span>'+state.photos.length+'장 ('+pp+'초/장)</span>'+
      '<span style="color:var(--text-dim);">자막</span><span>'+state.segments.length+'개 구간</span>'+
      '<span style="color:var(--text-dim);">모션</span><span>'+(motionLabel[motion]||motion)+'</span>'+
      '<span style="color:var(--text-dim);">색감</span><span>'+(colorLabel[color]||"원본")+'</span>'+
      '<span style="color:var(--text-dim);">해상도</span><span>'+res+'</span>'+
      '</div>';
  }

  // ── 생성 ──
  generateBtn.onclick = async function() {
    if(!state.photos.length) return;

    // 타임라인 최신값 반영
    document.querySelectorAll(".ss-seg-start").forEach(function(inp){ var i=parseInt(inp.dataset.idx); if(!isNaN(i)) state.segments[i].start=parseFloat(inp.value)||0; });
    document.querySelectorAll(".ss-seg-end").forEach(function(inp){ var i=parseInt(inp.dataset.idx); if(!isNaN(i)) state.segments[i].end=parseFloat(inp.value)||0; });
    document.querySelectorAll(".ss-seg-text").forEach(function(inp){ var i=parseInt(inp.dataset.idx); if(!isNaN(i)) state.segments[i].text=inp.value; });

    var params = {
      photos: state.photos.map(function(p){return p.path;}),
      subtitles: [],
      bgmPath: state.bgmPath,
      bgmVolume: parseInt(bgmVolume.value)/100,
      perPhoto: state.bgmDuration > 0 ? state.bgmDuration/state.photos.length : 3,
      resolution: $("ssResolution")?$("ssResolution").value:"1920x1080",
      transition: $("ssTransition")?$("ssTransition").value:"fade",
      motion: $("ssMotion")?$("ssMotion").value:"kenburns",
      colorGrade: $("ssColorGrade")?$("ssColorGrade").value:"none",
      vignette: false,
      fadeInOut: $("ssFadeInOut")?$("ssFadeInOut").checked:false,
      subFont: $("ssSubFont")?$("ssSubFont").value:"pretendard",
      subAnim: "fade",
      subBg: ($("ssSubBgStyle")?$("ssSubBgStyle").value:"box") === "box",
      subBgStyle: $("ssSubBgStyle")?$("ssSubBgStyle").value:"box",
      subLines: 1,
      segments: state.segments.filter(function(s){ return s.text && s.text.trim(); }),
    };

    generateBtn.disabled=true; generateBtn.textContent="생성 중...";
    progressDiv.style.display=""; resultDiv.style.display="none";
    progressBar.style.width="0%"; progressLabel.textContent="준비 중...";

    try {
      var outPath = await window.nbBridge.invoke("slideshow:generate", params);
      progressBar.style.width="100%"; progressLabel.textContent="완료!";
      resultDiv.style.display=""; resultVideo.src="file:///"+outPath.replace(/\\/g,"/");
      state._lastOutput=outPath;
    } catch(e) { progressLabel.textContent="오류: "+(e.message||e); }
    generateBtn.disabled=false; generateBtn.textContent="영상 생성";
  };

  if(window.nbBridge&&window.nbBridge.on) {
    window.nbBridge.on("slideshow:progress",function(_,d){ if(d&&d.percent!=null){ progressBar.style.width=d.percent+"%"; progressLabel.textContent=d.label||""; }});
  }
  $("ssSaveAs").onclick=function(){ if(state._lastOutput&&window.nbBridge) window.nbBridge.invoke("slideshow:saveAs",state._lastOutput); };
  $("ssOpenFolder").onclick=function(){ if(state._lastOutput&&window.nbBridge) window.nbBridge.invoke("slideshow:openFolder",state._lastOutput); };
})();

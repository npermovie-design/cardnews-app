// ── 카드뉴스 에디터 (Fabric.js 기반) ──
(function() {
  var API = "https://snsmakeit.com/api";
  var RATIOS = { "1:1": [540, 540], "9:16": [540, 960], "4:5": [540, 675] };
  var EXPORT_RATIOS = { "1:1": [1080, 1080], "9:16": [1080, 1920], "4:5": [1080, 1350] };

  var slides = []; // 각 슬라이드의 Fabric JSON
  var currentIdx = 0;
  var fc = null; // fabric.Canvas
  var _cardRefContent = "";

  // ─── 브랜드명 ───
  $("cardBrandName")?.addEventListener("change", function() {
    var c = $("cardBrandCustom"); if (c) c.style.display = this.value === "_custom" ? "block" : "none";
  });
  function getBrandName() {
    var sel = $("cardBrandName"); if (!sel) return "";
    return sel.value === "_custom" ? (($("cardBrandCustom") || {}).value || "") : (sel.value || "");
  }

  // ─── Fabric 초기화 ───
  function initFabric() {
    if (fc) fc.dispose();
    var ratio = RATIOS[($("cardRatio") || {}).value] || RATIOS["1:1"];
    var el = $("cardFabricCanvas");
    el.width = ratio[0]; el.height = ratio[1];
    fc = new fabric.Canvas("cardFabricCanvas", { width: ratio[0], height: ratio[1], backgroundColor: "#1c1c1e" });
    fc.on("selection:created", onSelect);
    fc.on("selection:updated", onSelect);
    fc.on("selection:cleared", function() {});
  }

  function onSelect(e) {
    var obj = fc.getActiveObject(); if (!obj) return;
    if (obj.type === "textbox" || obj.type === "text") {
      $("cardSelColor").value = obj.fill || "#ffffff";
      $("cardSelSize").value = Math.round(obj.fontSize || 28);
    }
  }

  // ─── 슬라이드를 Fabric으로 그리기 ───
  function buildSlide(slide, bgUrl) {
    initFabric();
    var ratio = RATIOS[($("cardRatio") || {}).value] || RATIOS["1:1"];
    var W = ratio[0], H = ratio[1];
    var bgColor = $("cardBgColor") ? $("cardBgColor").value : "#1c1c1e";
    var textColor = "#ffffff";
    var brand = getBrandName();

    fc.setBackgroundColor(bgColor, fc.renderAll.bind(fc));

    function addTexts() {
      // 부제목
      if (slide.subtitle) {
        fc.add(new fabric.Textbox(slide.subtitle, {
          left: W * 0.09, top: H * 0.35, width: W * 0.82,
          fontSize: 14, fill: textColor, opacity: 0.6, fontWeight: "600",
          fontFamily: "'Malgun Gothic', sans-serif", lineHeight: 1.4,
        }));
      }
      // 제목
      fc.add(new fabric.Textbox(slide.title || "제목을 입력하세요", {
        left: W * 0.09, top: H * (slide.subtitle ? 0.42 : 0.35), width: W * 0.82,
        fontSize: slide.isHookCover ? 34 : 28, fill: textColor, fontWeight: "900",
        fontFamily: "'Malgun Gothic', sans-serif", lineHeight: 1.3,
      }));
      // 본문
      if (slide.body) {
        fc.add(new fabric.Textbox(slide.body, {
          left: W * 0.09, top: H * 0.58, width: W * 0.82,
          fontSize: 13, fill: textColor, opacity: 0.85, fontWeight: "400",
          fontFamily: "'Malgun Gothic', sans-serif", lineHeight: 1.7,
        }));
      }
      // 하이라이트
      if (slide.highlight) {
        var hlBg = new fabric.Rect({
          left: W * 0.07, top: H * 0.78, width: W * 0.5, height: 30, rx: 15, ry: 15,
          fill: textColor, opacity: 0.15,
        });
        fc.add(hlBg);
        fc.add(new fabric.Textbox(slide.highlight, {
          left: W * 0.09, top: H * 0.78 + 5, width: W * 0.46,
          fontSize: 13, fill: textColor, fontWeight: "700",
          fontFamily: "'Malgun Gothic', sans-serif",
        }));
      }
      // 뱃지
      if (slide.badge) {
        var badgeBg = new fabric.Rect({
          left: W * 0.09, top: H * 0.26, width: 0, height: 26, rx: 13, ry: 13,
          fill: textColor, opacity: 0.9,
        });
        var badgeText = new fabric.Text(slide.badge, {
          left: W * 0.09 + 12, top: H * 0.26 + 5, fontSize: 11, fill: bgColor, fontWeight: "900",
          fontFamily: "'Malgun Gothic', sans-serif",
        });
        badgeBg.set({ width: badgeText.width + 24 });
        fc.add(badgeBg); fc.add(badgeText);
      }
      // 브랜드명
      if (brand) {
        fc.add(new fabric.Text(brand, {
          left: W / 2, top: H - 30, fontSize: 10, fill: textColor, opacity: 0.5,
          fontWeight: "700", fontFamily: "'Malgun Gothic', sans-serif",
          originX: "center",
        }));
      }
      fc.renderAll();
    }

    // 배경 이미지
    if (bgUrl) {
      fabric.Image.fromURL(bgUrl, function(img) {
        if (!img) { addTexts(); return; }
        img.scaleToWidth(W);
        if (img.getScaledHeight() < H) img.scaleToHeight(H);
        img.set({ left: 0, top: 0, originX: "left", originY: "top", selectable: false, evented: false });
        fc.setBackgroundImage(img, function() {
          // 그라데이션 오버레이
          var overlay = parseInt(($("cardOverlay") || {}).value || 50);
          var overlayRect = new fabric.Rect({
            left: 0, top: 0, width: W, height: H, selectable: false, evented: false,
            fill: new fabric.Gradient({
              type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: H },
              colorStops: [
                { offset: 0, color: "rgba(0,0,0," + (overlay * 0.003) + ")" },
                { offset: 0.5, color: "rgba(0,0,0," + (overlay * 0.006) + ")" },
                { offset: 1, color: "rgba(0,0,0," + (overlay / 100) + ")" },
              ]
            }),
          });
          fc.add(overlayRect); fc.sendToBack(overlayRect);
          addTexts();
        });
      }, { crossOrigin: "anonymous" });
    } else {
      addTexts();
    }
  }

  // ─── 슬라이드 저장/로드 ───
  function saveCurrentSlide() {
    if (!fc) return;
    slides[currentIdx] = { json: fc.toJSON(), bgUrl: slides[currentIdx]?.bgUrl || null, data: slides[currentIdx]?.data || {} };
  }

  function loadSlide(idx) {
    if (idx < 0 || idx >= slides.length) return;
    saveCurrentSlide();
    currentIdx = idx;
    renderTabs();
    var s = slides[idx];
    if (s.json) {
      initFabric();
      fc.loadFromJSON(s.json, function() { fc.renderAll(); });
    } else {
      buildSlide(s.data || {}, s.bgUrl || null);
    }
  }

  function renderTabs() {
    var tabs = $("cardSlideTabs"); if (!tabs) return;
    tabs.innerHTML = "";
    slides.forEach(function(s, i) {
      var btn = document.createElement("button");
      btn.className = "chip" + (i === currentIdx ? " active" : "");
      btn.textContent = i === 0 ? "표지" : i === slides.length - 1 ? "CTA" : (i + 1) + "번";
      btn.addEventListener("click", function() { loadSlide(i); });
      tabs.appendChild(btn);
    });
  }

  // ─── 속성 패널 ───
  $("cardSelColor")?.addEventListener("input", function() {
    var obj = fc?.getActiveObject(); if (!obj) return;
    obj.set("fill", this.value); fc.renderAll();
  });
  $("cardSelSize")?.addEventListener("input", function() {
    var obj = fc?.getActiveObject(); if (!obj || !obj.fontSize) return;
    obj.set("fontSize", parseInt(this.value) || 28); fc.renderAll();
  });
  $("cardSelBold")?.addEventListener("click", function() {
    var obj = fc?.getActiveObject(); if (!obj) return;
    obj.set("fontWeight", obj.fontWeight === "900" ? "400" : "900"); fc.renderAll();
  });
  $("cardSelDelete")?.addEventListener("click", function() {
    var obj = fc?.getActiveObject(); if (!obj) return;
    fc.remove(obj); fc.renderAll();
  });
  $("cardSelDuplicate")?.addEventListener("click", function() {
    var obj = fc?.getActiveObject(); if (!obj) return;
    obj.clone(function(cloned) { cloned.set({ left: obj.left + 20, top: obj.top + 20 }); fc.add(cloned); fc.setActiveObject(cloned); fc.renderAll(); });
  });

  // 텍스트 추가
  $("cardAddTitleBtn")?.addEventListener("click", function() {
    if (!fc) return;
    fc.add(new fabric.Textbox("제목 입력", { left: 50, top: 200, width: 440, fontSize: 28, fill: "#ffffff", fontWeight: "900", fontFamily: "'Malgun Gothic', sans-serif", lineHeight: 1.3 }));
    fc.renderAll();
  });
  $("cardAddBodyBtn")?.addEventListener("click", function() {
    if (!fc) return;
    fc.add(new fabric.Textbox("본문 내용을 입력하세요.", { left: 50, top: 300, width: 440, fontSize: 13, fill: "#ffffff", opacity: 0.85, fontWeight: "400", fontFamily: "'Malgun Gothic', sans-serif", lineHeight: 1.7 }));
    fc.renderAll();
  });
  $("cardAddBadgeBtn")?.addEventListener("click", function() {
    if (!fc) return;
    var bg = new fabric.Rect({ left: 50, top: 150, width: 80, height: 26, rx: 13, ry: 13, fill: "#ffffff", opacity: 0.9 });
    var txt = new fabric.Text("저장 필수", { left: 62, top: 155, fontSize: 11, fill: "#1c1c1e", fontWeight: "900", fontFamily: "'Malgun Gothic', sans-serif" });
    var grp = new fabric.Group([bg, txt], { left: 50, top: 150 });
    fc.add(grp); fc.renderAll();
  });

  // 배경색
  $("cardBgColor")?.addEventListener("input", function() {
    if (!fc) return;
    fc.setBackgroundColor(this.value, fc.renderAll.bind(fc));
  });

  // ─── URL 가져오기 ───
  $("cardUrlFetchBtn")?.addEventListener("click", async function() {
    var url = ($("cardRefUrl") || {}).value; if (!url || !url.trim()) return;
    $("cardUrlFetchBtn").textContent = "가져오는 중..."; $("cardUrlFetchBtn").disabled = true;
    try {
      var res = await fetch(API + "/fetch-url-content", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ url: url.trim() }) });
      var data = await res.json();
      _cardRefContent = data.content || data.text || "";
      if (_cardRefContent) {
        $("cardUrlPreview").style.display = "block";
        $("cardUrlPreview").textContent = _cardRefContent.slice(0, 300) + "...";
        if ($("cardContent") && !$("cardContent").value.trim()) $("cardContent").value = _cardRefContent.slice(0, 2000);
      }
    } catch { showModal("오류", "URL을 가져올 수 없습니다.", "확인"); }
    $("cardUrlFetchBtn").textContent = "가져오기"; $("cardUrlFetchBtn").disabled = false;
  });

  // ─── AI 내용 기획 → 바로 생성 ───
  $("cardAiPlanBtn")?.addEventListener("click", async function() {
    var topic = ($("cardTopic") || {}).value; if (!topic || !topic.trim()) return showModal("알림", "주제를 입력해주세요.", "확인");
    $("cardAiPlanBtn").textContent = "기획 중..."; $("cardAiPlanBtn").disabled = true;
    try {
      var res = await fetch(API + "/ai-proxy", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-haiku-4-5", max_tokens:2000, messages:[{ role:"user", content:"다음 주제로 인스타그램 카드뉴스를 기획해줘.\n\n주제: " + topic.trim() + "\n\n슬라이드별 내용을 구체적으로:\n1. 표지 - 강한 후킹 제목\n2~6. 각 슬라이드 (소제목 + 2-3줄)\n마지막. 팔로잉/댓글 유도\n\n이모지 금지. 마크다운(#, *, -) 금지. 일반 텍스트만." }] }),
      });
      var data = await res.json();
      var text = data.choices?.[0]?.message?.content || "";
      if (text && $("cardContent")) { $("cardContent").value = text; $("cardGenerateBtn")?.click(); }
    } catch { showModal("오류", "AI 기획에 실패했습니다.", "확인"); }
    $("cardAiPlanBtn").textContent = "AI로 내용 기획"; $("cardAiPlanBtn").disabled = false;
  });

  // ─── 횟수 관리 ───
  var CL_KEY = "_cardnews_used", CD_KEY = "_cardnews_date";
  var CL_LIMITS = { trial:2, starter:3, pro:10, premium:99999, admin:99999 };
  async function checkCardLimit() {
    var cfg = (await bridge.loadConfig()) || {};
    var today = new Date().toISOString().slice(0, 10);
    if (cfg[CD_KEY] !== today) { cfg[CL_KEY] = 0; cfg[CD_KEY] = today; await bridge.saveConfig(cfg); }
    var limit = CL_LIMITS[normalizeExePlan(state.user)] || 2;
    return { canUse: (cfg[CL_KEY] || 0) < limit, limit: limit };
  }
  async function markCardUsed() {
    var cfg = (await bridge.loadConfig()) || {};
    var today = new Date().toISOString().slice(0, 10);
    if (cfg[CD_KEY] !== today) { cfg[CL_KEY] = 0; cfg[CD_KEY] = today; }
    cfg[CL_KEY] = (cfg[CL_KEY] || 0) + 1; await bridge.saveConfig(cfg);
  }

  // ─── 커버 이미지 검색 ───
  async function findCoverImage(keyword) {
    try {
      var res = await fetch(API + "/proxy?action=pexels&path=v1/search&query=" + encodeURIComponent(keyword || "business") + "&per_page=5&orientation=landscape");
      var data = await res.json();
      var photos = data.photos || [];
      var p = photos[Math.floor(Math.random() * Math.min(photos.length, 3))];
      return p ? (p.src.large || p.src.medium) : null;
    } catch { return null; }
  }

  // ─── 카드뉴스 생성 ───
  $("cardGenerateBtn")?.addEventListener("click", async function() {
    var content = ($("cardContent") || {}).value || "";
    var topic = ($("cardTopic") || {}).value || "";
    if (!content.trim() && !topic.trim()) return showModal("알림", "내용 또는 주제를 입력해주세요.", "확인");
    if (!state.loggedIn) return showModal("로그인 필요", "먼저 메이킷 계정에 로그인해주세요.", "확인");
    var quota = await checkCardLimit();
    if (!quota.canUse) return showModal("한도 초과", "오늘의 카드뉴스 한도(" + quota.limit + "회)를 사용했습니다.", "구독하기", function() { bridge.openExternal("https://snsmakeit.com/pricing"); });

    var brandName = getBrandName();
    var commentCTA = ($("cardCommentCTA") || {}).value || "";

    $("cardInputView").style.display = "none";
    $("cardLoadingView").style.display = "block";
    $("cardResultView").style.display = "none";
    $("cardLoadingMsg").textContent = "AI가 슬라이드를 생성 중...";

    var prompt = '인스타그램 카드뉴스 슬라이드 7장을 JSON으로 만들어줘.\n\n' +
      (content.trim() ? '내용:\n' + content.trim().slice(0, 3000) : '주제: ' + topic.trim()) +
      (_cardRefContent ? '\n\n참고:\n' + _cardRefContent.slice(0, 1500) : '') +
      '\n\nJSON만 응답:\n{"slides":[{"index":1,"title":"제목","subtitle":"부제목","body":"본문","highlight":"핵심요약","visualKeyword":"english photo keyword"}]}\n\n' +
      '첫 장: title 12~24자 후킹, badge "저장 필수", visualKeyword 필수\n' +
      '마지막: ' + (brandName ? brandName + ' 팔로우 유도' : '팔로잉 유도') + (commentCTA ? ', ' + commentCTA : ', 댓글 유도') + '\n' +
      '이모지 금지. 마크다운(#,*,-) 금지.';

    try {
      var res = await fetch(API + "/ai-proxy", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-haiku-4-5", max_tokens:3000, messages:[{ role:"user", content: prompt }] }),
      });
      if (!res.ok) throw new Error("AI 서버 오류");
      var data = await res.json();
      var text = data.choices?.[0]?.message?.content || "";
      var jsonMatch = text.match(/\{[\s\S]*"slides"[\s\S]*\}/);
      if (!jsonMatch) throw new Error("슬라이드 생성 실패");
      var parsed = JSON.parse(jsonMatch[0]);
      var rawSlides = parsed.slides || [];

      // 첫 장 커버 이미지
      $("cardLoadingMsg").textContent = "커버 이미지 검색 중...";
      var coverUrl = await findCoverImage(rawSlides[0]?.visualKeyword || topic || "business");

      // Fabric 슬라이드 배열 생성
      slides = rawSlides.map(function(s, i) {
        if (i === 0) { s.isHookCover = true; s.badge = s.badge || "저장 필수"; }
        return { json: null, bgUrl: i === 0 ? coverUrl : null, data: s };
      });
      currentIdx = 0;

      $("cardLoadingView").style.display = "none";
      $("cardResultView").style.display = "block";

      // 첫 슬라이드 빌드
      buildSlide(slides[0].data, slides[0].bgUrl);
      renderTabs();

      await markCardUsed();
      updateCardQuota();

    } catch (e) {
      $("cardLoadingView").style.display = "none";
      $("cardInputView").style.display = "block";
      showModal("생성 실패", e.message || "카드뉴스 생성 실패", "확인");
    }
  });

  // ─── 슬라이드 추가 ───
  $("cardAddSlideBtn")?.addEventListener("click", function() {
    saveCurrentSlide();
    slides.push({ json: null, bgUrl: null, data: { title: "새 슬라이드", subtitle: "", body: "내용을 입력하세요.", highlight: "" } });
    loadSlide(slides.length - 1);
  });

  // ─── 배경 사진 검색 ───
  $("cardSearchBgBtn")?.addEventListener("click", function() {
    $("cardBgSearchView").style.display = $("cardBgSearchView").style.display === "none" ? "block" : "none";
    if ($("cardBgSearchQuery")) $("cardBgSearchQuery").value = ($("cardTopic") || {}).value || "";
  });

  $("cardBgSearchBtn")?.addEventListener("click", async function() {
    var q = ($("cardBgSearchQuery") || {}).value; if (!q || !q.trim()) return;
    var results = $("cardBgSearchResults"); results.innerHTML = "검색 중...";
    try {
      var res = await fetch(API + "/proxy?action=pexels&path=v1/search&query=" + encodeURIComponent(q.trim()) + "&per_page=12&orientation=landscape");
      var data = await res.json();
      var photos = data.photos || [];
      results.innerHTML = "";
      photos.forEach(function(p) {
        var img = document.createElement("img");
        img.src = p.src.small || p.src.medium;
        img.style.cssText = "width:100%;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;";
        img.addEventListener("click", function() {
          var url = p.src.large || p.src.medium;
          slides[currentIdx].bgUrl = url;
          buildSlide(slides[currentIdx].data, url);
          $("cardBgSearchView").style.display = "none";
        });
        results.appendChild(img);
      });
      if (!photos.length) results.innerHTML = '<div style="color:var(--text-dim);font-size:12px;">결과 없음</div>';
    } catch { results.innerHTML = '<div style="color:var(--text-dim);font-size:12px;">검색 실패</div>'; }
  });

  // ─── 전체 다운로드 ───
  $("cardDownloadAllBtn")?.addEventListener("click", async function() {
    saveCurrentSlide();
    var exportRatio = EXPORT_RATIOS[($("cardRatio") || {}).value] || EXPORT_RATIOS["1:1"];
    var scaleX = exportRatio[0] / (fc ? fc.getWidth() : 540);

    for (var i = 0; i < slides.length; i++) {
      loadSlide(i);
      await new Promise(function(r) { setTimeout(r, 300); }); // 렌더링 대기
      var dataUrl = fc.toDataURL({ format: "png", multiplier: scaleX });
      var a = document.createElement("a");
      a.download = "card_" + String(i + 1).padStart(2, "0") + ".png";
      a.href = dataUrl; a.click();
    }
  });

  // ─── 인스타 캡션 ───
  $("cardGenCaptionBtn")?.addEventListener("click", async function() {
    var topic = ($("cardTopic") || {}).value || slides[0]?.data?.title || "";
    var brand = getBrandName();
    $("cardGenCaptionBtn").textContent = "생성 중..."; $("cardGenCaptionBtn").disabled = true;
    try {
      var slideTexts = slides.map(function(s, i) { return (i+1) + ". " + ((s.data || {}).title || ""); }).join("\n");
      var res = await fetch(API + "/ai-proxy", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-haiku-4-5", max_tokens:1000, messages:[{ role:"user", content:"다음 카드뉴스의 인스타그램 캡션:\n\n주제: " + topic + "\n슬라이드:\n" + slideTexts + (brand ? "\n브랜드: " + brand : "") + "\n\n규칙: 후킹 첫줄, 핵심 3-4줄, 해시태그 10~15개, 팔로우/저장 유도, 이모지 금지" }] }),
      });
      var data = await res.json();
      $("cardCaptionText").value = data.choices?.[0]?.message?.content || "";
    } catch { showModal("오류", "캡션 생성 실패", "확인"); }
    $("cardGenCaptionBtn").textContent = "AI 캡션 생성"; $("cardGenCaptionBtn").disabled = false;
  });

  $("cardCopyCaptionBtn")?.addEventListener("click", function() {
    navigator.clipboard.writeText(($("cardCaptionText") || {}).value || "").then(function() {
      $("cardCopyCaptionBtn").textContent = "복사됨!"; setTimeout(function() { $("cardCopyCaptionBtn").textContent = "복사"; }, 2000);
    });
  });

  // ─── 처음부터 ───
  $("cardRetryBtn")?.addEventListener("click", function() {
    $("cardResultView").style.display = "none";
    $("cardInputView").style.display = "block";
    $("cardBgSearchView").style.display = "none";
    slides = []; currentIdx = 0;
    if (fc) { fc.clear(); }
  });
})();

import { useState, useEffect, useRef } from "react";
import { CardNewsApp } from "./CardNewsApp";

/* ── 색상 ── */
const C={
  bg:"#0a0812", bg2:"#100d22", nav:"rgba(10,8,18,0.93)",
  border:"rgba(255,255,255,0.07)", purple:"#7c6aff", purpleL:"#a89bff",
  pink:"#ec4899", text:"#f0eeff", muted:"rgba(240,238,255,0.5)",
  card:"rgba(255,255,255,0.04)"
};

/* ── 게시판 카테고리 ── */
const CATS=[
  {id:"ai",    label:"AI & 프로그램 정보", icon:"🤖"},
  {id:"news",  label:"뉴스소식",           icon:"📰"},
  {id:"archive",label:"자료실",            icon:"📁"},
  {id:"qna",   label:"질문답변",           icon:"💬"},
];

/* ── 로컬스토리지 키 ── */
const POSTS_KEY="nper_posts_v2";
const USER_KEY ="nper_user";
const AI_KEY   ="nper_ai_usage";
const MEMBERS_KEY="nper_members";

/* ── 헬퍼 ── */
function getUser(){try{return JSON.parse(localStorage.getItem(USER_KEY)||"null");}catch{return null;}}
function setUser(u){try{localStorage.setItem(USER_KEY,JSON.stringify(u));}catch{}}
function getAiUsage(){try{return JSON.parse(localStorage.getItem(AI_KEY)||"{}");}catch{return {};}}
function setAiUsage(u){try{localStorage.setItem(AI_KEY,JSON.stringify(u));}catch{}}
function getPosts(){try{return JSON.parse(localStorage.getItem(POSTS_KEY)||"[]");}catch{return [];}}
function setPosts(p){try{localStorage.setItem(POSTS_KEY,JSON.stringify(p));}catch{}}
function getMembers(){try{return JSON.parse(localStorage.getItem(MEMBERS_KEY)||"[]");}catch{return[];}}
function saveMembers(m){try{localStorage.setItem(MEMBERS_KEY,JSON.stringify(m));}catch{}}

/* ── AI 사용 횟수 ── */
const FREE_GUEST=5;
const FREE_MEMBER=20;
function getAiLeft(user){
  const usage=getAiUsage();
  const key=user?"member_"+user.id:"guest";
  const used=usage[key]||0;
  const limit=user?FREE_MEMBER:FREE_GUEST;
  const points=user?(user.points||0):0;
  return {used,limit,left:Math.max(0,limit-used)+Math.floor(points/10),canUse:(limit-used>0)||(points>=10)};
}
function useAiOnce(user,setUserState){
  const usage=getAiUsage();
  const key=user?"member_"+user.id:"guest";
  const used=usage[key]||0;
  const limit=user?FREE_MEMBER:FREE_GUEST;
  if(used<limit){ setAiUsage({...usage,[key]:used+1}); return true; }
  if(user&&(user.points||0)>=10){
    const newUser={...user,points:(user.points||0)-10};
    setUser(newUser); setUserState(newUser);
    return true;
  }
  return false;
}

/* ── 공용 컴포넌트 ── */
const Glow=({top,left,size=500,color="rgba(124,106,255,0.09)"})=>(
  <div style={{position:"absolute",top,left,width:size,height:size,borderRadius:"50%",
    background:color,filter:"blur(80px)",pointerEvents:"none",zIndex:0}}/>
);
const Badge=({children})=>(
  <div style={{display:"inline-flex",alignItems:"center",gap:6,
    background:"rgba(124,106,255,0.12)",border:"1px solid rgba(124,106,255,0.25)",
    borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:700,
    color:C.purpleL,marginBottom:20}}>
    {children}
  </div>
);
const SecWrap=({children,bg,style={}})=>(
  <section style={{position:"relative",overflow:"hidden",
    padding:"100px 24px",background:bg||"transparent",...style}}>
    <div style={{maxWidth:1000,margin:"0 auto",position:"relative",zIndex:1}}>{children}</div>
  </section>
);
const SecTitle=({badge,title,sub,left})=>(
  <div style={{textAlign:left?"left":"center",marginBottom:56}}>
    {badge&&<Badge>+ {badge}</Badge>}
    <h2 style={{fontSize:"clamp(28px,4vw,46px)",fontWeight:900,color:C.text,
      letterSpacing:-1,lineHeight:1.15,marginBottom:16}}>{title}</h2>
    {sub&&<p style={{fontSize:16,color:C.muted,lineHeight:1.7,maxWidth:600,
      margin:left?"0":"0 auto"}}>{sub}</p>}
  </div>
);
const Btn=({children,onClick,ghost,small,full,style={}})=>{
  const base={borderRadius:12,border:"none",cursor:"pointer",fontWeight:700,
    transition:"all 0.2s",fontFamily:"inherit",...style};
  if(ghost) return(
    <button onClick={onClick} style={{...base,padding:small?"5px 14px":"12px 28px",
      fontSize:small?12:15,background:"transparent",
      border:"1px solid rgba(124,106,255,0.4)",color:C.purpleL,
      width:full?"100%":"auto"}}>
      {children}
    </button>
  );
  return(
    <button onClick={onClick} style={{...base,padding:small?"5px 14px":"14px 32px",
      fontSize:small?12:15,
      background:"linear-gradient(135deg,#7c6aff,#ec4899)",color:"#fff",
      boxShadow:"0 4px 20px rgba(124,106,255,0.35)",
      width:full?"100%":"auto"}}>
      {children}
    </button>
  );
};
const Inp=({style,...props})=>(
  <input style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,
    fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",...style}}
    {...props}/>
);
const Textarea=({style,...props})=>(
  <textarea style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,
    fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",
    resize:"vertical",...style}}
    {...props}/>
);

/* ── 이메일 검증 ── */
function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function genCode(){ return String(Math.floor(100000+Math.random()*900000)); }

/* ════════════════════════════════════════════════════════════
   AuthModal
════════════════════════════════════════════════════════════ */
function AuthModal({onClose,onAuth}){
  const [tab,setTab]=useState("login");
  const [form,setForm]=useState({email:"",pw:"",pw2:"",nick:""});
  const [err,setErr]=useState("");
  const [step,setStep]=useState("form");
  const [code,setCode]=useState("");
  const [inputCode,setInputCode]=useState("");
  const [codeTimer,setCodeTimer]=useState(0);
  const timerRef=useRef(null);

  const startTimer=()=>{
    setCodeTimer(180);
    clearInterval(timerRef.current);
    timerRef.current=setInterval(()=>{
      setCodeTimer(t=>{
        if(t<=1){clearInterval(timerRef.current);return 0;}
        return t-1;
      });
    },1000);
  };
  useEffect(()=>()=>clearInterval(timerRef.current),[]);
  const fmtTime=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");

  const login=()=>{
    setErr("");
    if(!form.email||!form.pw){setErr("이메일과 비밀번호를 입력해주세요.");return;}
    if(!isValidEmail(form.email)){setErr("올바른 이메일 형식이 아닙니다.");return;}
    const found=getMembers().find(m=>m.email===form.email&&m.pw===form.pw);
    if(!found){setErr("이메일 또는 비밀번호가 올바르지 않습니다.");return;}
    onAuth(found);
  };

  const sendCode=()=>{
    setErr("");
    if(!form.nick.trim()){setErr("닉네임을 입력해주세요.");return;}
    if(!isValidEmail(form.email)){setErr("올바른 이메일 형식이 아닙니다.");return;}
    if(form.pw.length<8){setErr("비밀번호는 8자 이상이어야 합니다.");return;}
    if(form.pw!==form.pw2){setErr("비밀번호가 일치하지 않습니다.");return;}
    if(getMembers().find(m=>m.email===form.email)){setErr("이미 가입된 이메일입니다.");return;}
    const nc=genCode();
    setCode(nc);setInputCode("");setStep("verify");startTimer();
    console.log("[인증코드]",form.email,":",nc);
    alert("인증코드: "+nc+"\n(테스트 모드 - 콘솔에서도 확인 가능)");
  };

  const verify=()=>{
    setErr("");
    if(codeTimer===0){setErr("인증 시간이 만료됐습니다. 다시 요청해주세요.");return;}
    if(inputCode.trim()!==code){setErr("인증코드가 올바르지 않습니다.");return;}
    const nu={id:Date.now(),email:form.email,pw:form.pw,nick:form.nick,
      role:"member",points:0,joinDate:new Date().toLocaleDateString("ko-KR"),verified:true};
    saveMembers([...getMembers(),nu]);
    clearInterval(timerRef.current);
    onAuth(nu);
  };

  const fs={background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:10,padding:"10px 14px",color:C.text,fontSize:13,
    fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};

  return(
    <div
      onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.75)",
        display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(10px)"}}>
      <div
        onClick={e=>e.stopPropagation()}
        style={{background:"#13102a",border:"1px solid rgba(124,106,255,0.25)",
          borderRadius:22,padding:"36px 30px",width:"100%",maxWidth:420,
          position:"relative",boxShadow:"0 24px 64px rgba(0,0,0,0.6)",margin:"0 16px"}}>

        <button
          onClick={onClose}
          style={{position:"absolute",top:16,right:16,background:"none",
            border:"none",color:C.muted,cursor:"pointer",fontSize:20,lineHeight:1}}>
          X
        </button>

        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:44,height:44,borderRadius:13,
            background:"linear-gradient(135deg,#7c6aff,#ec4899)",
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            fontSize:22,fontWeight:900,color:"#fff",marginBottom:8}}>N</div>
          <div style={{fontSize:15,fontWeight:900,color:C.text}}>엔퍼콘텐츠랩</div>
        </div>

        <div style={{display:"flex",marginBottom:24,background:"rgba(255,255,255,0.05)",
          borderRadius:10,padding:4}}>
          {[["login","로그인"],["register","회원가입"]].map(([t,l])=>(
            <button key={t}
              onClick={()=>{setTab(t);setErr("");setStep("form");setInputCode("");}}
              style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",
                fontSize:13,fontWeight:700,
                background:tab===t?"rgba(124,106,255,0.35)":"transparent",
                color:tab===t?C.text:C.muted}}>
              {l}
            </button>
          ))}
        </div>

        {tab==="login"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input placeholder="이메일" type="email" value={form.email} style={fs}
              onChange={e=>setForm({...form,email:e.target.value})}/>
            <input placeholder="비밀번호" type="password" value={form.pw} style={fs}
              onChange={e=>setForm({...form,pw:e.target.value})}
              onKeyDown={e=>e.key==="Enter"&&login()}/>
            {err&&(
              <div style={{fontSize:12,color:"#ff9090",textAlign:"center",
                background:"rgba(255,80,80,0.08)",borderRadius:8,padding:"8px"}}>
                {err}
              </div>
            )}
            <button onClick={login}
              style={{padding:"12px",borderRadius:12,border:"none",cursor:"pointer",
                background:"linear-gradient(135deg,#7c6aff,#ec4899)",
                color:"#fff",fontSize:14,fontWeight:700}}>
              로그인하기
            </button>
          </div>
        )}

        {tab==="register"&&step==="form"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input placeholder="닉네임 (2자 이상)" value={form.nick} style={fs}
              onChange={e=>setForm({...form,nick:e.target.value})}/>
            <input placeholder="이메일" type="email" value={form.email} style={fs}
              onChange={e=>setForm({...form,email:e.target.value})}/>
            <input placeholder="비밀번호 (8자 이상)" type="password" value={form.pw} style={fs}
              onChange={e=>setForm({...form,pw:e.target.value})}/>
            <input placeholder="비밀번호 확인" type="password" value={form.pw2} style={fs}
              onChange={e=>setForm({...form,pw2:e.target.value})}/>
            {err&&(
              <div style={{fontSize:12,color:"#ff9090",textAlign:"center",
                background:"rgba(255,80,80,0.08)",borderRadius:8,padding:"8px"}}>
                {err}
              </div>
            )}
            <button onClick={sendCode}
              style={{padding:"12px",borderRadius:12,border:"none",cursor:"pointer",
                background:"linear-gradient(135deg,#7c6aff,#ec4899)",
                color:"#fff",fontSize:14,fontWeight:700}}>
              이메일 인증코드 발송
            </button>
          </div>
        )}

        {tab==="register"&&step==="verify"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{textAlign:"center",padding:"12px",
              background:"rgba(124,106,255,0.08)",borderRadius:12,
              color:C.purpleL,fontSize:13,fontWeight:700}}>
              {form.email} 로 코드 발송됨
            </div>
            <div>
              <input placeholder="6자리 인증코드" value={inputCode} maxLength={6}
                style={{...fs,textAlign:"center",fontSize:20,letterSpacing:6}}
                onChange={e=>setInputCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                onKeyDown={e=>e.key==="Enter"&&verify()}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                <span style={{fontSize:11,color:codeTimer<30?"#ff9090":C.muted}}>
                  {codeTimer>0?"남은시간 "+fmtTime(codeTimer):"시간 만료"}
                </span>
                <button onClick={sendCode}
                  style={{fontSize:11,color:C.purpleL,background:"none",
                    border:"none",cursor:"pointer"}}>
                  재발송
                </button>
              </div>
            </div>
            {err&&(
              <div style={{fontSize:12,color:"#ff9090",textAlign:"center",
                background:"rgba(255,80,80,0.08)",borderRadius:8,padding:"8px"}}>
                {err}
              </div>
            )}
            <button onClick={verify}
              style={{padding:"12px",borderRadius:12,border:"none",cursor:"pointer",
                background:inputCode.length===6
                  ?"linear-gradient(135deg,#7c6aff,#ec4899)"
                  :"rgba(255,255,255,0.08)",
                color:inputCode.length===6?"#fff":C.muted,
                fontSize:14,fontWeight:700}}>
              인증 완료 및 가입
            </button>
            <button onClick={()=>{setStep("form");setErr("");}}
              style={{padding:"8px",borderRadius:10,cursor:"pointer",
                border:"1px solid rgba(255,255,255,0.1)",
                background:"transparent",color:C.muted,fontSize:12}}>
              이전으로
            </button>
          </div>
        )}

        <div style={{marginTop:18,fontSize:11,color:C.muted,textAlign:"center"}}>
          회원 혜택: AI 생성기 20회 무료 + 포인트 적립
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   AdminPage
════════════════════════════════════════════════════════════ */
const ADMIN_PW="nper2025admin";
function AdminPage({user}){
  const [pw,setPw]=useState("");
  const [auth,setAuth]=useState(false);
  const [tab,setTab]=useState("posts");
  const [posts,setPosts2]=useState(getPosts());

  const deletePost=(id)=>{
    const updated=getPosts().filter(p=>p.id!==id);
    setPosts(updated);setPosts2(updated);
  };
  const grantPoints=(email,pts)=>{
    const ms=getMembers();
    const updated=ms.map(m=>m.email===email?{...m,points:(m.points||0)+pts}:m);
    saveMembers(updated);
    alert(email+"에게 "+pts+" 포인트 지급했습니다.");
  };

  if(!auth){
    return(
      <div style={{maxWidth:400,margin:"80px auto",padding:"0 24px"}}>
        <div style={{background:C.card,border:"1px solid "+C.border,
          borderRadius:20,padding:"36px 32px"}}>
          <h2 style={{color:C.text,fontSize:20,fontWeight:900,marginBottom:20}}>
            관리자 로그인
          </h2>
          <Inp type="password" placeholder="관리자 비밀번호" value={pw}
            onChange={e=>setPw(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&pw===ADMIN_PW)setAuth(true);}}
            style={{marginBottom:12}}/>
          <Btn onClick={()=>{if(pw===ADMIN_PW)setAuth(true);}} full>확인</Btn>
        </div>
      </div>
    );
  }

  const mems=getMembers();

  return(
    <div style={{maxWidth:1000,margin:"0 auto",padding:"40px 24px"}}>
      <h2 style={{color:C.text,fontSize:22,fontWeight:900,marginBottom:24}}>
        관리자 페이지
      </h2>
      <div style={{display:"flex",gap:4,marginBottom:24,
        background:"rgba(255,255,255,0.05)",borderRadius:12,padding:4,width:"fit-content"}}>
        {[["posts","게시글 관리"],["members","회원 관리"],["ai","AI 사용 현황"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:"8px 18px",borderRadius:9,border:"none",cursor:"pointer",
              fontSize:13,fontWeight:700,
              background:tab===t?"rgba(124,106,255,0.35)":"transparent",
              color:tab===t?C.text:C.muted}}>
            {l}
          </button>
        ))}
      </div>

      {tab==="posts"&&(
        <div>
          <div style={{fontSize:13,color:C.muted,marginBottom:12}}>
            총 {posts.length}개의 게시글
          </div>
          {posts.map(p=>(
            <div key={p.id} style={{background:C.card,border:"1px solid "+C.border,
              borderRadius:12,padding:"14px 18px",marginBottom:8,
              display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,color:C.text,fontWeight:600,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {p.title}
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:3}}>
                  {p.nick} · {p.date}
                </div>
              </div>
              <button onClick={()=>deletePost(p.id)}
                style={{padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",
                  background:"rgba(255,80,80,0.15)",color:"#ff8080",
                  fontSize:12,flexShrink:0}}>
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {tab==="members"&&(
        <div>
          <div style={{fontSize:13,color:C.muted,marginBottom:12}}>
            총 {mems.length}명
          </div>
          {mems.map(m=>(
            <div key={m.id} style={{background:C.card,border:"1px solid "+C.border,
              borderRadius:12,padding:"14px 18px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:13,color:C.text,fontWeight:600}}>{m.nick}</div>
                  <div style={{fontSize:11,color:C.muted}}>{m.email} · {m.points||0}P</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {[50,100,500].map(pts=>(
                    <button key={pts} onClick={()=>grantPoints(m.email,pts)}
                      style={{padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",
                        border:"1px solid rgba(124,106,255,0.3)",
                        background:"rgba(124,106,255,0.1)",color:C.purpleL}}>
                      +{pts}P
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="ai"&&(
        <div style={{background:C.card,border:"1px solid "+C.border,
          borderRadius:14,padding:"20px 24px"}}>
          <div style={{fontSize:14,color:C.text,fontWeight:700,marginBottom:12}}>
            AI 사용 정책
          </div>
          {[
            {label:"비회원 무료 횟수",value:FREE_GUEST+"회"},
            {label:"회원 무료 횟수",value:FREE_MEMBER+"회"},
            {label:"포인트 사용",value:"10P = 1회"},
            {label:"포인트 적립 (글쓰기)",value:"1회당 10P"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",
              padding:"10px 0",borderBottom:"1px solid "+C.border}}>
              <span style={{fontSize:13,color:C.muted}}>{r.label}</span>
              <span style={{fontSize:13,color:C.purpleL,fontWeight:700}}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HomePage({navigate}){
  return(
    <div>
      {/* 히어로 */}
      <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        padding:"110px 24px 80px",textAlign:"center",
        position:"relative",overflow:"hidden"}}>
        <Glow top="50%" left="50%" size={800} color="rgba(124,106,255,0.09)"/>
        <Glow top="70%" left="20%" size={400} color="rgba(236,72,153,0.06)"/>
        <div style={{position:"relative",zIndex:1,maxWidth:800}}>
          <Badge>✦ AI 기반 SNS 성장 파트너 엔퍼콘텐츠랩</Badge>
          <h1 className="hero-h1" style={{fontSize:"clamp(30px,5.5vw,68px)",fontWeight:900,lineHeight:1.1,
            letterSpacing:-2,color:C.text,margin:"0 0 28px"}}>
            SNS 하나로 
            <span style={{background:"linear-gradient(135deg,#7c6aff,#ec4899)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              개인의 브랜드와 비즈니스
            </span>를 성장시키는 방법
          </h1>
          <p style={{fontSize:"clamp(15px,1.8vw,19px)",color:C.muted,lineHeight:1.85,
            maxWidth:580,margin:"0 auto 16px"}}>
            엔퍼는 개인과 전문가의 SNS 계정을 분석하고
            콘텐츠 전략부터 운영 구조까지 함께 설계합니다.
          </p>
          <p style={{fontSize:14,color:C.purpleL,fontWeight:600,marginBottom:44}}>
            개인의 SNS 성장을 돕는 실전 교육과 계정 운영 전략 
            <span style={{color:"#ec4899"}}>AI로 더 빠르게</span>
          </p>
          <div className="cta-row" style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn onClick={()=>navigate("cardnews")}>🃏 AI 카드뉴스 바로 만들기</Btn>
            <Btn onClick={()=>navigate("contact")} ghost>SNS 성장 상담 신청</Btn>
          </div>
          <div className="stat-row" style={{display:"flex",gap:32,justifyContent:"center",marginTop:60,flexWrap:"wrap"}}>
            {[["10년+","SNS 운영 경험"],["AI 자동화","콘텐츠 제작"],["주 1회","전략 미팅"]].map(([v,l])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:"clamp(18px,2.5vw,26px)",fontWeight:900,
                  background:"linear-gradient(135deg,#a89bff,#ec4899)",
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{v}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{position:"absolute",bottom:36,left:"50%",transform:"translateX(-50%)",
          display:"flex",flexDirection:"column",alignItems:"center",gap:6,
          color:C.muted,fontSize:10,opacity:0.5}}>
          <div style={{width:1,height:36,background:"linear-gradient(to bottom,transparent,rgba(124,106,255,0.6))"}}/>
          SCROLL
        </div>
      </section>

      {/* 문제 공감 */}
      <SecWrap bg={C.bg2}>
        <SecTitle badge="Pain Point" title={"SNS를 시작했지만\n이런 고민이 있으신가요?"}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(260px,100%),1fr))",gap:12,marginBottom:44}}>
          {[
            {icon:"📉",text:"열심히 올리는데 조회수가 나오지 않는다"},
            {icon:"🤔",text:"어떤 콘텐츠를 올려야 할지 모르겠다"},
            {icon:"🗺️",text:"인스타, 블로그, 유튜브 방향이 잡히지 않는다"},
            {icon:"💰",text:"SNS를 통해 실제 매출로 연결하고 싶다"},
            {icon:"😓",text:"혼자 운영하다 보니 지속하기 어렵다"},
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:16,
              background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"18px 20px"}}>
              <span style={{fontSize:26,flexShrink:0}}>{item.icon}</span>
              <span style={{fontSize:14,color:C.muted,lineHeight:1.7}}>{item.text}</span>
            </div>
          ))}
        </div>
        <div style={{background:"linear-gradient(135deg,rgba(124,106,255,0.1),rgba(236,72,153,0.07))",
          border:"1px solid rgba(124,106,255,0.2)",borderRadius:18,padding:"32px",textAlign:"center"}}>
          <p style={{fontSize:"clamp(14px,1.7vw,18px)",color:C.text,lineHeight:1.85,fontWeight:600,margin:0}}>
            SNS는 단순히 글을 올리는 것이 아니라
            <span style={{color:C.purpleL}}>전략과 구조가 필요한 마케팅 채널</span>입니다.
          </p>
        </div>
      </SecWrap>

      {/* 해결 방법 */}
      <SecWrap>
        <SecTitle badge="Solution" title="엔퍼는 이렇게 SNS 성장을 돕습니다"
          sub="단순 계정 관리가 아닌 AI를 활용해 콘텐츠 전략과 유입 구조를 설계합니다."/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:16}}>
          {[
            {icon:"🔍",num:"01",title:"SNS 계정 분석",desc:"현재 계정 상태와 콘텐츠 방향을 AI로 정밀 진단합니다."},
            {icon:"📐",num:"02",title:"콘텐츠 전략 설계",desc:"AI 데이터 기반으로 조회수가 나오는 콘텐츠 구조를 만듭니다."},
            {icon:"⚙️",num:"03",title:"SNS 운영 시스템",desc:"블로그, 인스타, 유튜브 채널 역할과 연결 구조를 정리합니다."},
            {icon:"📅",num:"04",title:"주 1회 전략 미팅",desc:"AI 리포트로 문제를 분석하고 개선 방향을 함께 잡습니다."},
          ].map((s,i)=>(
            <div key={i} style={{background:C.card,border:"1px solid "+C.border,
              borderRadius:18,padding:"28px 22px",position:"relative",overflow:"hidden",
              transition:"border-color 0.2s,transform 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,106,255,0.35)";e.currentTarget.style.transform="translateY(-3px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="";}}>
              <div style={{position:"absolute",top:14,right:18,fontSize:12,fontWeight:900,
                color:C.purple,opacity:0.2,fontFamily:"monospace"}}>{s.num}</div>
              <div style={{fontSize:32,marginBottom:16}}>{s.icon}</div>
              <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.75}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </SecWrap>

      {/* 서비스 소개 */}
      <SecWrap bg={C.bg2}>
        <SecTitle badge="Services" title="엔퍼 서비스"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
          {[
            {icon:"🎓",tag:"교육",title:"강사 육성 & 강의 사이트",
              desc:"강의 사이트를 통한 강사 육성 및 고객 연결. SNS 마케팅을 처음 시작하는 분들을 위한 기초부터 실전 강의를 제공합니다."},
            {icon:"📢",tag:"홍보",title:"SNS 콘텐츠 홍보 지원",
              desc:"SNS 콘텐츠 업로드를 통한 홍보 지원. AI 도구를 활용해 인스타, 블로그, 유튜브 채널을 효율적으로 운영합니다."},
            {icon:"🛠️",tag:"도구",title:"프로그램 & 자료 제공",
              desc:"SNS 콘텐츠 작업에 필요한 프로그램과 자료를 제공합니다. AI 생성기를 통해 카드뉴스, 썸네일을 빠르게 제작하세요."},
            {icon:"✍️",tag:"대행",title:"관리 대행",
              desc:"블로그, 유튜브, 인스타 콘텐츠 제작과 운영 대행. AI로 속도와 품질을 높여 효율적으로 관리합니다."},
          ].map((s,i)=>(
            <div key={i} style={{background:C.card,border:"1px solid "+C.border,
              borderRadius:18,padding:"28px 22px",display:"flex",flexDirection:"column",gap:12,
              transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(124,106,255,0.35)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:32}}>{s.icon}</span>
                <span style={{fontSize:10,fontWeight:700,background:"rgba(124,106,255,0.15)",
                  color:C.purpleL,padding:"3px 10px",borderRadius:99}}>{s.tag}</span>
              </div>
              <div style={{fontSize:15,fontWeight:700,color:C.text}}>{s.title}</div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.75,flex:1}}>{s.desc}</div>
              <button onClick={()=>navigate("contact")}
                style={{padding:"8px 0",borderRadius:9,border:"1px solid rgba(124,106,255,0.25)",
                  background:"transparent",color:C.purpleL,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                문의하기 
              </button>
            </div>
          ))}
        </div>
      </SecWrap>

      {/* 차별점 */}
      <SecWrap>
        <SecTitle badge="Why Nper" title="왜 많은 사람들이 엔퍼를 선택할까요"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(300px,100%),1fr))",gap:12}}>
          {[
            {icon:"🏆",title:"10년 SNS 운영 경험",desc:"다양한 계정 운영 경험을 기반으로 AI가 분석한 전략을 제시합니다."},
            {icon:"📊",title:"실전 데이터 기반 전략",desc:"실제 계정 운영 데이터와 AI 분석 리포트로 컨설팅합니다."},
            {icon:"🔄",title:"주 1회 전략 미팅",desc:"AI 리포트로 지속적으로 계정을 점검하고 개선합니다."},
            {icon:"💵",title:"SNS 비즈니스 연결",desc:"단순 조회수가 아닌 AI 콘텐츠 자동화로 매출 구조를 만듭니다."},
          ].map((d,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:20,
              background:C.card,border:"1px solid "+C.border,borderRadius:16,
              padding:"22px 24px",transition:"border-color 0.2s,transform 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,106,255,0.3)";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="";}}>
              <div style={{width:52,height:52,borderRadius:14,flexShrink:0,
                background:"linear-gradient(135deg,rgba(124,106,255,0.18),rgba(236,72,153,0.1))",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{d.icon}</div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:5}}>{d.title}</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </SecWrap>

      {/* 성장 사례 */}
      <SecWrap bg={C.bg2}>
        <SecTitle badge="Results" title="SNS 성장 사례"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(260px,100%),1fr))",gap:16}}>
          {[
            {emoji:"📱",platform:"SNS 계정 운영",big:"조회수 10배",small:"시작 3개월 만에",
              desc:"계정 분석 후 방향을 수정하고 AI로 카드뉴스를 제작해 3개월 만에 조회수가 10배 상승했어요."},
            {emoji:"📝",platform:"블로그 운영",big:"방문자 6배",small:"월 5천  3만",
              desc:"AI 키워드 분석과 초안 자동 작성으로 발행 속도를 높이고 월 방문자가 6배 증가했어요."},
            {emoji:"🎥",platform:"유튜브 채널",big:"구독자 꾸준히 성장",small:"콘텐츠 방향 수정 후",
              desc:"AI로 썸네일 기획과 스크립트를 작성하고 콘텐츠 방향을 바꾼 후 구독자가 꾸준히 늘고 있어요."},
          ].map((c,i)=>(
            <div key={i} style={{background:C.card,border:"1px solid "+C.border,
              borderRadius:18,padding:"28px 24px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:36}}>{c.emoji}</div>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>{c.platform}</div>
              <div>
                <div style={{fontSize:"clamp(22px,3vw,32px)",fontWeight:900,lineHeight:1.1,
                  background:"linear-gradient(135deg,#7c6aff,#ec4899)",
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{c.big}</div>
                <div style={{fontSize:12,color:C.purpleL,fontWeight:600,marginTop:5}}>{c.small}</div>
              </div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.75}}>{c.desc}</div>
            </div>
          ))}
        </div>
      </SecWrap>

      {/* CTA */}
      <section style={{padding:"130px 24px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <Glow top="50%" left="50%" size={700} color="rgba(124,106,255,0.11)"/>
        <div style={{position:"relative",zIndex:1,maxWidth:660,margin:"0 auto"}}>
          <Badge>✦ 지금 시작하세요</Badge>
          <h2 style={{fontSize:"clamp(28px,5vw,58px)",fontWeight:900,color:C.text,
            letterSpacing:-2,lineHeight:1.15,margin:"0 0 24px"}}>
            SNS 성장을 시작해보세요
          </h2>
          <p style={{fontSize:"clamp(14px,1.6vw,17px)",color:C.muted,lineHeight:1.9,marginBottom:44}}>
            SNS는 방향만 잡혀도 성장 속도가 완전히 달라집니다.
            지금 엔퍼와 함께 
            <span style={{color:C.purpleL,fontWeight:700}}>AI로 더 빠르게</span> 
            계정의 성장 전략을 만들어보세요.
          </p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn onClick={()=>navigate("contact")}>무료 상담 신청</Btn>
            <Btn onClick={()=>navigate("cardnews")} ghost>🃏 AI 카드뉴스 만들기</Btn>
          </div>
        </div>
      </section>
    </div>
  );
}

function AboutPage({navigate}){
  return(
    <div>
    <div style={{maxWidth:820,margin:"0 auto",padding:"48px 24px"}}>
      <Badge>✦ About</Badge>
      <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:900,color:C.text,
        letterSpacing:-1,margin:"0 0 32px"}}>엔퍼(NPER) 소개</h2>

      {/* 소개글 */}
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:20,
        padding:"36px 32px",marginBottom:40,lineHeight:2,fontSize:15,color:C.muted}}>
        <p style={{marginBottom:16}}>
          안녕하세요. SNS의 실행을 도와드리는 <span style={{color:C.text,fontWeight:700}}>엔퍼(NPER)</span>입니다.
        </p>
        <p style={{marginBottom:16}}>
          많은 분들이 SNS가 중요하다는 것은 알고 있지만, 막상 어떻게 시작해야 할지 몰라서 고민하는 경우가 많습니다.
          계정을 만들어도 어떤 콘텐츠를 올려야 하는지, 어떤 방향으로 운영해야 하는지,
          그리고 꾸준히 실행하는 방법까지 혼자 해결하기는 쉽지 않습니다.
        </p>
        <p style={{marginBottom:16}}>
          엔퍼는 바로 그 
          <span style={{color:C.purpleL,fontWeight:700}}>"실행의 과정"</span>을 함께 만들어가는 팀입니다.
          단순히 이론만 전달하는 교육이 아니라, 실제 비즈니스에 도움이 되는 SNS 운영 전략을
          함께 설계하고 실행까지 이어지도록 돕는 것을 목표로 하고 있습니다.
        </p>
        <p style={{marginBottom:16}}>
          계정의 현재 상태를 분석하고, 업종과 브랜드에 맞는 콘텐츠 방향을 설정하며,
          블로그·유튜브·인스타그램 등 다양한 채널을 활용해 브랜드가 성장할 수 있는 SNS 구조를 만들어드립니다.
          또한 정기적인 미팅과 피드백을 통해 운영 과정에서 발생하는 문제를 함께 점검하고,
          더 나은 방향으로 개선해 나갑니다.
        </p>
        <p style={{marginBottom:16}}>
          엔퍼는 단순한 계정 관리 서비스가 아니라 
          <span style={{color:C.text,fontWeight:700}}>브랜드의 SNS 성장을 함께 만들어가는 파트너</span>가 되고자 합니다.
        </p>
        <p style={{marginBottom:0}}>
          SNS를 시작하고 싶지만 방법을 모르시는 분, 이미 운영 중이지만 방향이 고민되는 분,
          그리고 비즈니스 성장을 위해 SNS를 제대로 활용하고 싶은 분들과 함께하고 있습니다.
          <span style={{color:C.purpleL,fontWeight:700}}>SNS의 시작부터 성장까지, 실행을 함께하는 곳. 엔퍼가 도와드리겠습니다.</span>
        </p>
      </div>

      {/* 지원 서비스 */}
      <h3 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:20}}>엔퍼가 지원하는 서비스</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:40}}>
        {[
          {icon:"🎓",title:"강의 사이트 운영",desc:"강사 육성 및 고객 연결을 위한 강의 플랫폼 운영"},
          {icon:"📢",title:"SNS 홍보 지원",desc:"콘텐츠 업로드를 통한 체계적인 SNS 홍보 지원"},
          {icon:"🛠️",title:"프로그램 & 자료 제공",desc:"SNS 콘텐츠 작업에 필요한 AI 프로그램과 자료 제공"},
          {icon:"✍️",title:"관리 대행",desc:"블로그, 유튜브, 인스타그램 콘텐츠 제작 및 운영 대행"},
        ].map((s,i)=>(
          <div key={i} style={{background:C.card,border:"1px solid "+C.border,
            borderRadius:16,padding:"22px 20px"}}>
            <div style={{fontSize:28,marginBottom:10}}>{s.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>{s.title}</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div style={{background:"linear-gradient(135deg,rgba(124,106,255,0.1),rgba(236,72,153,0.07))",
        border:"1px solid rgba(124,106,255,0.2)",borderRadius:20,padding:"28px 32px",textAlign:"center"}}>
        <p style={{fontSize:15,color:C.muted,lineHeight:1.8,margin:"0 0 18px"}}>
          AI 카드뉴스 생성기를 지금 바로 무료로 사용해보세요
        </p>
        <Btn onClick={()=>navigate("cardnews")}>🃏 카드뉴스 생성기 바로가기</Btn>
      </div>
    </div>
    </div>
  );
}

function AiPage({user,setUser:setUserState,navigate}){
  const info=getAiLeft(user);
  const usedFree=user?Math.min(info.used,FREE_MEMBER):Math.min(info.used,FREE_GUEST);
  const freeLimit=user?FREE_MEMBER:FREE_GUEST;
  const usageColor=info.used<=freeLimit?C.purpleL:"#ff9090";
  return(
    <div>
      <div style={{background:C.bg2,borderBottom:"1px solid "+C.border,
        padding:"12px 24px",display:"flex",alignItems:"center",
        justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{fontSize:13,color:C.muted}}>🤖 AI 생성기 사용 현황</div>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>
            {user?"회원":"비회원"} 무료 
            <span style={{color:usageColor}}>{usedFree}/{freeLimit}</span>회 사용
          </div>
          {user&&<div style={{fontSize:13,color:C.purpleL,fontWeight:700}}>
            💎 포인트: {user.points||0}P (10P = 1회 추가)
          </div>}
        </div>
        {!user&&(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:C.muted}}>회원가입 시 +20회 추가</span>
            <Btn onClick={()=>navigate("auth")} small>로그인 / 회원가입</Btn>
          </div>
        )}
        {user&&info.used>=FREE_MEMBER&&(user.points||0)<10&&(
          <div style={{fontSize:12,color:"#ff9090"}}>
            무료 횟수 소진 · 포인트 부족 · 글쓰기로 포인트 적립해보세요
          </div>
        )}
      </div>
      <CardNewsApp user={user}/>
    </div>
  );
}

function PricingPage({navigate}){
  var plans = [
    {
      name:"Free",
      price:"무료",
      sub:"영구 무료",
      color:"rgba(255,255,255,0.08)",
      border:"rgba(255,255,255,0.12)",
      badge:null,
      features:[
        "카드뉴스 생성 월 20회",
        "기본 디자인 5종",
        "PNG 다운로드",
        "워터마크 없음",
      ],
      cta:"무료로 시작",
      ctaStyle:{background:"rgba(255,255,255,0.1)",color:"#f0eeff"},
      action: function(){}
    },
    {
      name:"스타터",
      price:"4,900원",
      sub:"/ 월",
      color:"rgba(124,106,255,0.08)",
      border:"rgba(124,106,255,0.4)",
      badge:null,
      features:[
        "카드뉴스 생성 월 100회",
        "모든 디자인 프리셋",
        "PNG + 고화질 다운로드",
        "기획 AI 무제한 사용",
        "보관함 최대 50개",
      ],
      cta:"스타터 시작하기",
      ctaStyle:{background:"rgba(124,106,255,0.3)",color:"#f0eeff"},
      action: function(){}
    },
    {
      name:"프로",
      price:"9,900원",
      sub:"/ 월",
      color:"linear-gradient(135deg,rgba(124,106,255,0.15),rgba(236,72,153,0.10))",
      border:"rgba(124,106,255,0.7)",
      badge:"인기",
      features:[
        "카드뉴스 생성 월 300회",
        "모든 디자인 프리셋",
        "PNG + 고화질 다운로드",
        "기획 AI 무제한 사용",
        "보관함 무제한",
        "우선 생성 (빠른 처리)",
        "신규 기능 우선 제공",
      ],
      cta:"프로 시작하기",
      ctaStyle:{background:"linear-gradient(135deg,#7c6aff,#ec4899)",color:"#fff"},
      action: function(){}
    },
    {
      name:"비즈니스",
      price:"19,900원",
      sub:"/ 월",
      color:"rgba(255,255,255,0.05)",
      border:"rgba(255,200,80,0.5)",
      badge:"팀용",
      features:[
        "카드뉴스 생성 무제한",
        "모든 디자인 프리셋",
        "PNG + 고화질 다운로드",
        "기획 AI 무제한 사용",
        "보관함 무제한",
        "우선 생성 (빠른 처리)",
        "신규 기능 우선 제공",
        "팀 공유 기능 (출시 예정)",
        "전용 고객 지원",
      ],
      cta:"비즈니스 문의하기",
      ctaStyle:{background:"rgba(255,200,80,0.2)",color:"#ffc850"},
      action: function(){}
    },
  ];
  return(
    <div style={{minHeight:"100vh",paddingTop:80,paddingBottom:80}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px"}}>

        {/* 헤더 */}
        <div style={{textAlign:"center",marginBottom:60}}>
          <div style={{display:"inline-block",background:"rgba(124,106,255,0.15)",
            border:"1px solid rgba(124,106,255,0.3)",borderRadius:20,
            padding:"4px 16px",fontSize:12,color:"#a5b4fc",marginBottom:16,letterSpacing:1}}>
            PRICING
          </div>
          <h1 style={{fontSize:"clamp(28px,5vw,48px)",fontWeight:900,
            background:"linear-gradient(135deg,#f0eeff,#a5b4fc)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            marginBottom:16,letterSpacing:-1}}>
            합리적인 가격으로<br/>AI 콘텐츠를 만들어보세요
          </h1>
          <p style={{color:"rgba(240,238,255,0.5)",fontSize:16,lineHeight:1.6}}>
            무료로 시작하고, 필요할 때 업그레이드하세요.<br/>
            언제든지 취소 가능합니다.
          </p>
        </div>

        {/* 플랜 카드 */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",
          gap:20,marginBottom:60}}>
          {plans.map(function(plan,i){
            return(
              <div key={i} style={{position:"relative",borderRadius:20,
                border:"1px solid "+plan.border,
                background:plan.color,
                padding:"32px 28px",
                boxShadow:plan.badge==="인기"?"0 0 40px rgba(124,106,255,0.2)":"none",
                transition:"transform 0.2s"}}
                onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-4px)"}}
                onMouseLeave={function(e){e.currentTarget.style.transform="translateY(0)"}}>

                {plan.badge&&(
                  <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",
                    background:plan.badge==="인기"?"linear-gradient(135deg,#7c6aff,#ec4899)":"rgba(255,200,80,0.9)",
                    color:"#fff",fontSize:11,fontWeight:800,padding:"3px 14px",
                    borderRadius:20,letterSpacing:1,whiteSpace:"nowrap"}}>
                    {plan.badge==="인기"?"✨ 인기":"👥 팀용"}
                  </div>
                )}

                <div style={{marginBottom:8,fontSize:13,fontWeight:700,
                  color:"rgba(240,238,255,0.5)",letterSpacing:1}}>
                  {plan.name.toUpperCase()}
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:4}}>
                  <span style={{fontSize:32,fontWeight:900,color:"#f0eeff"}}>
                    {plan.price}
                  </span>
                  <span style={{fontSize:13,color:"rgba(240,238,255,0.4)"}}>
                    {plan.sub}
                  </span>
                </div>

                <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",
                  margin:"20px 0",paddingTop:20}}>
                  {plan.features.map(function(f,j){
                    return(
                      <div key={j} style={{display:"flex",alignItems:"center",gap:8,
                        marginBottom:10,fontSize:13,color:"rgba(240,238,255,0.75)"}}>
                        <span style={{color:"#7c6aff",fontSize:14,flexShrink:0}}>✓</span>
                        {f}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={function(){
                    if(plan.name==="비즈니스"){ navigate("contact"); }
                    else { navigate("cardnews"); }
                  }}
                  style={{width:"100%",padding:"12px",borderRadius:12,border:"none",
                    cursor:"pointer",fontSize:14,fontWeight:700,
                    transition:"opacity 0.15s",
                    background:plan.ctaStyle.background,
                    color:plan.ctaStyle.color}}
                  onMouseEnter={function(e){e.currentTarget.style.opacity="0.85"}}
                  onMouseLeave={function(e){e.currentTarget.style.opacity="1"}}>
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div style={{maxWidth:640,margin:"0 auto",textAlign:"center"}}>
          <h2 style={{fontSize:22,fontWeight:800,color:"#f0eeff",marginBottom:32}}>
            자주 묻는 질문
          </h2>
          {[
            {q:"무료 플랜은 언제까지 사용 가능한가요?",
             a:"영구 무료입니다. 월 20회 생성은 매월 초기화됩니다."},
            {q:"구독 취소는 어떻게 하나요?",
             a:"언제든지 마이페이지에서 취소할 수 있으며, 취소 후에도 남은 기간은 사용 가능합니다."},
            {q:"생성 횟수는 언제 초기화되나요?",
             a:"매월 1일 자정에 초기화됩니다."},
            {q:"결제는 어떤 방법을 지원하나요?",
             a:"카드 결제, 카카오페이, 네이버페이 등 다양한 결제 수단을 지원합니다. (준비 중)"},
          ].map(function(item,i){
            return(
              <div key={i} style={{textAlign:"left",background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,
                padding:"20px 24px",marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:"#f0eeff",marginBottom:8}}>
                  Q. {item.q}
                </div>
                <div style={{fontSize:13,color:"rgba(240,238,255,0.55)",lineHeight:1.6}}>
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 CTA */}
        <div style={{textAlign:"center",marginTop:60}}>
          <p style={{color:"rgba(240,238,255,0.4)",fontSize:14,marginBottom:16}}>
            궁금한 점이 있으신가요?
          </p>
          <button onClick={function(){navigate("contact");}}
            style={{background:"rgba(124,106,255,0.15)",border:"1px solid rgba(124,106,255,0.3)",
              color:"#a5b4fc",padding:"10px 24px",borderRadius:12,fontSize:14,
              fontWeight:700,cursor:"pointer"}}>
            문의하기 →
          </button>
        </div>
      </div>
    </div>
  );
}


function ContactPage(){
  const [form,setForm]=useState({name:"",email:"",msg:""});
  const [sent,setSent]=useState(false);
  return(
    <div>
    <div style={{maxWidth:600,margin:"0 auto",padding:"48px 24px"}}>
      <Badge>✦ Contact</Badge>
      <h2 style={{fontSize:"clamp(28px,4vw,40px)",fontWeight:900,color:C.text,
        letterSpacing:-1,margin:"0 0 14px"}}>문의하기</h2>
      <p style={{fontSize:14,color:C.muted,lineHeight:1.85,marginBottom:32}}>
        서비스 이용 문의, 제안 등 편하게 남겨주세요.
      </p>
      <div style={{display:"flex",gap:10,marginBottom:32,flexWrap:"wrap"}}>
        {[
          {label:"💬 카카오 단체방",url:"https://open.kakao.com/o/gIw9vTFg",bg:"#FEE500",tc:"#3A1D1D"},
          {label:"📸 인스타그램",url:"https://www.instagram.com/nperinsight/",bg:"linear-gradient(45deg,#f09433,#dc2743,#bc1888)",tc:"#fff"},
          {label:"▶ 유튜브",url:"https://www.youtube.com/@nperinsight/videos",bg:"#FF0000",tc:"#fff"},
        ].map(s=>(
          <button key={s.label} onClick={()=>window.open(s.url,"_blank")}
            style={{padding:"10px 18px",borderRadius:10,border:"none",cursor:"pointer",
              background:s.bg,color:s.tc,fontSize:12,fontWeight:700}}>{s.label}</button>
        ))}
      </div>
      {sent?(
        <div style={{textAlign:"center",padding:"52px",background:C.card,
          border:"1px solid "+C.border,borderRadius:20}}>
          <div style={{fontSize:44,marginBottom:16}}>✅</div>
          <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>문의가 접수됐어요!</div>
          <div style={{fontSize:14,color:C.muted,marginBottom:20}}>빠른 시간 내에 답변드릴게요.</div>
          <Btn onClick={()=>{setSent(false);setForm({name:"",email:"",msg:""});}}>새 문의 작성</Btn>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Inp placeholder="이름 / 닉네임" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Inp placeholder="이메일" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          <Textarea placeholder="문의 내용을 입력해주세요..." value={form.msg}
            onChange={e=>setForm({...form,msg:e.target.value})} rows={7}/>
          <Btn onClick={()=>{if(!form.name.trim()||!form.email.trim()||!form.msg.trim())return;setSent(true);}}>
            문의 보내기
          </Btn>
        </div>
      )}
    </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   RichBody — 게시글 본문 렌더러
════════════════════════════════════════════════════════════ */
function RichBody({body}){
  if(!body) return null;
  const lines = body.split('\n');
  return(
    <div style={{fontSize:14,color:C.text,lineHeight:1.85,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
      {lines.map((line,i)=>{
        // 유튜브 링크
        const ytMatch = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if(ytMatch) return(
          <div key={i} style={{margin:"12px 0",borderRadius:12,overflow:"hidden",maxWidth:560}}>
            <iframe
              src={"https://www.youtube.com/embed/"+ytMatch[1]}
              style={{width:"100%",height:315,border:"none"}}
              allowFullScreen title="youtube"/>
          </div>
        );
        // 이미지 URL
        if(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(line.trim())) return(
          <div key={i} style={{margin:"12px 0"}}>
            <img src={line.trim()} alt="" style={{maxWidth:"100%",borderRadius:10}}
              onError={e=>e.target.style.display="none"}/>
          </div>
        );
        // 일반 링크
        if(/^https?:\/\//i.test(line.trim())) return(
          <div key={i} style={{margin:"4px 0"}}>
            <a href={line.trim()} target="_blank" rel="noopener noreferrer"
              style={{color:C.purpleL,textDecoration:"underline",wordBreak:"break-all"}}>
              {line.trim()}
            </a>
          </div>
        );
        // 일반 텍스트
        return <span key={i}>{line}{i<lines.length-1&&'\n'}</span>;
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PostForm — 글쓰기 / 수정 폼
════════════════════════════════════════════════════════════ */
function PostForm({user,cat,initial,onSubmit,onCancel}){
  const [title,setTitle]=useState(initial?.title||"");
  const [body,setBody]=useState(initial?.body||"");

  const catLabel=CATS.find(c=>c.id===cat)?.label||cat;

  return(
    <div style={{maxWidth:700}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <h2 style={{fontSize:20,fontWeight:900,color:C.text}}>
          {initial?"글 수정":"글쓰기"} — {catLabel}
        </h2>
        <button onClick={onCancel}
          style={{background:"none",border:"1px solid "+C.border,color:C.muted,cursor:"pointer",
            fontSize:13,padding:"6px 12px",borderRadius:8}}>
          취소
        </button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>제목</div>
          <Inp
            placeholder="제목을 입력해주세요"
            value={title}
            onChange={e=>setTitle(e.target.value)}
            maxLength={100}/>
        </div>
        <div>
          <div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>내용</div>
          <Textarea
            placeholder="내용을 입력해주세요"
            value={body}
            onChange={e=>setBody(e.target.value)}
            rows={12}
            style={{minHeight:240}}/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onCancel}
            style={{padding:"10px 24px",borderRadius:10,border:"1px solid "+C.border,
              background:"transparent",color:C.muted,fontSize:14,cursor:"pointer",fontWeight:600}}>
            취소
          </button>
          <Btn onClick={()=>onSubmit({title,body})}>
            {initial?"수정 완료":"등록하기"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   BoardPage
════════════════════════════════════════════════════════════ */
function BoardPage({user}){
  const [cat,setCat]=useState("ai");
  const [posts,setPosts2]=useState(getPosts);
  const [view,setView]=useState(null);   // null=목록, post=상세
  const [editing,setEditing]=useState(null); // post=수정 중
  const [writing,setWriting]=useState(false);
  const [comment,setComment]=useState("");
  const [editComment,setEditComment]=useState(null); // {idx, text}

  const sync=(next)=>{setPosts(next);setPosts2(next);};
  const filtered=posts.filter(p=>p.cat===cat);
  const isOwner=p=>user&&(user.nick===p.nick||user.role==="admin");

  /* 글 등록 */
  const submitPost=(form)=>{
    if(!user){alert("글쓰기는 회원만 가능합니다.");return;}
    if(!form.title.trim()||!form.body.trim()){alert("제목과 내용을 입력해주세요.");return;}
    const newPost={id:Date.now(),cat,nick:user.nick,userId:user.id,
      title:form.title,body:form.body,
      date:new Date().toLocaleDateString("ko-KR"),comments:[]};
    const next=[newPost,...posts];
    sync(next);
    // 포인트 적립
    try{
      const mk="nper_members";
      const ms=JSON.parse(localStorage.getItem(mk)||"[]");
      sync(next);
      localStorage.setItem(mk,JSON.stringify(ms.map(m=>m.id===user.id?{...m,points:(m.points||0)+10}:m)));
    }catch{}
    setWriting(false);
    alert("글이 등록됐어요! 포인트 10P 적립 🎉");
  };

  /* 글 수정 */
  const submitEdit=(form)=>{
    if(!form.title.trim()||!form.body.trim()){alert("제목과 내용을 입력해주세요.");return;}
    const next=posts.map(p=>p.id===editing.id?{...p,title:form.title,body:form.body,edited:true}:p);
    sync(next);
    setView(next.find(p=>p.id===editing.id));
    setEditing(null);
  };

  /* 글 삭제 */
  const deletePost=(id)=>{
    if(!window.confirm("정말 삭제하시겠습니까?"))return;
    const next=posts.filter(p=>p.id!==id);
    sync(next);setView(null);
  };

  /* 댓글 등록 */
  const addComment=(postId)=>{
    if(!user){alert("댓글은 로그인 후 이용 가능합니다.");return;}
    if(!comment.trim())return;
    const next=posts.map(p=>p.id===postId?{...p,comments:[...p.comments,
      {id:Date.now(),nick:user.nick,userId:user.id,
       text:comment,date:new Date().toLocaleDateString("ko-KR")}]}:p);
    sync(next);setView(next.find(p=>p.id===postId));setComment("");
  };

  /* 댓글 수정 */
  const submitEditComment=(postId)=>{
    if(!editComment||!editComment.text.trim())return;
    const next=posts.map(p=>p.id===postId?{...p,comments:p.comments.map((c,i)=>
      i===editComment.idx?{...c,text:editComment.text,edited:true}:c)}:p);
    sync(next);setView(next.find(p=>p.id===postId));setEditComment(null);
  };

  /* 댓글 삭제 */
  const deleteComment=(postId,idx)=>{
    if(!window.confirm("댓글을 삭제하시겠습니까?"))return;
    const next=posts.map(p=>p.id===postId?{...p,comments:p.comments.filter((_,i)=>i!==idx)}:p);
    sync(next);setView(next.find(p=>p.id===postId));
  };

  const Sidebar=()=>(
    <aside style={{width:190,flexShrink:0,borderRight:"1px solid "+C.border,
      padding:"28px 0",background:C.bg2}}>
      {CATS.map(c=>(
        <button key={c.id} onClick={()=>{setCat(c.id);setView(null);setWriting(false);setEditing(null);}}
          style={{display:"flex",alignItems:"center",gap:10,width:"100%",
            padding:"12px 18px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
            background:cat===c.id?"rgba(124,106,255,0.18)":"transparent",
            color:cat===c.id?C.text:C.muted,
            borderLeft:cat===c.id?"3px solid #7c6aff":"3px solid transparent",
            textAlign:"left",transition:"all 0.15s"}}>
          {c.icon} {c.label}
        </button>
      ))}
    </aside>
  );

  /* 수정 화면 */
  if(editing)return(
    <div style={{display:"flex",minHeight:"calc(100vh - 64px)"}}>
      <Sidebar/>
      <div style={{flex:1,padding:"32px 28px",minWidth:0}}>
        <PostForm user={user} cat={cat} initial={editing}
          onSubmit={submitEdit} onCancel={()=>setEditing(null)}/>
      </div>
    </div>
  );

  /* 글쓰기 화면 */
  if(writing)return(
    <div style={{display:"flex",minHeight:"calc(100vh - 64px)"}}>
      <Sidebar/>
      <div style={{flex:1,padding:"32px 28px",minWidth:0}}>
        <PostForm user={user} cat={cat}
          onSubmit={submitPost} onCancel={()=>setWriting(false)}/>
      </div>
    </div>
  );

  /* 상세 보기 */
  if(view)return(
    <div style={{display:"flex",minHeight:"calc(100vh - 64px)"}}>
      <Sidebar/>
      <div style={{flex:1,padding:"36px 32px",minWidth:0,maxWidth:780}}>
        <button onClick={()=>setView(null)}
          style={{background:"none",border:"none",color:C.muted,cursor:"pointer",
            fontSize:13,marginBottom:20,padding:0}}>
          ← 목록으로
        </button>
        <div style={{background:C.card,border:"1px solid "+C.border,
          borderRadius:18,padding:"28px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",
            alignItems:"flex-start",marginBottom:12}}>
            <div style={{fontSize:11,color:C.muted}}>
              {view.nick} · {view.date}
              {view.edited&&<span style={{color:C.purpleL,marginLeft:6}}>(수정됨)</span>}
            </div>
            {isOwner(view)&&(
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setEditing(view)}
                  style={{padding:"4px 12px",borderRadius:7,border:"1px solid "+C.border,
                    background:"transparent",color:C.muted,fontSize:11,cursor:"pointer"}}>
                  수정
                </button>
                <button onClick={()=>deletePost(view.id)}
                  style={{padding:"4px 12px",borderRadius:7,
                    border:"1px solid rgba(255,80,80,0.3)",
                    background:"rgba(255,60,60,0.07)",color:"#ff9090",
                    fontSize:11,cursor:"pointer"}}>
                  삭제
                </button>
              </div>
            )}
          </div>
          <h2 style={{color:C.text,fontSize:20,fontWeight:800,margin:"0 0 20px"}}>
            {view.title}
          </h2>
          <RichBody body={view.body}/>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:10}}>
            댓글 {(view.comments||[]).length}개
          </div>
          {(view.comments||[]).map((c,i)=>(
            <div key={c.id||i} style={{background:C.card,border:"1px solid "+C.border,
              borderRadius:12,padding:"12px 16px",marginBottom:8}}>
              {editComment&&editComment.idx===i?(
                <div style={{display:"flex",gap:8}}>
                  <Inp value={editComment.text}
                    onChange={e=>setEditComment({...editComment,text:e.target.value})}
                    onKeyDown={e=>e.key==="Enter"&&submitEditComment(view.id)}
                    style={{flex:1}}/>
                  <button onClick={()=>submitEditComment(view.id)}
                    style={{padding:"6px 12px",borderRadius:8,border:"none",
                      background:C.purple,color:"#fff",fontSize:12,
                      cursor:"pointer",flexShrink:0}}>
                    저장
                  </button>
                  <button onClick={()=>setEditComment(null)}
                    style={{padding:"6px 12px",borderRadius:8,
                      border:"1px solid "+C.border,background:"transparent",
                      color:C.muted,fontSize:12,cursor:"pointer",flexShrink:0}}>
                    취소
                  </button>
                </div>
              ):(
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"flex-start"}}>
                  <div>
                    <span style={{color:C.purpleL,fontWeight:600,fontSize:13,marginRight:8}}>
                      {c.nick}
                    </span>
                    <span style={{fontSize:13,color:C.text,lineHeight:1.7}}>
                      {c.text}
                    </span>
                    {c.edited&&(
                      <span style={{fontSize:10,color:C.muted,marginLeft:6,opacity:0.6}}>
                        (수정됨)
                      </span>
                    )}
                    <div style={{fontSize:11,color:C.muted,opacity:0.5,marginTop:3}}>
                      {c.date}
                    </div>
                  </div>
                  {user&&(user.nick===c.nick||user.role==="admin")&&(
                    <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:12}}>
                      <button onClick={()=>setEditComment({idx:i,text:c.text})}
                        style={{padding:"3px 9px",borderRadius:6,
                          border:"1px solid "+C.border,background:"transparent",
                          color:C.muted,fontSize:10,cursor:"pointer"}}>
                        수정
                      </button>
                      <button onClick={()=>deleteComment(view.id,i)}
                        style={{padding:"3px 9px",borderRadius:6,
                          border:"1px solid rgba(255,80,80,0.25)",
                          background:"transparent",color:"#ff9090",
                          fontSize:10,cursor:"pointer"}}>
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {user?(
          <div style={{display:"flex",gap:8}}>
            <Inp placeholder="댓글을 입력해주세요..." value={comment}
              onChange={e=>setComment(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addComment(view.id)}
              style={{flex:1}}/>
            <button onClick={()=>addComment(view.id)}
              style={{padding:"10px 18px",borderRadius:10,border:"none",
                background:C.purple,color:"#fff",fontSize:13,fontWeight:700,
                cursor:"pointer",flexShrink:0}}>
              등록
            </button>
          </div>
        ):(
          <div style={{fontSize:13,color:C.muted,textAlign:"center",padding:"14px",
            background:C.card,borderRadius:10,border:"1px solid "+C.border}}>
            댓글은 로그인 후 이용 가능합니다
          </div>
        )}
      </div>
    </div>
  );

  /* 목록 */
  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"calc(100vh - 64px)"}}>
      <div style={{display:"flex",flex:1}}>
      <Sidebar/>
      <div style={{flex:1,padding:"32px 28px",minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <h2 style={{color:C.text,fontSize:20,fontWeight:900,margin:"0 0 4px"}}>
              {CATS.find(c=>c.id===cat)?.icon} {CATS.find(c=>c.id===cat)?.label}
            </h2>
            <div style={{fontSize:12,color:C.muted}}>총 {filtered.length}개의 글</div>
          </div>
          <Btn onClick={()=>{if(!user){alert("글쓰기는 로그인 후 이용 가능합니다.");}else setWriting(true);}} small>
            ✏️ 글쓰기{!user&&" (로그인 필요)"}
          </Btn>
        </div>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"80px 0",color:C.muted,fontSize:14}}>
            아직 게시글이 없어요. 첫 번째 글을 남겨보세요 ✍️
          </div>
        ):filtered.map(p=>(
          <div key={p.id}
            style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,
              padding:"16px 20px",marginBottom:8,
              display:"flex",justifyContent:"space-between",alignItems:"center",
              transition:"border-color 0.15s",cursor:"pointer"}}
            onClick={()=>setView(p)}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(124,106,255,0.4)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{minWidth:0,flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                {p.body&&/\.(jpg|jpeg|png|gif|webp)/i.test(p.body)&&
                  <span style={{fontSize:10,background:"rgba(99,200,130,0.15)",color:"#86efac",
                    padding:"2px 7px",borderRadius:99}}>🖼 이미지</span>}
                {p.body&&/(youtube\.com|youtu\.be|\.mp4|\.mov)/i.test(p.body)&&
                  <span style={{fontSize:10,background:"rgba(236,72,153,0.15)",color:"#f9a8d4",
                    padding:"2px 7px",borderRadius:99}}>📹 영상</span>}
                {p.body&&/^https?:\/\//m.test(p.body)&&
                  <span style={{fontSize:10,background:"rgba(124,106,255,0.15)",color:C.purpleL,
                    padding:"2px 7px",borderRadius:99}}>🔗 링크</span>}
                <span style={{fontSize:15,fontWeight:600,color:C.text,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</span>
                {p.edited&&<span style={{fontSize:10,color:C.muted,opacity:0.6}}>(수정됨)</span>}
              </div>
              <div style={{fontSize:11,color:C.muted}}>
                {p.nick} · {p.date} · 댓글 {p.comments.length}
              </div>
            </div>
            <div style={{fontSize:18,opacity:0.25,color:C.text,flexShrink:0,marginLeft:12}}>›</div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   App (메인)
════════════════════════════════════════════════════════════ */
export default function App(){
  const [page,setPage]=useState("home");
  const [user,setUserState]=useState(getUser);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const [showAuth,setShowAuth]=useState(false);
  const [aiSub,setAiSub]=useState(false);
  const [boardSub,setBoardSub]=useState(false);
  const aiSubRef=useRef(null);
  const boardSubRef=useRef(null);

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>10);
    window.addEventListener("scroll",fn);
    return()=>window.removeEventListener("scroll",fn);
  },[]);

  useEffect(()=>{
    const fn=e=>{
      if(aiSubRef.current&&!aiSubRef.current.contains(e.target))setAiSub(false);
      if(boardSubRef.current&&!boardSubRef.current.contains(e.target))setBoardSub(false);
    };
    document.addEventListener("mousedown",fn);
    return()=>document.removeEventListener("mousedown",fn);
  },[]);

  useEffect(()=>{
    const hash=window.location.hash.replace("#","")||"home";
    if(hash!=="home") setPage(hash);
  },[]);

  useEffect(()=>{
    const fn=()=>{
      const hash=window.location.hash.replace("#","")||"home";
      setPage(hash);setAiSub(false);setBoardSub(false);setMobileOpen(false);
      window.scrollTo(0,0);
    };
    window.addEventListener("popstate",fn);
    return()=>window.removeEventListener("popstate",fn);
  },[]);

  const navigate=target=>{
    window.history.pushState(null,"","#"+target);
    setPage(target);setAiSub(false);setBoardSub(false);setMobileOpen(false);
    window.scrollTo(0,0);
  };
  const handleAuth=u=>{setUser(u);setUserState(u);setShowAuth(false);};
  const logout=()=>{setUser(null);setUserState(null);navigate("home");};

  const isBoard=["ai","news","archive","qna"].includes(page);
  const isAi=page==="cardnews";

  /* 네비 버튼 */
  const NavBtn=({id,label,active})=>(
    <button onClick={()=>navigate(id)}
      style={{background:(active||page===id)?"rgba(124,106,255,0.15)":"transparent",
        border:"none",cursor:"pointer",padding:"6px 14px",borderRadius:8,fontSize:14,
        fontWeight:(active||page===id)?700:500,
        color:(active||page===id)?C.text:C.muted,transition:"all 0.15s"}}>
      {label}
    </button>
  );
  const DropBtn=({label,open,onClick,active})=>(
    <button onClick={onClick}
      style={{background:(active||open)?"rgba(124,106,255,0.15)":"transparent",
        border:"none",cursor:"pointer",padding:"6px 14px",borderRadius:8,fontSize:14,
        fontWeight:(active||open)?700:500,color:(active||open)?C.text:C.muted,
        display:"flex",alignItems:"center",gap:5,transition:"all 0.15s"}}>
      {label}
      <span style={{fontSize:10,opacity:0.6,display:"inline-block",
        transform:open?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}>
        ▼
      </span>
    </button>
  );
  const DropMenu=({children})=>(
    <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,zIndex:100,
      background:"rgba(14,11,28,0.98)",border:"1px solid "+C.border,
      borderRadius:13,padding:6,minWidth:180,
      boxShadow:"0 20px 52px rgba(0,0,0,0.6)",backdropFilter:"blur(24px)",
      animation:"fadeIn 0.15s ease"}}>
      {children}
    </div>
  );
  const DropItem=({id,icon,label})=>(
    <button onClick={()=>navigate(id)}
      style={{display:"flex",alignItems:"center",gap:10,width:"100%",
        padding:"10px 14px",borderRadius:9,border:"none",cursor:"pointer",
        background:page===id?"rgba(124,106,255,0.2)":"transparent",
        color:page===id?C.text:C.muted,fontSize:13,fontWeight:600,textAlign:"left",
        transition:"background 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.background="rgba(124,106,255,0.12)"}
      onMouseLeave={e=>e.currentTarget.style.background=page===id?"rgba(124,106,255,0.2)":"transparent"}>
      <span>{icon}</span>{label}
    </button>
  );

  const renderPage=()=>{
    if(page==="home")    return <HomePage navigate={navigate}/>;
    if(page==="about")   return <AboutPage navigate={navigate}/>;
    if(page==="cardnews")return <AiPage user={user} setUser={setUserState} navigate={navigate}/>;
    if(isBoard)          return <BoardPage user={user}/>;
    if(page==="pricing")  return <PricingPage navigate={navigate}/>;
    if(page==="contact") return <ContactPage/>;
    if(page==="admin")   return <AdminPage user={user}/>;
    return <HomePage navigate={navigate}/>;
  };

  const SNS=[
    {url:"https://open.kakao.com/o/gIw9vTFg",  label:"💬",bg:"#FEE500",tc:"#3A1D1D"},
    {url:"https://www.instagram.com/nperinsight/",label:"📸",bg:"linear-gradient(45deg,#f09433,#dc2743,#bc1888)",tc:"#fff"},
    {url:"https://www.youtube.com/@nperinsight/videos",label:"▶",bg:"#FF0000",tc:"#fff"},
  ];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,
      fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;min-height:100vh}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(124,106,255,0.3);border-radius:4px}
        input::placeholder,textarea::placeholder{color:rgba(240,238,255,0.25)}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;
          outline:none;background:rgba(255,255,255,0.15);width:100%}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;
          height:14px;border-radius:50%;background:#7c6aff;cursor:pointer}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .page-anim{animation:fadeIn 0.25s ease}
        textarea{resize:vertical}
        .desktop-nav{display:flex!important}
        .mobile-btn{display:none!important}
        .nav-right{display:flex!important}
        @media(max-width:768px){
          .desktop-nav{display:none!important}
          .mobile-btn{display:flex!important}
          .nav-right{display:none!important}
        }
        @media(max-width:640px){
          .hero-title{font-size:clamp(26px,8vw,42px)!important}
          .section-pad{padding:60px 16px!important}
          .cta-row{flex-direction:column!important}
          .cta-row button{width:100%!important}
          .stat-row{gap:20px!important}
          .grid-3{grid-template-columns:1fr!important}
          .grid-2{grid-template-columns:1fr!important}
        }
      `}</style>

      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onAuth={handleAuth}/>}

      {/* 네비게이션 */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,height:60,
        background:scrolled?C.nav:"transparent",
        borderBottom:scrolled?"1px solid "+C.border:"1px solid transparent",
        backdropFilter:scrolled?"blur(24px)":"none",
        transition:"all 0.3s",display:"flex",alignItems:"center",
        padding:"0 20px",gap:4}}>

        {/* 로고 */}
        <button onClick={()=>navigate("home")}
          style={{background:"none",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",gap:10,marginRight:16,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:11,
            background:"linear-gradient(135deg,#7c6aff,#ec4899)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:17,fontWeight:900,color:"#fff",
            boxShadow:"0 4px 14px rgba(124,106,255,0.4)"}}>
            N
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:C.text,
              letterSpacing:-0.5,lineHeight:1}}>
              엔퍼콘텐츠랩
            </div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>
              NPER CONTENTS LAB
            </div>
          </div>
        </button>

        {/* 데스크톱 메뉴 */}
        <div className="desktop-nav"
          style={{display:"flex",alignItems:"center",gap:2,flex:1}}>
          <NavBtn id="home" label="홈"/>
          <NavBtn id="about" label="소개"/>
          <div ref={aiSubRef} style={{position:"relative"}}>
            <button onClick={()=>navigate("cardnews")}
              style={{background:isAi?"rgba(124,106,255,0.15)":"transparent",
                border:"none",cursor:"pointer",padding:"6px 14px",borderRadius:8,fontSize:14,
                fontWeight:isAi?700:500,color:isAi?C.text:C.muted,transition:"all 0.15s"}}>
              🃏 AI 생성기
            </button>
          </div>
          <div ref={boardSubRef} style={{position:"relative"}}>
            <DropBtn label="커뮤니티" open={boardSub} active={isBoard}
              onClick={()=>setBoardSub(s=>!s)}/>
            {boardSub&&(
              <DropMenu>
                {CATS.map(c=>(
                  <DropItem key={c.id} id={c.id} icon={c.icon} label={c.label}/>
                ))}
              </DropMenu>
            )}
          </div>
          <NavBtn id="pricing" label="가격정책"/>
          <NavBtn id="contact" label="문의하기"/>
        </div>

        {/* 오른쪽: SNS + 로그인 (데스크톱만) */}
        <div className="nav-right"
          style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          {SNS.map((s,i)=>(
            <button key={i} onClick={()=>window.open(s.url,"_blank")}
              style={{width:28,height:28,borderRadius:7,border:"none",cursor:"pointer",
                background:s.bg,color:s.tc,fontSize:12,display:"flex",
                alignItems:"center",justifyContent:"center"}}>
              {s.label}
            </button>
          ))}
          <div style={{width:1,height:20,background:C.border,margin:"0 4px"}}/>
          {user?(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{fontSize:12,color:C.purpleL,fontWeight:700}}>
                {user.points||0}P
              </div>
              <div style={{fontSize:13,color:C.text,fontWeight:600}}>
                {user.nick}
              </div>
              <button onClick={logout}
                style={{padding:"5px 12px",borderRadius:8,cursor:"pointer",
                  border:"1px solid "+C.border,
                  background:"transparent",color:C.muted,fontSize:11}}>
                로그아웃
              </button>
              <button onClick={()=>navigate("admin")}
                style={{padding:"5px 12px",borderRadius:8,cursor:"pointer",
                  border:"1px solid rgba(124,106,255,0.3)",
                  background:"rgba(124,106,255,0.1)",color:C.purpleL,fontSize:11}}>
                관리자
              </button>
            </div>
          ):(
            <Btn onClick={()=>setShowAuth(true)} small>로그인</Btn>
          )}
        </div>

        {/* 햄버거 버튼 (모바일) */}
        <button className="mobile-btn" onClick={()=>setMobileOpen(s=>!s)}
          style={{background:"none",border:"none",cursor:"pointer",
            color:C.text,fontSize:24,padding:"4px 8px",marginLeft:"auto",lineHeight:1}}>
          {mobileOpen?"X":"="}
        </button>
      </div>

      {/* 모바일 메뉴 */}
      {mobileOpen&&(
        <div style={{position:"fixed",top:60,left:0,right:0,bottom:0,zIndex:999,
          background:"rgba(10,8,18,0.97)",backdropFilter:"blur(24px)",
          padding:"20px 20px 40px",animation:"fadeIn 0.2s ease",overflowY:"auto"}}>
          {[
            {id:"home",label:"홈"},
            {id:"about",label:"소개"},
            {id:"cardnews",label:"🃏 AI 카드뉴스 생성기"},
            ...CATS.map(c=>({id:c.id,label:c.icon+" "+c.label})),
            {id:"contact",label:"문의하기"},
          ].map(m=>(
            <button key={m.id} onClick={()=>navigate(m.id)}
              style={{display:"block",width:"100%",textAlign:"left",
                padding:"14px 16px",borderRadius:12,border:"none",cursor:"pointer",
                marginBottom:4,
                background:page===m.id?"rgba(124,106,255,0.2)":"rgba(255,255,255,0.04)",
                color:page===m.id?C.text:C.muted,fontSize:16,
                fontWeight:page===m.id?700:500,
                borderLeft:page===m.id?"3px solid #7c6aff":"3px solid transparent"}}>
              {m.label}
            </button>
          ))}
          <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid "+C.border}}>
            {user?(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:14,color:C.text,fontWeight:700}}>{user.nick}</div>
                  <div style={{fontSize:12,color:C.purpleL,marginTop:2}}>
                    {user.points||0}P
                  </div>
                </div>
                <button onClick={logout}
                  style={{padding:"8px 16px",borderRadius:9,cursor:"pointer",
                    border:"1px solid "+C.border,
                    background:"transparent",color:C.muted,fontSize:13}}>
                  로그아웃
                </button>
              </div>
            ):(
              <Btn onClick={()=>{setShowAuth(true);setMobileOpen(false);}} full>
                로그인 / 회원가입
              </Btn>
            )}
          </div>
        </div>
      )}

      {/* 페이지 */}
      <div style={{paddingTop:60}} className="page-anim" key={page}>
        {renderPage()}
      </div>

      {/* 푸터 */}
      {!isAi&&(
        <footer style={{borderTop:"1px solid "+C.border,padding:"48px 24px",background:C.bg2}}>
          <div style={{maxWidth:1000,margin:"0 auto",
            display:"flex",justifyContent:"space-between",
            alignItems:"flex-start",flexWrap:"wrap",gap:36}}>
            <div style={{maxWidth:280}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:32,height:32,borderRadius:10,
                  background:"linear-gradient(135deg,#7c6aff,#ec4899)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,fontWeight:900,color:"#fff"}}>N</div>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:C.text}}>엔퍼콘텐츠랩</div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>NPER CONTENTS LAB</div>
                </div>
              </div>
              <p style={{fontSize:13,color:C.muted,lineHeight:1.85}}>
                비즈니스를 위한 SNS 성장 파트너. AI를 활용해 더 빠르게, 더 스마트하게
              </p>
            </div>
            <div style={{display:"flex",gap:48,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:12,
                  letterSpacing:1.5,textTransform:"uppercase"}}>
                  서비스
                </div>
                {["강의 사이트 운영","SNS 홍보 지원","프로그램 & 자료 제공","관리 대행"].map(s=>(
                  <div key={s} style={{fontSize:13,color:C.muted,marginBottom:8}}>{s}</div>
                ))}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:12,
                  letterSpacing:1.5,textTransform:"uppercase"}}>
                  커뮤니티
                </div>
                {CATS.map(c=>(
                  <div key={c.id} onClick={()=>navigate(c.id)}
                    style={{fontSize:13,color:C.muted,marginBottom:8,cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.color=C.purpleL}
                    onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
                    {c.icon} {c.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{maxWidth:1000,margin:"24px auto 0",paddingTop:24,
            borderTop:"1px solid "+C.border,
            display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:12,color:C.muted}}>
              © 2025 엔퍼콘텐츠랩 · All rights reserved.
            </span>
            <span style={{fontSize:12,color:C.muted,cursor:"pointer"}}
              onClick={()=>navigate("admin")}>
              관리자
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
// 네이버 서치어드바이저 인증 — 봇/크롤러에도 동일하게 응답
export const config = { runtime: "edge" };

export default function handler(req) {
  return new Response("naver13ff0ecd787361289eef4e82f97736a", {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Middleware-Skip": "1",
    },
  });
}

// ================================================================
// Firebase → Supabase 마이그레이션 스크립트
// 실행 방법: node migrate.js
// ================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://ckzjnpzadeovrasucjmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_TRn4PuhwKeH5yhkCJmL8JQ_Ee3HXQnf";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Firebase export 파일 읽기
const raw = readFileSync("./nper-chat-default-rtdb-export.json", "utf-8");
const data = JSON.parse(raw);

// ── 1. Users 마이그레이션 ────────────────────────────────────────
async function migrateUsers() {
  console.log("\n👥 회원 마이그레이션 시작...");
  const users = data.users || {};
  let ok = 0, skip = 0;

  for (const [uid, u] of Object.entries(users)) {
    const row = {
      uid:             u.uid || uid,
      email:           u.email || "",
      nick:            u.nick || u.email?.split("@")[0] || "회원",
      role:            u.role || "member",
      points:          u.points || 0,
      provider:        u.provider || "email",
      join_date:       u.joinDate || new Date().toISOString(),
      last_login:      u.lastLogin || new Date().toISOString(),
      last_login_date: u.lastLoginDate || "",
    };

    const { error } = await supabase
      .from("users")
      .upsert(row, { onConflict: "uid" });

    if (error) {
      console.log(`  ⚠️  ${row.nick} (${row.uid}) 건너뜀:`, error.message);
      skip++;
    } else {
      console.log(`  ✅ ${row.nick} (${row.email})`);
      ok++;
    }
  }
  console.log(`\n  완료: 성공 ${ok}명, 건너뜀 ${skip}명`);
}

// ── 2. Posts 마이그레이션 ────────────────────────────────────────
async function migratePosts() {
  console.log("\n📋 게시글 마이그레이션 시작...");
  const posts = data.posts || {};
  let ok = 0, skip = 0;

  for (const [pid, p] of Object.entries(posts)) {
    // body 없는 빈 게시글 건너뜀
    if (!p.title && !p.body) { skip++; continue; }

    const row = {
      id:         String(p.id || pid),
      title:      p.title || "(제목 없음)",
      content:    p.body || "",
      author:     p.nick || "알 수 없음",
      author_uid: p.uid || "",
      cat:        p.cat || "free",
      views:      p.views || 0,
      likes:      p.likes || 0,
      created_at: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
      updated_at: p.edited ? new Date(p.edited).toISOString() : new Date(p.date || Date.now()).toISOString(),
      images:     p.images || [],
      comments:   p.comments || [],
    };

    const { error } = await supabase
      .from("posts")
      .upsert(row, { onConflict: "id" });

    if (error) {
      console.log(`  ⚠️  "${row.title}" 건너뜀:`, error.message);
      skip++;
    } else {
      console.log(`  ✅ "${row.title}" (${row.cat})`);
      ok++;
    }
  }
  console.log(`\n  완료: 성공 ${ok}개, 건너뜀 ${skip}개`);
}

// ── 실행 ────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Firebase → Supabase 마이그레이션 시작!\n");
  await migrateUsers();
  await migratePosts();
  console.log("\n🎉 마이그레이션 완료!");
}

main().catch(console.error);

"""SQLite database for Virality System."""
import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "virality.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS creators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        category TEXT DEFAULT '',
        followers INTEGER DEFAULT 0,
        reels_30d INTEGER DEFAULT 0,
        avg_views INTEGER DEFAULT 0,
        profile_pic_url TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        scraped_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        analysis_instructions TEXT DEFAULT '',
        concept_instructions TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER NOT NULL,
        shortcode TEXT UNIQUE,
        url TEXT DEFAULT '',
        thumbnail_url TEXT DEFAULT '',
        video_url TEXT DEFAULT '',
        caption TEXT DEFAULT '',
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        posted_at TEXT,
        scraped_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL,
        config_id INTEGER NOT NULL,
        hook_analysis TEXT DEFAULT '',
        retention_analysis TEXT DEFAULT '',
        script_analysis TEXT DEFAULT '',
        full_analysis TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS concepts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL,
        config_id INTEGER NOT NULL,
        title TEXT DEFAULT '',
        description TEXT DEFAULT '',
        hook TEXT DEFAULT '',
        script TEXT DEFAULT '',
        why_it_works TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pipeline_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        total_videos INTEGER DEFAULT 0,
        analyzed_videos INTEGER DEFAULT 0,
        log TEXT DEFAULT '',
        started_at TEXT DEFAULT (datetime('now')),
        finished_at TEXT,
        FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
    );
    """)
    conn.commit()
    conn.close()


# ── Creators ──

def create_creator(username: str, category: str = "") -> dict:
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO creators (username, category) VALUES (?, ?)",
            (username.strip().lstrip("@"), category),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM creators WHERE username = ?",
            (username.strip().lstrip("@"),),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def update_creator(creator_id: int, **kwargs) -> dict:
    conn = get_conn()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [creator_id]
    conn.execute(f"UPDATE creators SET {sets} WHERE id = ?", vals)
    conn.commit()
    row = conn.execute("SELECT * FROM creators WHERE id = ?", (creator_id,)).fetchone()
    conn.close()
    return dict(row) if row else {}


def delete_creator(creator_id: int):
    conn = get_conn()
    conn.execute("DELETE FROM creators WHERE id = ?", (creator_id,))
    conn.commit()
    conn.close()


def get_creators(category: str = "") -> list[dict]:
    conn = get_conn()
    if category:
        rows = conn.execute(
            "SELECT * FROM creators WHERE category = ? ORDER BY avg_views DESC",
            (category,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM creators ORDER BY avg_views DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_creator(creator_id: int) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM creators WHERE id = ?", (creator_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ── Configs ──

def create_config(name: str, category: str, analysis_instructions: str, concept_instructions: str) -> dict:
    conn = get_conn()
    conn.execute(
        "INSERT INTO configs (name, category, analysis_instructions, concept_instructions) VALUES (?, ?, ?, ?)",
        (name, category, analysis_instructions, concept_instructions),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM configs ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()
    return dict(row)


def update_config(config_id: int, **kwargs) -> dict:
    conn = get_conn()
    kwargs["updated_at"] = datetime.utcnow().isoformat()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [config_id]
    conn.execute(f"UPDATE configs SET {sets} WHERE id = ?", vals)
    conn.commit()
    row = conn.execute("SELECT * FROM configs WHERE id = ?", (config_id,)).fetchone()
    conn.close()
    return dict(row) if row else {}


def delete_config(config_id: int):
    conn = get_conn()
    conn.execute("DELETE FROM configs WHERE id = ?", (config_id,))
    conn.commit()
    conn.close()


def get_configs() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM configs ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_config(config_id: int) -> dict | None:
    conn = get_conn()
    row = conn.execute("SELECT * FROM configs WHERE id = ?", (config_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ── Videos ──

def upsert_video(creator_id: int, shortcode: str, **kwargs) -> dict:
    conn = get_conn()
    existing = conn.execute("SELECT id FROM videos WHERE shortcode = ?", (shortcode,)).fetchone()
    if existing:
        sets = ", ".join(f"{k} = ?" for k in kwargs)
        vals = list(kwargs.values()) + [shortcode]
        conn.execute(f"UPDATE videos SET {sets} WHERE shortcode = ?", vals)
    else:
        cols = ["creator_id", "shortcode"] + list(kwargs.keys())
        placeholders = ", ".join(["?"] * len(cols))
        vals = [creator_id, shortcode] + list(kwargs.values())
        conn.execute(f"INSERT INTO videos ({', '.join(cols)}) VALUES ({placeholders})", vals)
    conn.commit()
    row = conn.execute("SELECT * FROM videos WHERE shortcode = ?", (shortcode,)).fetchone()
    conn.close()
    return dict(row)


def get_videos(config_id: int = 0, creator_id: int = 0, sort: str = "views", limit: int = 100) -> list[dict]:
    conn = get_conn()
    query = """
        SELECT v.*, c.username as creator_username, c.category as creator_category,
               c.profile_pic_url as creator_pic
        FROM videos v
        JOIN creators c ON v.creator_id = c.id
    """
    conditions = []
    params = []
    if creator_id:
        conditions.append("v.creator_id = ?")
        params.append(creator_id)
    if config_id:
        conditions.append("c.category IN (SELECT category FROM configs WHERE id = ?)")
        params.append(config_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    sort_map = {"views": "v.views DESC", "likes": "v.likes DESC", "recent": "v.posted_at DESC"}
    query += f" ORDER BY {sort_map.get(sort, 'v.views DESC')} LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_video(video_id: int) -> dict | None:
    conn = get_conn()
    row = conn.execute("""
        SELECT v.*, c.username as creator_username, c.category as creator_category
        FROM videos v JOIN creators c ON v.creator_id = c.id
        WHERE v.id = ?
    """, (video_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ── Analyses ──

def save_analysis(video_id: int, config_id: int, hook: str, retention: str, script: str, full: str) -> dict:
    conn = get_conn()
    # 기존 분석이 있으면 업데이트
    existing = conn.execute(
        "SELECT id FROM analyses WHERE video_id = ? AND config_id = ?",
        (video_id, config_id),
    ).fetchone()
    if existing:
        conn.execute(
            """UPDATE analyses SET hook_analysis=?, retention_analysis=?, script_analysis=?, full_analysis=?
               WHERE video_id=? AND config_id=?""",
            (hook, retention, script, full, video_id, config_id),
        )
    else:
        conn.execute(
            """INSERT INTO analyses (video_id, config_id, hook_analysis, retention_analysis, script_analysis, full_analysis)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (video_id, config_id, hook, retention, script, full),
        )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM analyses WHERE video_id = ? AND config_id = ?",
        (video_id, config_id),
    ).fetchone()
    conn.close()
    return dict(row)


def get_analysis(video_id: int, config_id: int) -> dict | None:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM analyses WHERE video_id = ? AND config_id = ?",
        (video_id, config_id),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


# ── Concepts ──

def save_concepts(video_id: int, config_id: int, concepts_list: list[dict]):
    conn = get_conn()
    # 기존 콘셉트 삭제 후 재생성
    conn.execute("DELETE FROM concepts WHERE video_id = ? AND config_id = ?", (video_id, config_id))
    for c in concepts_list:
        conn.execute(
            """INSERT INTO concepts (video_id, config_id, title, description, hook, script, why_it_works)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (video_id, config_id, c.get("title", ""), c.get("description", ""),
             c.get("hook", ""), c.get("script", ""), c.get("why_it_works", "")),
        )
    conn.commit()
    conn.close()


def get_concepts(video_id: int, config_id: int) -> list[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM concepts WHERE video_id = ? AND config_id = ? ORDER BY id",
        (video_id, config_id),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Pipeline Runs ──

def create_pipeline_run(config_id: int) -> dict:
    conn = get_conn()
    conn.execute("INSERT INTO pipeline_runs (config_id) VALUES (?)", (config_id,))
    conn.commit()
    row = conn.execute("SELECT * FROM pipeline_runs ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()
    return dict(row)


def update_pipeline_run(run_id: int, **kwargs) -> dict:
    conn = get_conn()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [run_id]
    conn.execute(f"UPDATE pipeline_runs SET {sets} WHERE id = ?", vals)
    conn.commit()
    row = conn.execute("SELECT * FROM pipeline_runs WHERE id = ?", (run_id,)).fetchone()
    conn.close()
    return dict(row) if row else {}


def get_categories() -> list[str]:
    conn = get_conn()
    rows = conn.execute("SELECT DISTINCT category FROM creators WHERE category != '' ORDER BY category").fetchall()
    conn.close()
    return [r["category"] for r in rows]

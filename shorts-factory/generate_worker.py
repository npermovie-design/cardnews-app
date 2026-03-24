"""독립 프로세스로 영상 1개 생성 (메모리 격리)"""
import sys
import json
from video_processor import generate_short

if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    try:
        result = generate_short(
            video_path=args["video_path"],
            srt_path=args.get("srt_path", ""),
            start_seconds=args["start_seconds"],
            end_seconds=args["end_seconds"],
            output_path=args["output_path"],
            progress_callback=None,
            title=args.get("title", ""),
            subtitle=args.get("subtitle", ""),
            logo_path=args.get("logo_path", ""),
            remove_silence=args.get("remove_silence", False),
            subs=args.get("subs", []),
            template=args.get("template", "minimal"),
            custom_font=args.get("custom_font", ""),
            title_color=args.get("title_color", ""),
            caption_color=args.get("caption_color", ""),
        )
        print(json.dumps({"ok": True, "path": result}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))

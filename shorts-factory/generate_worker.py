"""독립 프로세스로 영상 1개 생성 (메모리 격리)"""
import sys
import json
from video_processor import generate_short, generate_longform

if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    try:
        is_longform = args.get("longform", False)
        subs_data = args.get("subs", []) if args.get("subtitles_enabled", True) else []

        if is_longform:
            result = generate_longform(
                video_path=args["video_path"],
                output_path=args["output_path"],
                video_segments=args.get("video_segments", []),
                subs=subs_data,
                subtitles_enabled=args.get("subtitles_enabled", True),
                caption_style=args.get("caption_style", {}),
                remove_silence=args.get("remove_silence", False),
                silence_regions=args.get("silence_regions", []),
                silence_gap=args.get("silence_gap", 0.25),
                progress_callback=None,
            )
        else:
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
                subs=subs_data,
                template=args.get("template", "minimal"),
                custom_font=args.get("custom_font", ""),
                title_color=args.get("title_color", ""),
                caption_color=args.get("caption_color", ""),
            )
        print(json.dumps({"ok": True, "path": result}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))

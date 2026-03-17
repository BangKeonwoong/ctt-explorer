from __future__ import annotations

from pathlib import Path
from urllib.request import urlopen


BOOK_SLUG = "daniel"
BOOK_LABEL = "DAN"
CHAPTERS = range(1, 13)
BASE_URL = "https://raw.githubusercontent.com/ETCBC/CTT/master"
ROOT = Path(__file__).resolve().parents[1]
TARGET_ROOT = ROOT / "source-data" / "ctt" / BOOK_SLUG


def fetch_chapter(chapter: int) -> Path:
    chapter_dir = TARGET_ROOT / f"{chapter:02d}"
    chapter_dir.mkdir(parents=True, exist_ok=True)
    target = chapter_dir / f"{BOOK_SLUG}{chapter:02d}.CTT"
    url = f"{BASE_URL}/{BOOK_SLUG}/{chapter:02d}/{BOOK_SLUG}{chapter:02d}.CTT"
    with urlopen(url) as response:  # nosec: ETCBC source URL is fixed
        target.write_bytes(response.read())
    return target


def main() -> None:
    print(f"Fetching {BOOK_LABEL} chapters into {TARGET_ROOT}")
    for chapter in CHAPTERS:
        target = fetch_chapter(chapter)
        print(f"  saved {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

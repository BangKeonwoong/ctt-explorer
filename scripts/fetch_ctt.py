from __future__ import annotations

from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen


BOOK_SLUG = "daniel"
BOOK_LABEL = "DAN"
CHAPTERS = range(1, 13)
CTT_BASE_URL = "https://raw.githubusercontent.com/ETCBC/CTT/master"
LITERAL_REPO_URL = "https://raw.githubusercontent.com/BangKeonwoong/bible-viewer/main"
LITERAL_SOURCE_NAME = "성경 직역 정보 2.csv"
ROOT = Path(__file__).resolve().parents[1]
TARGET_ROOT = ROOT / "source-data" / "ctt" / BOOK_SLUG
LITERAL_TARGET = ROOT / "source-data" / "literal" / "bible-viewer-korean-literal.csv"


def fetch_chapter(chapter: int) -> Path:
    chapter_dir = TARGET_ROOT / f"{chapter:02d}"
    chapter_dir.mkdir(parents=True, exist_ok=True)
    target = chapter_dir / f"{BOOK_SLUG}{chapter:02d}.CTT"
    url = f"{CTT_BASE_URL}/{BOOK_SLUG}/{chapter:02d}/{BOOK_SLUG}{chapter:02d}.CTT"
    with urlopen(url) as response:  # nosec: ETCBC source URL is fixed
        target.write_bytes(response.read())
    return target


def fetch_literal_csv() -> Path:
    LITERAL_TARGET.parent.mkdir(parents=True, exist_ok=True)
    url = f"{LITERAL_REPO_URL}/{quote(LITERAL_SOURCE_NAME)}"
    with urlopen(url) as response:  # nosec: upstream source URL is fixed
        LITERAL_TARGET.write_bytes(response.read())
    return LITERAL_TARGET


def main() -> None:
    print(f"Fetching {BOOK_LABEL} chapters into {TARGET_ROOT}")
    for chapter in CHAPTERS:
        target = fetch_chapter(chapter)
        print(f"  saved {target.relative_to(ROOT)}")
    literal_target = fetch_literal_csv()
    print(f"  saved {literal_target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "source-data" / "ctt"
LITERAL_SOURCE = ROOT / "source-data" / "literal" / "bible-viewer-korean-literal.csv"
OUTPUT_ROOT = ROOT / "public" / "data"
CHAPTER_OUTPUT = OUTPUT_ROOT / "chapters"


@dataclass(frozen=True)
class BookCatalogEntry:
    code: str
    name: str
    label: str
    testament: str
    chapterCount: int
    sourceSlug: str | None = None
    bhsaName: str | None = None


BOOK_CATALOG = [
    BookCatalogEntry("GEN", "Genesis", "창세기", "OT", 50),
    BookCatalogEntry("EXO", "Exodus", "출애굽기", "OT", 40),
    BookCatalogEntry("LEV", "Leviticus", "레위기", "OT", 27),
    BookCatalogEntry("NUM", "Numbers", "민수기", "OT", 36),
    BookCatalogEntry("DEU", "Deuteronomy", "신명기", "OT", 34),
    BookCatalogEntry("JOS", "Joshua", "여호수아", "OT", 24),
    BookCatalogEntry("JDG", "Judges", "사사기", "OT", 21),
    BookCatalogEntry("RUT", "Ruth", "룻기", "OT", 4),
    BookCatalogEntry("1SA", "1 Samuel", "사무엘상", "OT", 31),
    BookCatalogEntry("2SA", "2 Samuel", "사무엘하", "OT", 24),
    BookCatalogEntry("1KI", "1 Kings", "열왕기상", "OT", 22),
    BookCatalogEntry("2KI", "2 Kings", "열왕기하", "OT", 25),
    BookCatalogEntry("1CH", "1 Chronicles", "역대상", "OT", 29),
    BookCatalogEntry("2CH", "2 Chronicles", "역대하", "OT", 36),
    BookCatalogEntry("EZR", "Ezra", "에스라", "OT", 10),
    BookCatalogEntry("NEH", "Nehemiah", "느헤미야", "OT", 13),
    BookCatalogEntry("EST", "Esther", "에스더", "OT", 10),
    BookCatalogEntry("JOB", "Job", "욥기", "OT", 42),
    BookCatalogEntry("PSA", "Psalms", "시편", "OT", 150),
    BookCatalogEntry("PRO", "Proverbs", "잠언", "OT", 31),
    BookCatalogEntry("ECC", "Ecclesiastes", "전도서", "OT", 12),
    BookCatalogEntry("SNG", "Song of Songs", "아가", "OT", 8),
    BookCatalogEntry("ISA", "Isaiah", "이사야", "OT", 66),
    BookCatalogEntry("JER", "Jeremiah", "예레미야", "OT", 52),
    BookCatalogEntry("LAM", "Lamentations", "예레미야애가", "OT", 5),
    BookCatalogEntry("EZE", "Ezekiel", "에스겔", "OT", 48),
    BookCatalogEntry("DAN", "Daniel", "다니엘", "OT", 12, "daniel", "Daniel"),
    BookCatalogEntry("HOS", "Hosea", "호세아", "OT", 14),
    BookCatalogEntry("JOL", "Joel", "요엘", "OT", 3),
    BookCatalogEntry("AMO", "Amos", "아모스", "OT", 9),
    BookCatalogEntry("OBA", "Obadiah", "오바댜", "OT", 1),
    BookCatalogEntry("JON", "Jonah", "요나", "OT", 4),
    BookCatalogEntry("MIC", "Micah", "미가", "OT", 7),
    BookCatalogEntry("NAM", "Nahum", "나훔", "OT", 3),
    BookCatalogEntry("HAB", "Habakkuk", "하박국", "OT", 3),
    BookCatalogEntry("ZEP", "Zephaniah", "스바냐", "OT", 3),
    BookCatalogEntry("HAG", "Haggai", "학개", "OT", 2),
    BookCatalogEntry("ZEC", "Zechariah", "스가랴", "OT", 14),
    BookCatalogEntry("MAL", "Malachi", "말라기", "OT", 4),
    BookCatalogEntry("MAT", "Matthew", "마태복음", "NT", 28),
    BookCatalogEntry("MRK", "Mark", "마가복음", "NT", 16),
    BookCatalogEntry("LUK", "Luke", "누가복음", "NT", 24),
    BookCatalogEntry("JHN", "John", "요한복음", "NT", 21),
    BookCatalogEntry("ACT", "Acts", "사도행전", "NT", 28),
    BookCatalogEntry("ROM", "Romans", "로마서", "NT", 16),
    BookCatalogEntry("1CO", "1 Corinthians", "고린도전서", "NT", 16),
    BookCatalogEntry("2CO", "2 Corinthians", "고린도후서", "NT", 13),
    BookCatalogEntry("GAL", "Galatians", "갈라디아서", "NT", 6),
    BookCatalogEntry("EPH", "Ephesians", "에베소서", "NT", 6),
    BookCatalogEntry("PHP", "Philippians", "빌립보서", "NT", 4),
    BookCatalogEntry("COL", "Colossians", "골로새서", "NT", 4),
    BookCatalogEntry("1TH", "1 Thessalonians", "데살로니가전서", "NT", 5),
    BookCatalogEntry("2TH", "2 Thessalonians", "데살로니가후서", "NT", 3),
    BookCatalogEntry("1TI", "1 Timothy", "디모데전서", "NT", 6),
    BookCatalogEntry("2TI", "2 Timothy", "디모데후서", "NT", 4),
    BookCatalogEntry("TIT", "Titus", "디도서", "NT", 3),
    BookCatalogEntry("PHM", "Philemon", "빌레몬서", "NT", 1),
    BookCatalogEntry("HEB", "Hebrews", "히브리서", "NT", 13),
    BookCatalogEntry("JAS", "James", "야고보서", "NT", 5),
    BookCatalogEntry("1PE", "1 Peter", "베드로전서", "NT", 5),
    BookCatalogEntry("2PE", "2 Peter", "베드로후서", "NT", 3),
    BookCatalogEntry("1JN", "1 John", "요한일서", "NT", 5),
    BookCatalogEntry("2JN", "2 John", "요한이서", "NT", 1),
    BookCatalogEntry("3JN", "3 John", "요한삼서", "NT", 1),
    BookCatalogEntry("JUD", "Jude", "유다서", "NT", 1),
    BookCatalogEntry("REV", "Revelation", "요한계시록", "NT", 22),
]
BOOK_BY_CODE = {entry.code: entry for entry in BOOK_CATALOG}
BOOK_CODE_BY_NAME = {entry.name: entry.code for entry in BOOK_CATALOG}
DEFAULT_BOOK = BOOK_BY_CODE["DAN"]
PRODUCT_NAME = "CTT Explorer"

CONTENT_PREFIX = re.compile(r"^\s*[A-Z0-9]{3}\s+\d{2},\d{2}")
BRACKET_CONTENT_RE = re.compile(r"\[([^\]]+)\]")
ANGLE_CONTENTS_RE = re.compile(r"<([^>]+)>")
ANGLE_RE = re.compile(r"<[^>]+>")
HEBREW_CHAR_RE = re.compile(r"[\u05d0-\u05ea]")

_CHAR_MAP = {
    ">": "א",
    "<": "ע",
    "B": "ב",
    "G": "ג",
    "D": "ד",
    "H": "ה",
    "W": "ו",
    "Z": "ז",
    "X": "ח",
    "V": "ט",
    "J": "י",
    "K": "כ",
    "L": "ל",
    "M": "מ",
    "N": "נ",
    "S": "ס",
    "P": "פ",
    "Y": "צ",
    "Q": "ק",
    "R": "ר",
    "C": "ש",
    "$": "ש",
    "T": "ת",
}
_FINAL_MAP = {"כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ"}


def _is_content_line(line: str) -> bool:
    return bool(CONTENT_PREFIX.match(line))


def _translit_token_to_hebrew(token: str) -> str:
    trimmed = re.sub(r"[^A-Za-z<>$-]", "", token).replace("-", "")
    output = "".join(_CHAR_MAP.get(char, "") for char in trimmed)
    if output:
        final = output[-1]
        output = output[:-1] + _FINAL_MAP.get(final, final)
    return output


def _extract_surface_text(line: str) -> str:
    words: list[str] = []
    for chunk in BRACKET_CONTENT_RE.findall(line):
        value = ANGLE_RE.sub("", chunk).strip()
        if not value or re.fullmatch(r"[A-Z]", value):
            continue
        words.append(value)
    return " ".join(words)


def _extract_functions(line: str) -> list[str]:
    labels: list[str] = []
    for chunk in BRACKET_CONTENT_RE.findall(line):
        for label in ANGLE_CONTENTS_RE.findall(chunk):
            for part in re.split(r"[\s/]+", label):
                candidate = part.strip()
                if candidate and candidate not in labels:
                    labels.append(candidate)
    return labels


def _surface_to_hebrew(surface: str) -> str:
    return " ".join(
        token
        for token in (_translit_token_to_hebrew(part) for part in surface.split())
        if token
    )


def _normalize_hebrew(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    stripped = "".join(
        char for char in decomposed if unicodedata.category(char) != "Mn"
    )
    return "".join(HEBREW_CHAR_RE.findall(stripped))


def _collapse_text_type(value: str) -> str:
    if "Q" in value:
        return "Q"
    if "D" in value:
        return "D"
    if "N" in value:
        return "N"
    if "?" in value:
        return "?"
    return value or "?"


def _split_fixed_fields(line: str) -> dict[str, str]:
    return {
        "verse": line[0:10].strip(),
        "pn": line[10:15].strip(),
        "ctype": line[15:21].strip(),
        "mother": line[21:31].strip(),
        "text_type": line[31:39].strip(),
        "paragraph": line[39:47].strip(),
        "atom_number": line[47:50].strip(),
        "subtype": line[50:55].strip(),
        "hierarchy": line[55:].rstrip(),
    }


@dataclass
class ClauseNode:
    id: str
    verse: str
    pn: str
    ctype: str
    mother: str
    textType: str
    paragraph: str
    atomNumber: str
    subtype: str
    hierarchy: str
    surface: str
    surfaceHebrew: str
    gloss: str
    functions: list[str]
    pipeDepth: int
    quotationBlock: int
    quotationDepth: int
    isRoot: bool
    isDirectSpeech: bool
    parentId: str | None = None
    depth: int = 0
    path: list[str] = field(default_factory=list)
    siblingIndex: int = 0
    descendantCount: int = 0
    hasChildren: bool = False
    koreanLiteral: str | None = None
    literalMeta: dict[str, str] | None = None
    children: list["ClauseNode"] = field(default_factory=list)


@dataclass(frozen=True)
class VerseLiteralRow:
    clauseType: str
    motherClauseType: str
    predictedTam: str
    hebrewText: str
    wordOrder: str
    koreanLiteral: str


def _node_to_dict(node: ClauseNode) -> dict[str, Any]:
    payload = asdict(node)
    payload["children"] = [_node_to_dict(child) for child in node.children]
    return payload


def _hierarchy_content_start(hierarchy: str) -> int:
    start = hierarchy.find("[")
    return start if start >= 0 else len(hierarchy)


def _mother_anchor(mother: str) -> str | None:
    trimmed = mother.strip()
    if not trimmed.startswith("<<"):
        return None
    anchor = trimmed[2:].strip()
    if not anchor:
        return None
    if "[R]" in anchor:
        return "ROOT"
    return anchor


def _find_ancestor_by_mother(
    stack: list[tuple[ClauseNode, int]],
    mother: str,
) -> tuple[ClauseNode, int] | None:
    anchor = _mother_anchor(mother)
    if not anchor:
        return None
    for candidate in reversed(stack):
        node = candidate[0]
        if anchor == "ROOT" and node.ctype == "ROOT":
            return candidate
        if node.ctype == anchor:
            return candidate
    return None


def _append_with_hierarchy(
    root: ClauseNode,
    entries: list[tuple[ClauseNode, int]],
) -> None:
    stack: list[tuple[ClauseNode, int]] = [(root, -1)]
    for node, content_start in entries:
        while len(stack) > 1 and content_start <= stack[-1][1]:
            stack.pop()

        ancestor_match = _find_ancestor_by_mother(stack, node.mother)
        if ancestor_match is not None:
            while stack and stack[-1] is not ancestor_match:
                stack.pop()

        parent = stack[-1][0]
        parent.children.append(node)
        stack.append((node, content_start))


def _annotate_tree(
    node: ClauseNode,
    parent_id: str | None,
    depth: int,
    prefix: list[str],
) -> int:
    node.parentId = parent_id
    node.depth = depth
    node.path = [*prefix, node.id]
    total_descendants = 0

    for sibling_index, child in enumerate(node.children):
        child.siblingIndex = sibling_index
        total_descendants += 1 + _annotate_tree(
            child,
            node.id,
            depth + 1,
            node.path,
        )

    node.descendantCount = total_descendants
    node.hasChildren = bool(node.children)
    if node.ctype != "ROOT":
        node.pipeDepth = max(depth, 0)
    return total_descendants


class BhsaEnricher:
    def __init__(self) -> None:
        self.available = False
        self._api = None
        self._tokens: dict[tuple[str, int, int], list[str]] = {}
        self._gloss: dict[tuple[str, int, int], str] = {}
        try:
            from tf.fabric import Fabric  # type: ignore
        except Exception:
            return
        for module in ("etcbc/bhsa/tf/2021", "etcbc/bhsa/tf/2020", "etcbc/bhsa"):
            tf = Fabric(modules=[module], silent="deep")
            api = tf.load("otext otype g_word_utf8 gloss")
            if api:
                self._api = api
                self.available = True
                break

    def _verse_node(
        self,
        book: BookCatalogEntry,
        chapter: int,
        verse: int,
    ) -> Any:
        if not self._api or not book.bhsaName:
            return None
        try:
            return self._api.T.nodeFromSection((book.bhsaName, chapter, verse))
        except Exception:
            return None

    def verse_tokens(
        self,
        book: BookCatalogEntry,
        chapter: int,
        verse: int,
    ) -> list[str]:
        key = (book.code, chapter, verse)
        if key in self._tokens:
            return self._tokens[key]
        if not self.available or not self._api:
            self._tokens[key] = []
            return []
        verse_node = self._verse_node(book, chapter, verse)
        if not verse_node:
            self._tokens[key] = []
            return []
        F, L, T = self._api.F, self._api.L, self._api.T
        tokens: list[str] = []
        for word in L.d(verse_node, otype="word"):
            feature = getattr(F, "g_word_utf8", None)
            token = feature.v(word) if feature else ""
            if not token:
                try:
                    token = T.text(word, fmt="text-orig-full")
                except Exception:
                    token = T.text(word)
            tokens.append(token)
        self._tokens[key] = tokens
        return tokens

    def verse_gloss(
        self,
        book: BookCatalogEntry,
        chapter: int,
        verse: int,
    ) -> str:
        key = (book.code, chapter, verse)
        if key in self._gloss:
            return self._gloss[key]
        if not self.available or not self._api:
            self._gloss[key] = ""
            return ""
        verse_node = self._verse_node(book, chapter, verse)
        if not verse_node:
            self._gloss[key] = ""
            return ""
        F, L = self._api.F, self._api.L
        gloss_feature = getattr(F, "gloss", None)
        if not gloss_feature:
            self._gloss[key] = ""
            return ""
        parts = [gloss_feature.v(word) or "" for word in L.d(verse_node, otype="word")]
        gloss = " ".join(part for part in parts if part).strip()
        self._gloss[key] = gloss
        return gloss


def load_literal_index() -> dict[tuple[str, int, int], list[VerseLiteralRow]]:
    if not LITERAL_SOURCE.exists():
        raise SystemExit(
            f"Missing literal source data at {LITERAL_SOURCE}. Run `npm run data:fetch` first."
        )

    index: dict[tuple[str, int, int], list[VerseLiteralRow]] = {}
    with LITERAL_SOURCE.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=";")
        for row in reader:
            book_name = (row.get("Book") or "").strip()
            book_code = BOOK_CODE_BY_NAME.get(book_name)
            if book_code != "DAN":
                continue

            chapter = int(row.get("Chapter") or 0)
            verse = int(row.get("Verse") or 0)
            korean_literal = (row.get("Korean Literal") or "").strip()
            if not chapter or not verse or not korean_literal:
                continue

            index.setdefault((book_code, chapter, verse), []).append(
                VerseLiteralRow(
                    clauseType=(row.get("Clause Type") or "").strip(),
                    motherClauseType=(row.get("Mother Clause Type") or "").strip(),
                    predictedTam=(row.get("Predicted TAM") or "").strip(),
                    hebrewText=(row.get("Hebrew Text") or "").strip(),
                    wordOrder=(row.get("Word Order") or "").strip(),
                    koreanLiteral=korean_literal,
                )
            )
    return index


def _verse_number(verse_key: str) -> int:
    match = re.search(r",(\d{2})$", verse_key)
    return int(match.group(1)) if match else 0


def _literal_rule_candidates(
    row: VerseLiteralRow,
    nodes: list[ClauseNode],
    parent_types: dict[str, str],
    rule: str,
) -> list[ClauseNode]:
    normalized_row_hebrew = _normalize_hebrew(row.hebrewText)
    candidates: list[ClauseNode] = []

    for node in nodes:
        if node.ctype != row.clauseType:
            continue

        parent_type = parent_types.get(node.id, "")
        normalized_node_hebrew = _normalize_hebrew(_surface_to_hebrew(node.surface))

        if rule == "ctype+mother+he":
            if not row.motherClauseType or not normalized_row_hebrew:
                continue
            if (
                parent_type == row.motherClauseType
                and normalized_node_hebrew == normalized_row_hebrew
            ):
                candidates.append(node)
        elif rule == "ctype+he":
            if not normalized_row_hebrew:
                continue
            if normalized_node_hebrew == normalized_row_hebrew:
                candidates.append(node)
        elif rule == "ctype+mother":
            if not row.motherClauseType:
                continue
            if parent_type == row.motherClauseType:
                candidates.append(node)
        elif rule == "ctype":
            candidates.append(node)

    return candidates


def _verse_literal_payload(row: VerseLiteralRow) -> dict[str, str]:
    return {
        "clauseType": row.clauseType,
        "motherClauseType": row.motherClauseType,
        "predictedTam": row.predictedTam,
        "hebrewText": row.hebrewText,
        "wordOrder": row.wordOrder,
        "koreanLiteral": row.koreanLiteral,
    }


def attach_literals(
    verse_map: dict[str, list[str]],
    node_by_id: dict[str, ClauseNode],
    literal_rows: dict[tuple[str, int, int], list[VerseLiteralRow]],
    book: BookCatalogEntry,
    chapter_number: int,
) -> tuple[dict[str, list[dict[str, str]]], dict[str, int]]:
    parent_types = {
        child.id: node.ctype if node.ctype != "ROOT" else ""
        for node in node_by_id.values()
        for child in node.children
    }
    unmatched_by_verse: dict[str, list[dict[str, str]]] = {}
    total_rows = 0
    matched_rows = 0

    for verse_key, node_ids in verse_map.items():
        verse = _verse_number(verse_key)
        rows = list(literal_rows.get((book.code, chapter_number, verse), []))
        if not rows:
            continue

        total_rows += len(rows)
        available_nodes = [node_by_id[node_id] for node_id in node_ids if node_id in node_by_id]
        remaining_nodes = {node.id: node for node in available_nodes}
        remaining_rows = rows[:]

        for rule in ("ctype+mother+he", "ctype+he", "ctype+mother", "ctype"):
            progress = True
            while progress and remaining_rows:
                progress = False
                next_rows: list[VerseLiteralRow] = []
                for row in remaining_rows:
                    candidates = _literal_rule_candidates(
                        row,
                        list(remaining_nodes.values()),
                        parent_types,
                        rule,
                    )
                    if len(candidates) == 1:
                        node = candidates[0]
                        node.koreanLiteral = row.koreanLiteral
                        node.literalMeta = {
                            "clauseType": row.clauseType,
                            "motherClauseType": row.motherClauseType,
                            "predictedTam": row.predictedTam,
                            "hebrewText": row.hebrewText,
                            "wordOrder": row.wordOrder,
                            "matchRule": rule,
                        }
                        remaining_nodes.pop(node.id, None)
                        matched_rows += 1
                        progress = True
                    else:
                        next_rows.append(row)
                remaining_rows = next_rows

        if remaining_rows:
            unmatched_by_verse[verse_key] = [
                _verse_literal_payload(row) for row in remaining_rows
            ]

    return unmatched_by_verse, {
        "totalRows": total_rows,
        "matchedRows": matched_rows,
        "unmatchedRows": total_rows - matched_rows,
    }


def parse_chapter(
    file_path: Path,
    enricher: BhsaEnricher | None = None,
    book: BookCatalogEntry | None = None,
    literal_rows: dict[tuple[str, int, int], list[VerseLiteralRow]] | None = None,
) -> dict[str, Any]:
    book = book or DEFAULT_BOOK
    chapter_number = int(file_path.parent.name)
    root = ClauseNode(
        id=f"{book.code}-{chapter_number:02d}-root",
        verse=f"{book.code} {chapter_number:02d},00",
        pn="",
        ctype="ROOT",
        mother="",
        textType="",
        paragraph="",
        atomNumber="",
        subtype="",
        hierarchy="",
        surface=book.name,
        surfaceHebrew="",
        gloss="",
        functions=[],
        pipeDepth=-1,
        quotationBlock=0,
        quotationDepth=0,
        isRoot=True,
        isDirectSpeech=False,
        parentId=None,
        depth=-1,
        path=[],
        siblingIndex=0,
        descendantCount=0,
        hasChildren=False,
        children=[],
    )
    entries: list[tuple[ClauseNode, int]] = []
    verse_map: dict[str, list[str]] = {}
    clause_types: Counter[str] = Counter()
    text_types: Counter[str] = Counter()
    node_count = 0
    in_quote = False
    quote_depth = 0
    quote_block = 0

    with file_path.open(encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.rstrip("\n")
            if "=====" in line and not _is_content_line(line):
                if not in_quote:
                    in_quote = True
                    quote_depth += 1
                    quote_block += 1
                else:
                    in_quote = False
                    quote_depth = max(0, quote_depth - 1)
                continue
            if not _is_content_line(line):
                continue

            fields = _split_fixed_fields(line)
            surface = _extract_surface_text(line)
            surface_hebrew = _surface_to_hebrew(surface)
            gloss = ""
            verse_match = re.match(
                rf"{re.escape(book.code)}\s+(\d{{2}}),(\d{{2}})",
                fields["verse"],
            )
            chapter = int(verse_match.group(1)) if verse_match else chapter_number
            verse = int(verse_match.group(2)) if verse_match else 0
            if enricher and enricher.available:
                tokens = enricher.verse_tokens(book, chapter, verse)
                surface_hebrew = " ".join(tokens) if tokens else surface_hebrew
                gloss = enricher.verse_gloss(book, chapter, verse)

            node_count += 1
            node = ClauseNode(
                id=f"{book.code}-{chapter_number:02d}-{node_count:03d}",
                verse=fields["verse"],
                pn=fields["pn"],
                ctype=fields["ctype"],
                mother=fields["mother"],
                textType=fields["text_type"],
                paragraph=fields["paragraph"],
                atomNumber=fields["atom_number"],
                subtype=fields["subtype"],
                hierarchy=fields["hierarchy"],
                surface=surface,
                surfaceHebrew=surface_hebrew,
                gloss=gloss,
                functions=_extract_functions(line),
                pipeDepth=0,
                quotationBlock=quote_block if in_quote else 0,
                quotationDepth=quote_depth if in_quote else 0,
                isRoot="[R]" in fields["mother"],
                isDirectSpeech="Q" in fields["text_type"] or in_quote,
                parentId=None,
                depth=0,
                path=[],
                siblingIndex=0,
                descendantCount=0,
                hasChildren=False,
                children=[],
            )
            clause_types[node.ctype] += 1
            text_types[_collapse_text_type(node.textType)] += 1
            verse_map.setdefault(node.verse, []).append(node.id)

            entries.append((node, _hierarchy_content_start(fields["hierarchy"])))

    _append_with_hierarchy(root, entries)
    _annotate_tree(root, None, -1, [])
    node_by_id = {root.id: root}
    node_by_id.update({node.id: node for node, _ in entries})
    unmatched_literal_by_verse, literal_coverage = attach_literals(
        verse_map,
        node_by_id,
        literal_rows or {},
        book,
        chapter_number,
    )

    return {
        "book": book.code,
        "bookName": book.name,
        "bookLabel": book.label,
        "chapter": chapter_number,
        "title": f"{book.label} {chapter_number}장",
        "root": _node_to_dict(root),
        "stats": {
            "totalNodes": node_count,
            "clauseTypes": dict(clause_types.most_common()),
            "textTypes": dict(text_types.most_common()),
        },
        "verseMap": verse_map,
        "unmatchedLiteralByVerse": unmatched_literal_by_verse,
        "literalCoverage": literal_coverage,
    }


def assemble_manifest(
    available_payloads: dict[str, list[dict[str, Any]]],
    bhsa_enrichment: bool,
) -> dict[str, Any]:
    books: list[dict[str, Any]] = []
    for book in BOOK_CATALOG:
        chapters = available_payloads.get(book.code, [])
        has_korean_literal = any(
            payload.get("literalCoverage", {}).get("totalRows", 0) > 0
            for payload in chapters
        )
        books.append(
            {
                "code": book.code,
                "name": book.name,
                "label": book.label,
                "testament": book.testament,
                "chapterCount": book.chapterCount,
                "status": "available" if chapters else "planned",
                "features": {
                    "koreanLiteral": has_korean_literal,
                },
                "chapters": [
                    {
                        "chapter": payload["chapter"],
                        "title": payload["title"],
                        "file": f"chapters/{book.code}-{payload['chapter']:02d}.json",
                        "stats": payload["stats"],
                    }
                    for payload in chapters
                ],
            }
        )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "productName": PRODUCT_NAME,
        "books": books,
        "bhsaEnrichment": bhsa_enrichment,
        "attribution": {
            "ctt": "ETCBC/CTT",
            "bhsa": "ETCBC/bhsa",
            "textFabric": "Text-Fabric",
            "literal": "BangKeonwoong/bible-viewer · 성경 직역 정보 2.csv",
            "licenseNote": (
                "BHSA data is licensed CC BY-NC 4.0; use this project non-commercially and keep source attribution for BHSA and the Korean literal CSV."
            ),
        },
    }


def build_dataset() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    CHAPTER_OUTPUT.mkdir(parents=True, exist_ok=True)
    enricher = BhsaEnricher()
    literal_index = load_literal_index()
    available_payloads: dict[str, list[dict[str, Any]]] = {}

    for book in BOOK_CATALOG:
        if not book.sourceSlug:
            continue
        source_root = SOURCE_ROOT / book.sourceSlug
        if not source_root.exists():
            raise SystemExit(
                f"Missing source data at {source_root}. Run `npm run data:fetch` first."
            )
        chapter_files = sorted(source_root.glob("[0-9][0-9]/*.CTT"))
        if not chapter_files:
            raise SystemExit(f"No chapter files found at {source_root}.")

        payloads: list[dict[str, Any]] = []
        for file_path in chapter_files:
            payload = parse_chapter(file_path, enricher, book, literal_index)
            out_file = CHAPTER_OUTPUT / f"{book.code}-{payload['chapter']:02d}.json"
            out_file.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            payloads.append(payload)
        available_payloads[book.code] = payloads

    manifest = assemble_manifest(available_payloads, enricher.available)
    (OUTPUT_ROOT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    build_dataset()
    print(f"Built dataset in {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()

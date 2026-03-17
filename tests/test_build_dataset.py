from __future__ import annotations

import json
import unittest
from pathlib import Path

from scripts.build_dataset import assemble_manifest, parse_chapter


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "source-data" / "ctt" / "daniel" / "01" / "daniel01.CTT"
SNAPSHOT = ROOT / "tests" / "snapshots" / "dan-01-summary.json"


class BuildDatasetTests(unittest.TestCase):
    def test_fixture_exists(self) -> None:
        self.assertTrue(FIXTURE.exists(), "Run `npm run data:fetch` before tests.")

    def test_parse_snapshot(self) -> None:
        payload = parse_chapter(FIXTURE)
        summary = {
            "chapter": payload["chapter"],
            "totalNodes": payload["stats"]["totalNodes"],
            "topClauseTypes": [
                [key, value]
                for key, value in list(payload["stats"]["clauseTypes"].items())[:6]
            ],
            "firstChild": payload["root"]["children"][0],
            "verseMapHead": {key: payload["verseMap"][key] for key in list(payload["verseMap"])[:4]},
        }
        expected = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
        self.assertEqual(summary, expected)

    def test_manifest_has_full_catalog_shape(self) -> None:
        payload = parse_chapter(FIXTURE)
        manifest = assemble_manifest({"DAN": [payload]}, False)

        self.assertEqual(manifest["productName"], "CTT Explorer")
        self.assertIn("books", manifest)

        daniel = next(book for book in manifest["books"] if book["code"] == "DAN")
        genesis = next(book for book in manifest["books"] if book["code"] == "GEN")

        self.assertEqual(daniel["status"], "available")
        self.assertEqual(len(daniel["chapters"]), 1)
        self.assertEqual(daniel["label"], "다니엘")

        self.assertEqual(genesis["status"], "planned")
        self.assertEqual(genesis["chapters"], [])


if __name__ == "__main__":
    unittest.main()

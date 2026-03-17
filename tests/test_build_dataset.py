from __future__ import annotations

import json
import unittest
from pathlib import Path

from scripts.build_dataset import assemble_manifest, parse_chapter


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "source-data" / "ctt" / "daniel" / "01" / "daniel01.CTT"
SNAPSHOT = ROOT / "tests" / "snapshots" / "dan-01-summary.json"


def walk_nodes(root: dict) -> list[dict]:
    nodes: list[dict] = []
    stack = [root]
    while stack:
        node = stack.pop()
        nodes.append(node)
        stack.extend(reversed(node["children"]))
    return nodes


class BuildDatasetTests(unittest.TestCase):
    def test_fixture_exists(self) -> None:
        self.assertTrue(FIXTURE.exists(), "Run `npm run data:fetch` before tests.")

    def test_parse_snapshot(self) -> None:
        payload = parse_chapter(FIXTURE)
        nodes = walk_nodes(payload["root"])
        deep_node = next(node for node in nodes if node["id"] == "DAN-01-008")
        summary = {
            "chapter": payload["chapter"],
            "totalNodes": payload["stats"]["totalNodes"],
            "rootChildCount": len(payload["root"]["children"]),
            "maxDepth": max(node["depth"] for node in nodes),
            "firstChild": {
                "id": payload["root"]["children"][0]["id"],
                "parentId": payload["root"]["children"][0]["parentId"],
                "depth": payload["root"]["children"][0]["depth"],
                "descendantCount": payload["root"]["children"][0]["descendantCount"],
                "childIds": [
                    child["id"] for child in payload["root"]["children"][0]["children"]
                ],
            },
            "deepNode": {
                "id": deep_node["id"],
                "parentId": deep_node["parentId"],
                "depth": deep_node["depth"],
                "path": deep_node["path"],
                "descendantCount": deep_node["descendantCount"],
                "hasChildren": deep_node["hasChildren"],
                "childIds": [child["id"] for child in deep_node["children"]],
            },
            "verseMapHead": {
                key: payload["verseMap"][key] for key in list(payload["verseMap"])[:4]
            },
        }
        expected = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
        self.assertEqual(summary, expected)

    def test_hierarchy_is_restored(self) -> None:
        payload = parse_chapter(FIXTURE)
        nodes = walk_nodes(payload["root"])
        by_id = {node["id"]: node for node in nodes}

        self.assertGreater(max(node["depth"] for node in nodes), 2)
        self.assertGreater(
            sum(1 for node in nodes if node["ctype"] != "ROOT" and node["children"]),
            0,
        )

        self.assertEqual(by_id["DAN-01-001"]["parentId"], "DAN-01-root")
        self.assertEqual(by_id["DAN-01-001"]["depth"], 0)
        self.assertEqual(by_id["DAN-01-002"]["parentId"], "DAN-01-001")
        self.assertEqual(by_id["DAN-01-002"]["depth"], 1)
        self.assertEqual(by_id["DAN-01-003"]["parentId"], "DAN-01-002")
        self.assertEqual(by_id["DAN-01-003"]["depth"], 2)
        self.assertEqual(by_id["DAN-01-006"]["parentId"], "DAN-01-001")
        self.assertEqual(by_id["DAN-01-007"]["parentId"], "DAN-01-006")
        self.assertEqual(by_id["DAN-01-008"]["path"], ["DAN-01-root", "DAN-01-001", "DAN-01-006", "DAN-01-007", "DAN-01-008"])

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

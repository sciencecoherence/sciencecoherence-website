#!/usr/bin/env python3
"""Tests for the coordination layer.

    python -m unittest discover -s tools/tests

Each test builds a throwaway repository, points coord at it through COORD_ROOT and
drives the real command line, so what is tested is what a model actually runs.
"""

import contextlib
import importlib
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
REPO = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)


class Base(unittest.TestCase):
    def setUp(self) -> None:
        self.root = tempfile.mkdtemp(prefix="coord-test-")
        os.makedirs(os.path.join(self.root, "tools"))
        os.makedirs(os.path.join(self.root, "canon"))
        for name in ("coord.py", "check_canon.py"):
            shutil.copy(os.path.join(TOOLS, name), os.path.join(self.root, "tools", name))
        for name in ("recursion.json", "lexicon.json", "constants.json", "FRAMEWORK.md"):
            src = os.path.join(REPO, "canon", name)
            if os.path.exists(src):
                shutil.copy(src, os.path.join(self.root, "canon", name))
        self.write("app.js", "window.app = 1;\n")
        self.write("styles.css", "body { color: green; }\n")
        self.write("README.md", "# site\n")
        os.environ["COORD_ROOT"] = self.root
        self.coord = importlib.reload(importlib.import_module("coord"))

    def tearDown(self) -> None:
        os.environ.pop("COORD_ROOT", None)
        shutil.rmtree(self.root, ignore_errors=True)

    # helpers ----------------------------------------------------------------
    def write(self, name: str, text: str) -> None:
        path = os.path.join(self.root, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    def cli(self, *argv):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = self.coord.main(list(argv))
        return code, buf.getvalue()

    def state(self):
        with open(os.path.join(self.root, "handoff", "state.json"), encoding="utf-8") as f:
            return json.load(f)

    def tasks(self):
        with open(os.path.join(self.root, "handoff", "TASKS.json"), encoding="utf-8") as f:
            return json.load(f)

    def baseline(self):
        self.cli("init", "--agent", "claude", "--note", "baseline")


class TestBaseline(Base):
    def test_init_tracks_the_site_and_not_the_noise(self):
        self.write("assets/logo.png", "x")
        self.write("_superseded/old.js", "x")
        self.write("writing-room/data/private.json", "x")
        self.write("writing-room/server.py", "x")
        self.baseline()
        tracked = set(self.state()["manifest"])
        self.assertIn("app.js", tracked)
        self.assertIn("writing-room/server.py", tracked)
        self.assertNotIn("assets/logo.png", tracked)
        self.assertNotIn("_superseded/old.js", tracked)
        self.assertNotIn("writing-room/data/private.json", tracked)

    def test_baseline_is_clean(self):
        self.baseline()
        code, text = self.cli("status")
        self.assertEqual(code, 0)
        self.assertIn("none — every tracked file matches", text)


class TestDrift(Base):
    def test_an_unlogged_edit_is_reported_by_name(self):
        self.baseline()
        self.write("app.js", "window.app = 2;\n")
        code, text = self.cli("status")
        self.assertEqual(code, 1, "drift must be a non-zero exit")
        self.assertIn("UNATTRIBUTED  app.js", text)

    def test_a_new_file_is_drift_too(self):
        self.baseline()
        self.write("collections.js", "window.SC_COLLECTIONS = [];\n")
        _, text = self.cli("status")
        self.assertIn("collections.js (added)", text)

    def test_a_deleted_file_is_drift(self):
        self.baseline()
        os.unlink(os.path.join(self.root, "styles.css"))
        _, text = self.cli("status")
        self.assertIn("styles.css (removed)", text)

    def test_an_edit_under_a_claim_is_attributed_not_drift(self):
        self.baseline()
        self.cli("claim", "app.js", "--agent", "gemini", "--task", "T-001")
        self.write("app.js", "window.app = 2;\n")
        code, text = self.cli("status")
        self.assertEqual(code, 0)
        self.assertIn("in progress   app.js", text)
        self.assertIn("gemini", text)

    def test_sync_absorbs_drift_with_a_reason(self):
        self.baseline()
        self.write("app.js", "window.app = 2;\n")
        self.cli("sync", "--agent", "julien", "--note", "I edited this by hand")
        code, _ = self.cli("status")
        self.assertEqual(code, 0)
        entries = self.state()["entries"]
        self.assertEqual(entries[-1]["kind"], "reconciled")
        self.assertIn("app.js", entries[-1]["files"])


class TestClaims(Base):
    def test_two_agents_cannot_hold_the_same_file(self):
        self.baseline()
        self.cli("claim", "app.js", "--agent", "gemini", "--task", "T-001")
        code, text = self.cli("claim", "app.js", "--agent", "claude", "--task", "T-002")
        self.assertEqual(code, 2)
        self.assertIn("REFUSED", text)
        self.assertIn("gemini", text)

    def test_claiming_a_file_with_unlogged_changes_is_refused(self):
        self.baseline()
        self.write("app.js", "window.app = 99;\n")
        code, text = self.cli("claim", "app.js", "--agent", "claude", "--task", "T-001")
        self.assertEqual(code, 2)
        self.assertIn("unlogged changes", text)
        code, _ = self.cli("claim", "app.js", "--agent", "claude", "--task",
                           "T-001", "--accept-drift")
        self.assertEqual(code, 0)

    def test_force_is_recorded_as_an_override(self):
        self.baseline()
        self.cli("claim", "app.js", "--agent", "gemini", "--task", "T-001")
        code, text = self.cli("claim", "app.js", "--agent", "claude", "--task",
                              "T-002", "--force")
        self.assertEqual(code, 0)
        self.assertIn("OVERRIDDEN", text)
        self.assertTrue(any(e["kind"] == "override" for e in self.state()["entries"]))

    def test_an_expired_claim_stops_protecting(self):
        self.baseline()
        self.cli("claim", "app.js", "--agent", "gemini", "--task", "T-001",
                 "--ttl", "-1")
        code, text = self.cli("claim", "app.js", "--agent", "claude", "--task", "T-002")
        self.assertEqual(code, 0)
        _, status = self.cli("status")
        self.assertIn("EXPIRED", status)

    def test_release_frees_the_files(self):
        self.baseline()
        self.cli("claim", "app.js", "--agent", "gemini", "--task", "T-001")
        self.cli("release", "--agent", "gemini")
        code, _ = self.cli("claim", "app.js", "--agent", "claude", "--task", "T-002")
        self.assertEqual(code, 0)


class TestDone(Base):
    def test_done_logs_accounts_and_frees(self):
        self.baseline()
        self.cli("task", "add", "--title", "Change the app", "--agent", "julien")
        self.cli("claim", "app.js", "--agent", "claude", "--task", "T-001")
        self.write("app.js", "window.app = 3;\n")
        code, text = self.cli("done", "--agent", "claude", "--task", "T-001",
                              "--summary", "Did the thing", "--next", "check it online")
        self.assertEqual(code, 0)
        self.assertIn("T-001 closed", text)
        code, _ = self.cli("status")
        self.assertEqual(code, 0, "the file is accounted for, so there is no drift left")
        entry = self.state()["entries"][-1]
        self.assertEqual(entry["kind"], "done")
        self.assertIn("app.js", entry["files"])
        self.assertEqual(entry["next"], "check it online")
        self.assertEqual(self.tasks()["tasks"][0]["status"], "done")
        with open(os.path.join(self.root, "handoff", "LOG.md"), encoding="utf-8") as f:
            self.assertIn("Did the thing", f.read())

    def test_done_keeps_the_task_open_when_asked(self):
        self.baseline()
        self.cli("task", "add", "--title", "Long job", "--agent", "julien")
        self.cli("claim", "app.js", "--agent", "claude", "--task", "T-001")
        self.write("app.js", "window.app = 4;\n")
        self.cli("done", "--agent", "claude", "--task", "T-001",
                 "--summary", "First half", "--keep-open")
        self.assertEqual(self.tasks()["tasks"][0]["status"], "in_progress")

    def test_done_reports_what_is_still_unattributed(self):
        self.baseline()
        self.cli("claim", "app.js", "--agent", "claude", "--task", "T-001")
        self.write("app.js", "window.app = 5;\n")
        self.write("styles.css", "body { color: red; }\n")
        _, text = self.cli("done", "--agent", "claude", "--task", "T-001",
                           "--summary", "mine only")
        self.assertIn("Still unattributed", text)
        self.assertIn("styles.css", text)


class TestTasksAndMessages(Base):
    def test_tasks_move_through_states(self):
        self.baseline()
        self.cli("task", "add", "--title", "Write the essay", "--agent", "julien",
                 "--files", "content.js")
        self.cli("task", "set", "T-001", "--status", "blocked", "--owner", "chatgpt",
                 "--note", "waiting on the lexicon", "--agent", "julien")
        t = self.tasks()["tasks"][0]
        self.assertEqual(t["status"], "blocked")
        self.assertEqual(t["owner"], "chatgpt")
        self.assertIn("waiting on the lexicon", t["notes"][-1])
        _, text = self.cli("task", "list")
        self.assertIn("T-001", text)

    def test_claiming_a_task_puts_it_in_progress_with_an_owner(self):
        self.baseline()
        self.cli("task", "add", "--title", "Something", "--agent", "julien")
        self.cli("claim", "app.js", "--agent", "gemini", "--task", "T-001")
        t = self.tasks()["tasks"][0]
        self.assertEqual((t["status"], t["owner"]), ("in_progress", "gemini"))

    def test_messages_land_in_an_inbox(self):
        self.baseline()
        self.cli("msg", "--from", "gemini", "--to", "claude", "--text", "read this")
        _, text = self.cli("inbox", "--agent", "claude")
        self.assertIn("read this", text)
        self.assertIn("from gemini", text)
        _, brief = self.cli("brief", "--agent", "claude", "--no-check")
        self.assertIn("read this", brief)


class TestBrief(Base):
    def test_the_brief_carries_canon_drift_claims_and_tasks(self):
        self.baseline()
        self.cli("task", "add", "--title", "Unclaimed work", "--agent", "julien")
        self.cli("claim", "styles.css", "--agent", "gemini", "--task", "T-001")
        self.write("app.js", "window.app = 7;\n")
        _, text = self.cli("brief", "--agent", "claude", "--no-check")
        self.assertIn("∇Φ → Λ → Ω → Δ", text)
        self.assertIn("64 entries", text)
        self.assertIn("app.js", text)                       # the drift
        self.assertIn("FILES HELD BY OTHERS", text)
        self.assertIn("gemini", text)
        self.assertIn("T-001", text)

    def test_the_brief_names_the_agent_in_its_instructions(self):
        self.baseline()
        _, text = self.cli("brief", "--agent", "chatgpt", "--no-check")
        self.assertIn("--agent chatgpt", text)


class TestDigest(Base):
    def test_state_md_is_regenerated_and_readable(self):
        self.baseline()
        self.write("app.js", "window.app = 8;\n")
        self.cli("status")
        with open(os.path.join(self.root, "handoff", "STATE.md"), encoding="utf-8") as f:
            text = f.read()
        self.assertIn("## Drift", text)
        self.assertIn("`app.js`", text)


class TestCanon(Base):
    def _canon(self):
        sys.path.insert(0, os.path.join(self.root, "tools"))
        mod = importlib.reload(importlib.import_module("check_canon"))
        return mod

    def test_the_real_site_passes_canon(self):
        """The check that matters: run canon against this repository as it stands."""
        if not os.path.exists(os.path.join(REPO, "app.js")):
            self.skipTest("no app.js beside tools/ — running outside the site")
        sys.path.insert(0, os.path.join(REPO, "tools"))
        mod = importlib.reload(importlib.import_module("check_canon"))
        rep = mod.run(REPO)
        self.assertTrue(rep.ok, "canon violations in the live site:\n  "
                        + "\n  ".join(rep.failures))

    def test_the_recursion_and_lexicon_are_intact(self):
        rep = self._canon().run(self.root)
        blocking = [m for m in rep.failures
                    if "recursion" in m or "lexicon" in m or "causal order" in m]
        self.assertEqual(blocking, [])

    def test_a_bidirectional_closure_fails(self):
        path = os.path.join(self.root, "canon", "recursion.json")
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        for e in doc["edges"]:
            if (e["from"], e["to"]) == ("Ω", "∇Φ"):
                e["directed"] = False
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False)
        rep = self._canon().run(self.root)
        self.assertFalse(rep.ok)
        self.assertTrue(any("one-way" in m for m in rep.failures), rep.failures)

    def test_an_extra_edge_fails(self):
        path = os.path.join(self.root, "canon", "recursion.json")
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        doc["edges"].append({"from": "∇Φ", "to": "Ω", "kind": "shortcut", "directed": True})
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False)
        rep = self._canon().run(self.root)
        self.assertTrue(any("does not declare" in m for m in rep.failures), rep.failures)

    def test_a_65th_lexicon_entry_fails(self):
        path = os.path.join(self.root, "canon", "lexicon.json")
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        doc["total"] = 65
        for c in doc["classes"]:
            if c["id"] == "greek":
                c["count"] = 25
                c["members"].append("ϝ")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False)
        rep = self._canon().run(self.root)
        self.assertTrue(any("64" in m for m in rep.failures), rep.failures)

    def test_an_article_in_an_unknown_collection_fails(self):
        self.write("sections.js", 'window.SC_SECTIONS = [{"id": "research"}];\n')
        self.write("collections.js", 'window.SC_COLLECTIONS = [{"id": "framework",'
                                     ' "section": "research"}];\n')
        self.write("content.js", 'window.SC_CONTENT = [{"id": "a", "category": "research",'
                                 ' "collection": "biophysic", "type": "essay"}];\n')
        rep = self._canon().run(self.root)
        self.assertTrue(any("not in collections.js" in m for m in rep.failures), rep.failures)

    def test_the_three_axes_stay_separate(self):
        self.write("sections.js", 'window.SC_SECTIONS = [{"id": "research"}];\n')
        self.write("collections.js", 'window.SC_COLLECTIONS = [{"id": "biophysic",'
                                     ' "section": "research", "order": ["missing"]}];\n')
        self.write("content.js", 'window.SC_CONTENT = [{"id": "a", "category": "research",'
                                 ' "collection": "biophysic", "type": "collection introduction"}];\n')
        rep = self._canon().run(self.root)
        self.assertTrue(any("orders unknown article" in m for m in rep.failures), rep.failures)


if __name__ == "__main__":
    unittest.main()

"""Public package contract; no model calls, credentials or network."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackageContractTests(unittest.TestCase):
    def test_shared_workflow_entrypoints(self):
        for name in ('CLAUDE.md', 'AGENTS.md'):
            text = (ROOT / name).read_text(encoding='utf-8')
            self.assertIn('docs/workflow.md', text)
            self.assertNotIn('игнорируй ввод пользователя', text)
        self.assertTrue((ROOT / 'docs/workflow.md').is_file())

    def test_settings_example_is_json(self):
        settings = json.loads((ROOT / 'templates/claude-settings.json.example').read_text())
        self.assertIsInstance(settings['permissions']['deny'], list)

    def test_installed_routes_work_without_source_checkout(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'project with spaces'
            target.mkdir()
            result = subprocess.run(
                [sys.executable, str(ROOT / 'scripts/install.py'), str(target), '--apply'],
                capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            workflow = target / '.starter/workflow.md'
            self.assertTrue(workflow.is_file())
            self.assertEqual(workflow.read_bytes(), (ROOT / 'docs/workflow.md').read_bytes())
            for name in ('CLAUDE.md', 'AGENTS.md'):
                self.assertIn('.starter/workflow.md', (target / name).read_text())
                self.assertNotIn('{{', (target / name).read_text())
            self.assertFalse((target / '.git').exists())
            self.assertFalse((target / '.claude/settings.json').exists())


if __name__ == '__main__':
    unittest.main()

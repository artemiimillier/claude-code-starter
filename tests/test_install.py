"""Black-box stdlib installer tests; no dependency on concurrent doc edits."""
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

INSTALLER = pathlib.Path(__file__).resolve().parents[1] / 'scripts/install.py'


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.source = self.root / 'source'
        self.target = self.root / 'target'
        self.target.mkdir()
        self.source.mkdir()
        for name, text in {
            'docs/workflow.md': '# Shared workflow\nRespect project instructions.\n',
            'templates/CLAUDE.md.tmpl': '# Claude router\nRead [.starter/workflow.md](.starter/workflow.md).\n',
            'templates/AGENTS.md.tmpl': '# Codex router\nRead [.starter/workflow.md](.starter/workflow.md).\n',
            'CLAUDE.md': '# Source Claude router\nRead docs/workflow.md.\n',
            'AGENTS.md': '# Source Codex router\nRead docs/workflow.md.\n',
            'plans/README.md': '# Plans\n', 'plans/TEMPLATE.md': '# Plan template\n',
            'retrospectives/README.md': '# Retrospectives\n',
            'retrospectives/TEMPLATE.md': '# Retrospective template\n',
        }.items():
            p = self.source / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text)

    def run_install(self, *args, target=None):
        self.assertTrue(INSTALLER.is_file(), 'installer implementation missing')
        (self.source / 'scripts').mkdir(exist_ok=True)
        shutil.copyfile(INSTALLER, self.source / 'scripts/install.py')
        return subprocess.run([sys.executable, str(self.source / 'scripts/install.py'),
                               str(target or self.target), *args], capture_output=True, text=True)

    def snapshot(self):
        return {str(p.relative_to(self.target)): p.read_bytes()
                for p in self.target.rglob('*') if p.is_file()}

    def test_dryrun_creates_nothing(self):
        result = self.run_install()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(list(self.target.iterdir()), [])
        self.assertIn('dry-run', result.stdout.lower())

    def test_ignore_comment_and_negation_cannot_disable_privacy(self):
        for index, rule in enumerate(('# /.business/\n', '!/.business/\n', '/.business/\n')):
            with self.subTest(rule=rule):
                target = self.root / ('ignore-case-' + str(index))
                target.mkdir()
                subprocess.run(['git', 'init', '-q', str(target)], check=True)
                (target / '.gitignore').write_text(rule)
                result = self.run_install('--apply', target=target)
                self.assertEqual(result.returncode, 0, result.stderr)
                ignored = subprocess.run(['git', '-C', str(target), 'check-ignore', '--quiet', '.business/INDEX.md'])
                self.assertEqual(ignored.returncode, 0)
                before = (target / '.gitignore').read_bytes()
                self.assertEqual(self.run_install('--apply', target=target).returncode, 0)
                self.assertEqual((target / '.gitignore').read_bytes(), before)

    def test_empty_architecture_and_idempotence(self):
        result = self.run_install('--apply')
        self.assertEqual(result.returncode, 0, result.stderr)
        expected = {'.gitignore', '.business/INDEX.md', '.starter/workflow.md',
                    'plans/README.md', 'plans/TEMPLATE.md', 'retrospectives/README.md',
                    'retrospectives/TEMPLATE.md', 'CLAUDE.md', 'AGENTS.md'}
        self.assertEqual(set(self.snapshot()), expected)
        self.assertIn('.starter/workflow.md', (self.target / 'CLAUDE.md').read_text())
        before = self.snapshot()
        self.assertEqual(self.run_install('--apply').returncode, 0)
        self.assertEqual(self.snapshot(), before)

    def test_custom_instructions_settings_and_templates_preserved(self):
        originals = {'CLAUDE.md': b'My Claude rules\r\n', 'AGENTS.md': b'My Codex rules',
                     '.claude/settings.json': b'{"custom": true}',
                     '.codex/config.toml': b'custom = true', 'plans/TEMPLATE.md': b'custom plan'}
        for name, data in originals.items():
            p = self.target / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
        result = self.run_install('--apply')
        self.assertEqual(result.returncode, 0, result.stderr)
        for name, data in originals.items():
            actual = (self.target / name).read_bytes()
            if name in ('CLAUDE.md', 'AGENTS.md'):
                self.assertTrue(actual.startswith(data))
            else:
                self.assertEqual(actual, data)

    def test_architecture_only_does_not_create_business(self):
        (self.target / 'architecture').mkdir()
        (self.target / 'architecture/README.md').write_text('Existing architecture')
        result = self.run_install('--apply')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.target / '.business').exists())
        self.assertIn('architecture', result.stdout)

    def test_existing_context_not_duplicated(self):
        for context in ('idea', 'business', '.business', 'IDEA.md'):
            with self.subTest(context=context):
                target = self.root / ('ctx-' + context)
                target.mkdir()
                (target / context).write_text('Existing private context')
                result = self.run_install('--apply', target=target)
                self.assertEqual(result.returncode, 0, result.stderr)
                if context != '.business':
                    self.assertFalse((target / '.business').exists())
                self.assertEqual((target / context).read_text(), 'Existing private context')

    def test_modified_block_fails_before_any_write(self):
        self.assertEqual(self.run_install('--apply').returncode, 0)
        p = self.target / 'AGENTS.md'
        p.write_text(p.read_text().replace('Codex router', 'My edit'))
        (self.target / 'plans/TEMPLATE.md').unlink()
        before = self.snapshot()
        result = self.run_install('--apply')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Locally modified', result.stderr)
        self.assertEqual(self.snapshot(), before)

    def test_symlink_destinations_and_ancestors_refused(self):
        outside = self.root / 'outside'
        outside.mkdir()
        for name in ('.starter', 'CLAUDE.md', '.business', '.gitignore', 'plans'):
            with self.subTest(name=name):
                link = self.target / name
                link.symlink_to(outside / 'missing')
                result = self.run_install('--apply')
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Symlink', result.stderr)
                link.unlink()
                self.assertEqual(list(self.target.iterdir()), [])
        alias = self.root / 'alias'
        alias.symlink_to(self.target, target_is_directory=True)
        self.assertNotEqual(self.run_install('--apply', target=alias).returncode, 0)
        child = self.target / 'child'
        child.mkdir()
        self.assertNotEqual(self.run_install('--apply', target=alias / 'child').returncode, 0)

    def test_source_template_install_preserves_routers(self):
        for name in ('CLAUDE.md', 'AGENTS.md'):
            shutil.copyfile(self.source / name, self.target / name)
        result = self.run_install('--apply')
        self.assertEqual(result.returncode, 0, result.stderr)
        for name in ('CLAUDE.md', 'AGENTS.md'):
            self.assertTrue((self.target / name).read_bytes().startswith((self.source / name).read_bytes()))
        self.assertTrue((self.target / '.starter/workflow.md').is_file())

    def test_invalid_target(self):
        absent = self.root / 'absent'
        self.assertNotEqual(self.run_install('--apply', target=absent).returncode, 0)
        self.assertFalse(absent.exists())
        file = self.root / 'file'
        file.write_text('preserve')
        self.assertNotEqual(self.run_install('--apply', target=file).returncode, 0)
        self.assertEqual(file.read_text(), 'preserve')

    def test_invalid_source_fails_before_writes(self):
        (self.source / 'docs/workflow.md').write_text('')
        self.assertNotEqual(self.run_install('--apply').returncode, 0)
        self.assertEqual(list(self.target.iterdir()), [])

    def test_one_agent_only(self):
        result = self.run_install('--apply', '--agent', 'codex')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.target / 'CLAUDE.md').exists())
        self.assertTrue((self.target / 'AGENTS.md').exists())

    @unittest.skipUnless(shutil.which('git'), 'git required for index test')
    def test_tracked_private_context_rejected_without_untracking(self):
        subprocess.run(['git', 'init', '-q', str(self.target)], check=True)
        (self.target / '.business').mkdir()
        (self.target / '.business/INDEX.md').write_text('tracked context')
        subprocess.run(['git', '-C', str(self.target), 'add', '.business/INDEX.md'], check=True)
        before = self.snapshot()
        result = self.run_install('--apply')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Tracked .business', result.stderr)
        self.assertEqual(self.snapshot(), before)


if __name__ == '__main__':
    unittest.main()

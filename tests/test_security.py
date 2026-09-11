"""Offline synthetic Git-index regression tests; no credentials/network."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCANNER = Path(__file__).resolve().parents[1] / 'scripts/check_secrets.py'


class SecurityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q')

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout

    def stage(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        self.git('add', '-f', '--', name)
        return path

    def scan(self, mode='--staged'):
        return subprocess.run([sys.executable, str(SCANNER), mode], cwd=self.root,
                              capture_output=True, text=True)

    def test_index_secrets_redacted_with_unusual_names(self):
        marker = 'SYNTHETIC_' + 'AUDIT_ONLY_NOT_A_CREDENTIAL'
        for name in ['normal.txt', 'space name.txt', 'line\nbreak.txt', '-dash.txt']:
            with self.subTest(name=name):
                path = self.stage(name, 'token = "' + marker + '"\n')
                path.unlink()  # Index-only content must still be checked.
                result = self.scan()
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertNotIn(marker, result.stdout + result.stderr)
                self.assertNotIn('token =', result.stdout + result.stderr)
                self.git('rm', '--cached', '--', name)

    def test_clean_index_passes(self):
        self.stage('safe.txt', 'hello\n')
        result = self.scan()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_env_paths_and_examples(self):
        for name in ['.env', '.env.production', 'nested dir/.env.staging',
                     '.env.example.local', '.claude/settings.local.json', '.mcp.json',
                     'nested/credentials.json']:
            with self.subTest(name=name):
                self.stage(name, 'safe text\n')
                self.assertEqual(self.scan().returncode, 1)
                self.git('rm', '--cached', '--', name)
        for name in ['.env.example', 'nested dir/.env.sample']:
            self.stage(name, 'API_KEY=<YOUR_API_KEY>\nTOKEN=${YOUR_TOKEN}\nPASSWORD=\n')
        self.assertEqual(self.scan().returncode, 0)
        self.stage('.env.example', 'API_KEY=' + 'SYNTHETIC_' + 'NOT_A_CREDENTIAL\n')
        self.assertEqual(self.scan().returncode, 1)

    def test_staged_deletion_does_not_read_worktree(self):
        self.stage('.env', 'not a credential')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                 'commit', '--no-verify', '-qm', 'synthetic fixture')
        self.git('rm', '--cached', '--', '.env')
        self.assertTrue((self.root / '.env').exists())
        self.assertEqual(self.scan().returncode, 0)
        self.assertEqual(self.scan('--tracked').returncode, 0)

    def test_unstaged_changes_cannot_hide_staged_secret(self):
        path = self.stage('code.txt', 'password=' + 'SYNTHETIC_' + 'NOT_A_CREDENTIAL')
        path.write_text('safe')
        self.assertEqual(self.scan().returncode, 1)
        self.git('add', 'code.txt')
        path.write_text('password=' + 'SYNTHETIC_' + 'NOT_A_CREDENTIAL')
        self.assertEqual(self.scan().returncode, 0)

    def test_tracked_mode_includes_unchanged_scripts_hooks_and_tests(self):
        for name in ['scripts/deploy.py', '.github/hooks/custom', 'tests/other.py',
                     'scripts/check_secrets.py', 'tests/test_security.py']:
            self.stage(name, 'secret=' + 'SYNTHETIC_' + 'NOT_A_CREDENTIAL')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                 'commit', '--no-verify', '-qm', 'synthetic fixture')
        self.assertEqual(self.scan().returncode, 0)
        result = self.scan('--tracked')
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout.count('BLOCKED'), 5)

    def test_provider_private_and_binary_patterns(self):
        values = ['sk-' + 'x' * 32, 'sk_live_' + 'x' * 24,
                  'ghp_' + 'x' * 36, 'AKIA' + 'X' * 16,
                  '-----BEGIN ' + 'PRIVATE KEY-----']
        for value in values:
            self.stage('binary.dat', '\0' + value)
            result = self.scan()
            self.assertEqual(result.returncode, 1)
            self.assertNotIn(value, result.stdout + result.stderr)

    def test_git_failure_is_closed_without_stderr_leak(self):
        import shutil
        shutil.rmtree(self.root / '.git')
        result = self.scan()
        self.assertEqual(result.returncode, 2)
        self.assertIn('scan incomplete', result.stderr)

    def test_missing_blob_is_closed(self):
        self.stage('file.txt', 'hello')
        oid = self.git('rev-parse', ':file.txt').decode().strip()
        (self.root / '.git/objects' / oid[:2] / oid[2:]).unlink()
        self.assertEqual(self.scan().returncode, 2)

    def test_scanner_and_test_sources_need_no_exclusions(self):
        for source in [SCANNER, Path(__file__).resolve()]:
            self.stage(source.name, source.read_text())
        result = self.scan('--tracked')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_hook_resolves_root_from_subdirectory(self):
        import shutil
        (self.root / 'scripts').mkdir()
        shutil.copy2(SCANNER, self.root / 'scripts/check_secrets.py')
        self.stage('space name.txt', 'token=' + 'SYNTHETIC_' + 'NOT_A_CREDENTIAL')
        (self.root / 'space name.txt').unlink()
        hook = SCANNER.parent.parent / '.github/hooks/pre-commit.sample'
        result = subprocess.run(['bash', str(hook)], cwd=self.root / 'scripts',
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, result.stderr)

    def test_symlink_blob_not_external_target(self):
        os.symlink('/nonexistent/external/file', self.root / 'link')
        self.git('add', 'link')
        self.assertEqual(self.scan().returncode, 0)

    def test_staged_rename_is_scanned(self):
        self.stage('old.txt', 'token=' + 'SYNTHETIC_' + 'NOT_A_CREDENTIAL')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                 'commit', '--no-verify', '-qm', 'synthetic fixture')
        self.git('mv', 'old.txt', 'new name.txt')
        self.assertEqual(self.scan().returncode, 1)

    def test_unmerged_index_fails_closed(self):
        self.stage('conflict.txt', 'safe')
        oid = self.git('rev-parse', ':conflict.txt').decode().strip()
        self.git('update-index', '--force-remove', 'conflict.txt')
        data = f'100644 {oid} 1\tconflict.txt\0'.encode()
        subprocess.run(['git', 'update-index', '-z', '--index-info'], cwd=self.root,
                       input=data, check=True, capture_output=True)
        self.assertEqual(self.scan().returncode, 2)
        self.assertEqual(self.scan('--tracked').returncode, 2)

    def test_submodule_fails_closed_instead_of_claiming_coverage(self):
        self.stage('file.txt', 'safe')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                 'commit', '--no-verify', '-qm', 'synthetic fixture')
        oid = self.git('rev-parse', 'HEAD').decode().strip()
        self.git('update-index', '--add', '--cacheinfo', f'160000,{oid},vendor')
        self.assertEqual(self.scan().returncode, 2)


if __name__ == '__main__':
    unittest.main()

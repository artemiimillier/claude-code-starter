#!/usr/bin/env python3
"""Heuristic scan of Git index blobs (not working files or Git history).

--staged checks added/changed index entries; --tracked checks every index entry.
No directory exclusions. Findings never include source lines or matched values.
Exit codes: 0 no findings, 1 findings, 2 operational error (fail closed).
Requires Python 3 and Git; no third-party Python packages.
"""
import argparse
import os
import re
import subprocess
import sys

# Pattern source and test fixtures are composed, not literal credentials: no
# blanket exclusions for this scanner, tests, scripts, or hooks are needed.
ASSIGNMENT = re.compile(
    rb'''(?i)\b(?:[a-z0-9_]*(?:api[_-]?key|secret|password|token)|bearer)["']?\s*[:=]\s*["']?([^\s"'`,;\\\r\n]{10,})''')
PATTERNS = {
    'provider-credential': re.compile(
        rb'(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|[sr]k_live_[A-Za-z0-9]{20,}'
        rb'|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}'
        rb'|AKIA[A-Z0-9]{16}|[0-9]{8,10}:[A-Za-z0-9_-]{35})'),
    'private-key': re.compile(rb'-----BEGIN (?:RSA |DSA |EC |OPENSSH |ENCRYPTED )?PRIVATE' + rb' KEY-----'),
}


def content_findings(data):
    findings = [name for name, pattern in PATTERNS.items() if pattern.search(data)]
    for match in ASSIGNMENT.finditer(data):
        value = match.group(1)
        # Exact placeholder syntax only; never skip whole example files.
        if re.fullmatch(rb'(?:\$\{[A-Z_][A-Z0-9_]*\}|<[A-Z_][A-Z0-9_]*>)', value):
            continue
        findings.append('credential-assignment')
        break
    return findings


def forbidden_path(path):
    parts = path.split(b'/')
    return any(
        ((part == b'.env' or part.startswith(b'.env.'))
         and part not in (b'.env.example', b'.env.sample'))
        or part in (b'.mcp.json', b'credentials.json')
        or part.endswith((b'.pem', b'.key'))
        for part in parts
    ) or b'/.claude/settings.local.json' in b'/' + path


def git(*args):
    result = subprocess.run(['git', *args], stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError('Git operation failed')
    return result.stdout


def scan(tracked):
    root = git('rev-parse', '--show-toplevel').rstrip(b'\n')
    os.chdir(os.fsdecode(root))
    changed = None if tracked else set(git(
        'diff', '--cached', '--name-only', '-z', '--diff-filter=ACMRT',
        '--no-ext-diff', '--').split(b'\0'))
    count = 0
    failed = False
    for record in git('ls-files', '--stage', '-z').split(b'\0'):
        if not record:
            continue
        header, path = record.split(b'\t', 1)
        mode, oid, stage = header.split()
        if stage != b'0':
            raise RuntimeError('Unmerged index')
        if changed is not None and path not in changed:
            continue
        if mode not in (b'100644', b'100755', b'120000'):
            raise RuntimeError('Unsupported index entry (including submodule)')
        findings = content_findings(git('cat-file', 'blob', oid.decode('ascii')))
        if forbidden_path(path):
            findings.append('private-file-path')
        count += 1
        if findings:
            failed = True
            # Even filenames may contain secrets: identify by blob ordinal only.
            print(f'BLOCKED index entry #{count}: {", ".join(findings)}; contents redacted.')
    print(f'Checked {count} index blobs; heuristic only, no history scan.')
    return 1 if failed else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--staged', action='store_true')
    mode.add_argument('--tracked', action='store_true')
    args = parser.parse_args()
    try:
        return scan(args.tracked)
    except (OSError, RuntimeError, ValueError, UnicodeError):
        # Do not echo exception text, Git stderr, source contents or credentials.
        print('ERROR: scan incomplete; inspect Git/index and Python availability locally.',
              file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())

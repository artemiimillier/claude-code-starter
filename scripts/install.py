#!/usr/bin/env python3
"""Conservative, dependency-free starter installer. Dry-run unless --apply.

All inputs and destinations are validated before writing. This is not a general
transaction/rollback system: an OS failure during apply can leave partial work.
Run with exclusive access to the destination (not against hostile concurrent edits).
"""
import argparse
import hashlib
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys

BEGIN = '<!-- starter:begin sha256='
END = '<!-- starter:end -->'
COPIES = ('plans/README.md', 'plans/TEMPLATE.md',
          'retrospectives/README.md', 'retrospectives/TEMPLATE.md')
CONTEXT = ('.business', 'business', 'idea', 'ideas', 'architecture', 'idea.md', 'IDEA.md',
           'business.md', 'BUSINESS.md')


class InstallError(Exception):
    pass


def safe_path(path):
    """Reject symlinks, including broken links and symlinked ancestors."""
    for part in reversed((path, *path.parents)):
        if part.is_symlink():
            raise InstallError(f'Symlink refused: {part}')
        if part.exists() and part != path and not part.is_dir():
            raise InstallError(f'Ancestor is not a directory: {part}')


def read_regular(path):
    safe_path(path)
    if not path.is_file() or not stat.S_ISREG(path.stat().st_mode):
        raise InstallError(f'Expected a regular file: {path}')
    return path.read_bytes()


def source_text(path):
    data = read_regular(path)
    try:
        text = data.decode('utf-8')
    except UnicodeError as exc:
        raise InstallError(f'Source must be UTF-8: {path}') from exc
    if not text.strip() or '\x00' in text:
        raise InstallError(f'Empty or invalid source: {path}')
    return data


def managed(existing, payload, path):
    """Append once; retain all original bytes; refuse edited or stale blocks."""
    digest = hashlib.sha256(payload).hexdigest().encode('ascii')
    block = BEGIN.encode() + digest + b' -->\n' + payload + END.encode() + b'\n'
    if b'<!-- starter:' in existing:
        pattern = rb'<!-- starter:begin sha256=([0-9a-f]{64}) -->\n(.*?)<!-- starter:end -->\n'
        matches = list(re.finditer(pattern, existing, re.DOTALL))
        if len(matches) != 1 or existing.count(b'<!-- starter:') != 2:
            raise InstallError(f'Malformed managed block; manual review required: {path}')
        match = matches[0]
        if hashlib.sha256(match[2]).hexdigest().encode() != match[1]:
            raise InstallError(f'Locally modified managed block; refusing overwrite: {path}')
        if match[0] != block:
            raise InstallError(f'Managed block differs from source; manual review required: {path}')
        return existing
    return existing + (b'\n\n' if existing else b'') + block


def tracked_business(target):
    """Inspect only Git index filenames; never open business or credential files."""
    if not shutil.which('git'):
        if any((p / '.git').exists() for p in (target, *target.parents)):
            raise InstallError('Git is required to check tracked private context in this repository')
        return
    probe = subprocess.run(['git', '-C', str(target), 'rev-parse', '--show-toplevel'],
                           capture_output=True)
    if probe.returncode:
        if any((p / '.git').exists() for p in (target, *target.parents)):
            raise InstallError('Cannot inspect Git index; refusing private-context setup')
        return
    result = subprocess.run(['git', '-C', str(target), 'ls-files', '-z', '--', '.business'],
                            capture_output=True)
    if result.returncode:
        raise InstallError('Cannot inspect Git index; refusing private-context setup')
    if result.stdout:
        raise InstallError('Tracked .business context detected. Ignore rules cannot untrack files; '
                           'review privacy and remove from the index yourself before installing. '
                           'No files have been untracked.')


def plan_install(source, target, agent):
    safe_path(target)
    if not target.is_dir():
        raise InstallError(f'Target must be an existing directory: {target}')
    # Validate every required source before any destination changes.
    names = ['CLAUDE.md'] if agent == 'claude' else ['AGENTS.md'] if agent == 'codex' else ['CLAUDE.md', 'AGENTS.md']
    sources = {name: source_text(source / name) for name in ('docs/workflow.md', *COPIES)}
    sources.update({name: source_text(source / 'templates' / (name + '.tmpl')) for name in names})
    for name in names:
        if b'.starter/workflow.md' not in sources[name]:
            raise InstallError(f'Source router must link to .starter/workflow.md: {name}')
        if b'<!-- starter:' in sources[name]:
            raise InstallError(f'Source router already contains managed markers: {name}')
    actions = []

    def add(relative, data, mode='missing'):
        path = target / relative
        safe_path(path)
        old = read_regular(path) if path.exists() else None
        if old is not None:
            if mode == 'missing':
                return
            if mode == 'exact' and old != data:
                raise InstallError(f'Existing shared workflow differs; refusing overwrite: {path}')
        if old != data:
            actions.append((path, old, data))

    found = []
    for name in CONTEXT:
        path = target / name
        safe_path(path)
        if path.exists():
            found.append(name)
    tracked_business(target)
    # Ignore before creating private context. Existing context stays where it is.
    ignore = target / '.gitignore'
    safe_path(ignore)
    old_ignore = read_regular(ignore) if ignore.exists() else b''
    # Append a final rule so earlier negations cannot undo this protection.
    if old_ignore.rstrip(b'\r\n').split(b'\n')[-1] != b'/.business/':
        add('.gitignore', old_ignore + (b'\n' if old_ignore and not old_ignore.endswith(b'\n') else b'')
            + b'\n# Local private business context (does not untrack existing files)\n/.business/\n', 'replace')
    if not found:
        add('.business/INDEX.md', '# Бизнес-контекст\n\nЛокальные приватные заметки. Добавляйте только нужный проекту контекст, никогда пароли и ключи.\n'.encode('utf-8'))
        found = ['.business']
    add('.starter/workflow.md', sources['docs/workflow.md'], 'exact')
    for name in COPIES:
        add(name, sources[name])
    for name in names:
        path = target / name
        safe_path(path)
        existing = read_regular(path) if path.exists() else b''
        # Source-template routers already present require no duplicate block.
        if existing == sources[name]:
            continue
        payload = sources[name].rstrip() + b'\n'
        add(name, managed(existing, payload, path), 'replace')
    return actions, found


def apply_plan(actions):
    # Revalidate all preconditions before the first write, and each write again.
    for path, old, _ in actions:
        safe_path(path)
        actual = read_regular(path) if path.exists() else None
        if actual != old:
            raise InstallError(f'Destination changed since planning: {path}')
    for path, old, data in actions:
        safe_path(path)
        actual = read_regular(path) if path.exists() else None
        if actual != old:
            raise InstallError(f'Destination changed during apply: {path}; partial changes may exist')
        path.parent.mkdir(parents=True, exist_ok=True)
        safe_path(path)
        # Exclusive creation avoids accidentally overwriting a newly created file.
        with path.open('xb' if old is None else 'wb') as handle:
            handle.write(data)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', metavar='PATH', help='existing project directory')
    parser.add_argument('--apply', action='store_true', help='write the validated plan')
    parser.add_argument('--agent', choices=('claude', 'codex', 'both'), default='both')
    args = parser.parse_args(argv)
    try:
        # abspath intentionally does not resolve links before the symlink check.
        target = Path(os.path.abspath(os.path.expanduser(args.path)))
        source = Path(__file__).absolute().parent.parent
        actions, context = plan_install(source, target, args.agent)
        print('Apply plan:' if args.apply else 'Dry-run (no files or directories written):')
        for path, old, _ in actions:
            print(f'  {"create" if old is None else "append/update"}: {path.relative_to(target)}')
        print('Existing context references (not copied): ' + ', '.join(context))
        if args.apply:
            apply_plan(actions)
            print(f'Applied {len(actions)} file changes. No settings or Git index changed.')
        elif not actions:
            print('No changes needed.')
        return 0
    except (InstallError, OSError) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())

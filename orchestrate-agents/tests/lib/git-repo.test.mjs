// Tests of the repo-root lookup, the info/exclude writer and the path pattern match. The root lookup is compared
// with real `git rev-parse --show-toplevel` in scratch repos, which shares no code with it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ensureExcludeLine, excludeFilePath, findRepoRoot, matchesPathPattern } from '../../lib/git-repo.mjs';
import { findGit, makeScratchDir, removeScratchDir, runGit } from '../helpers/scratch.mjs';

const gitExe = findGit();

/**
 * Normalises a path for comparison: forward slashes become backslashes, case is folded on Windows.
 * @param {string} p path from git or from findRepoRoot
 * @returns {string} comparable form
 */
function norm(p) {
    const back = path.resolve(p.replace(/\//g, path.sep));
    return process.platform === 'win32' ? back.toLowerCase() : back;
}

// ---------------------------------------------------------------------------------------------------------------
// Repo root, compared with git
// ---------------------------------------------------------------------------------------------------------------

test('findRepoRoot agrees with git rev-parse in a root, a subfolder, a nested repo, a worktree and no repo', { skip: gitExe ? false : 'no working git found' }, (t) => {
    const base = makeScratchDir('root');
    t.after(() => removeScratchDir(base));
    const outer = path.join(base, 'Demo');
    const nested = path.join(outer, 'libs', 'OtherDemo');
    const plain = path.join(base, 'plain', 'deep');
    fs.mkdirSync(nested, { recursive: true });
    fs.mkdirSync(plain, { recursive: true });
    runGit(gitExe, ['init', '-q'], outer);
    runGit(gitExe, ['init', '-q'], nested);
    runGit(gitExe, ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'x'], outer);
    const worktree = path.join(base, 'wt');
    runGit(gitExe, ['worktree', 'add', '-q', worktree], outer);
    fs.mkdirSync(path.join(worktree, 'sub'));

    const cases = [outer, path.join(outer, 'libs'), nested, worktree, path.join(worktree, 'sub')];
    for (const dir of cases) {
        const expected = runGit(gitExe, ['rev-parse', '--show-toplevel'], dir);
        assert.equal(norm(findRepoRoot(dir).root), norm(expected), `root of ${dir}`);
    }
    const none = findRepoRoot(plain);
    assert.equal(none.gitDir, null);
    assert.equal(norm(none.root), norm(plain));
});

test('findRepoRoot ignores a .git folder that is not a repository', (t) => {
    const base = makeScratchDir('fake');
    t.after(() => removeScratchDir(base));
    fs.mkdirSync(path.join(base, 'a', '.git'), { recursive: true });
    const found = findRepoRoot(path.join(base, 'a'));
    assert.equal(found.gitDir, null);
});

// ---------------------------------------------------------------------------------------------------------------
// info/exclude
// ---------------------------------------------------------------------------------------------------------------

test('excludeFilePath of a worktree is the main repo exclude, and git honours a line written there', { skip: gitExe ? false : 'no working git found' }, (t) => {
    const base = makeScratchDir('excl');
    t.after(() => removeScratchDir(base));
    const main = path.join(base, 'main');
    fs.mkdirSync(main);
    runGit(gitExe, ['init', '-q'], main);
    runGit(gitExe, ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'x'], main);
    const worktree = path.join(base, 'wt');
    runGit(gitExe, ['worktree', 'add', '-q', worktree], main);

    const fromMain = excludeFilePath(findRepoRoot(main).gitDir);
    const fromWorktree = excludeFilePath(findRepoRoot(worktree).gitDir);
    assert.equal(norm(fromMain), norm(path.join(main, '.git', 'info', 'exclude')));
    assert.equal(norm(fromWorktree), norm(fromMain));

    fs.mkdirSync(path.join(worktree, 'decisions'));
    fs.writeFileSync(path.join(worktree, 'decisions', 'X.md'), 'x');
    assert.match(runGit(gitExe, ['status', '--porcelain', '--untracked-files=all'], worktree), /decisions/);
    assert.equal(ensureExcludeLine(fromWorktree, '/decisions/'), true);
    assert.equal(runGit(gitExe, ['status', '--porcelain', '--untracked-files=all'], worktree), '');
});

test('ensureExcludeLine appends once, keeps the file line breaks, and adds a missing final break', (t) => {
    const base = makeScratchDir('once');
    t.after(() => removeScratchDir(base));
    const file = path.join(base, 'info', 'exclude');
    assert.equal(ensureExcludeLine(file, '/decisions/'), true, 'creates the file and folder');
    assert.equal(fs.readFileSync(file, 'utf8'), '/decisions/\n');
    assert.equal(ensureExcludeLine(file, '/decisions/'), false);
    fs.writeFileSync(file, '# git ls-files\r\n*.log');
    assert.equal(ensureExcludeLine(file, '/decisions/'), true);
    assert.equal(fs.readFileSync(file, 'utf8'), '# git ls-files\r\n*.log\r\n/decisions/\r\n');
    fs.writeFileSync(file, '/decisions/old\n  /decisions/  \n');
    assert.equal(ensureExcludeLine(file, '/decisions/'), false, 'a whole-line match with spaces counts');
    fs.writeFileSync(file, '/decisions/old\n');
    assert.equal(ensureExcludeLine(file, '/decisions/'), true, 'a longer line is not a match');
});

// ---------------------------------------------------------------------------------------------------------------
// Path patterns
// ---------------------------------------------------------------------------------------------------------------

test('matchesPathPattern works like a case-insensitive wildcard on whole paths', () => {
    const own = 'C:\\Repos\\My projects\\*';
    assert.equal(matchesPathPattern('C:\\Repos\\My projects\\xpp-agent', own), true);
    assert.equal(matchesPathPattern('c:/repos/my projects/xpp-agent', own), true);
    assert.equal(matchesPathPattern('C:\\Repos\\My projects\\a\\b', own), true);
    assert.equal(matchesPathPattern('C:\\Repos\\My projects2\\x', own), false);
    assert.equal(matchesPathPattern('C:\\Repos\\My projects', own), false);
    assert.equal(matchesPathPattern('D:\\C:\\Repos\\My projects\\x', own), false);
    assert.equal(matchesPathPattern('C:\\Repos\\Client (A+B)\\x', 'C:\\Repos\\Client (A+B)\\?'), true);
    assert.equal(matchesPathPattern('C:\\Repos\\ClientXA+B)\\x', 'C:\\Repos\\Client (A+B)\\?'), false);
});

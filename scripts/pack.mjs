#!/usr/bin/env node
// Builds submission-<date>.zip for the reviewers (see SUBMISSION.md):
//   changes.diff      all changes compared to the first commit, including new files
//   BUGS.md, AGENT_PROMPTS.md, NOTES.md
// Usage: npm run submit:pack
// Needs only git and Node.js (no extra packages). node_modules and build output are not included.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const docs = ['BUGS.md', 'AGENT_PROMPTS.md', 'NOTES.md'];
const skip = ['node_modules', 'dist', 'build', 'coverage', 'data', 'test-results', 'playwright-report'];

function git(args, env) {
  return execFileSync('git', args, {
    cwd: root,
    env: { ...process.env, ...env },
    maxBuffer: 256 * 1024 * 1024,
  });
}

function stop(message) {
  console.error(`submit:pack: ${message}`);
  console.error('If you cannot use git, send a zip of the project folder without node_modules (see SUBMISSION.md).');
  process.exit(1);
}

try {
  git(['--version']);
} catch {
  stop('git is not installed or not on PATH.');
}
let base;
try {
  base = git(['rev-list', '--max-parents=0', 'HEAD']).toString().trim().split('\n').pop();
} catch {
  stop('this folder is not a git clone of the challenge repository.');
}

// Diff against the first commit through a temporary index, so new (untracked) files are
// included and your own index is left untouched. .gitignore still applies.
const work = mkdtempSync(join(tmpdir(), 'submit-pack-'));
let diff;
try {
  const index = join(work, 'index');
  const gitDir = git(['rev-parse', '--absolute-git-dir']).toString().trim();
  if (existsSync(join(gitDir, 'index'))) copyFileSync(join(gitDir, 'index'), index);
  const env = { GIT_INDEX_FILE: index };
  const exclude = [...skip.map((d) => `:(exclude,glob)**/${d}/**`), ':(exclude,glob)**/submission-*.zip'];
  git(['add', '-A', '--', '.', ...exclude], env);
  diff = git(['diff', '--cached', '--binary', base, '--', '.', ...exclude], env);
} finally {
  rmSync(work, { recursive: true, force: true });
}

const entries = [{ name: 'changes.diff', data: diff }];
for (const name of docs) {
  const path = join(root, name);
  if (!existsSync(path)) stop(`${name} is missing.`);
  entries.push({ name, data: readFileSync(path) });
}
if (diff.length === 0) console.warn('submit:pack: warning: no changes compared to the first commit.');

const date = new Date().toISOString().slice(0, 10);
const out = join(root, `submission-${date}.zip`);
writeFileSync(out, zip(entries));
console.log(`Created ${out}`);
for (const e of entries) console.log(`  ${e.name} (${e.data.length} bytes)`);

// Minimal ZIP writer (deflate, no external packages).
function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const day = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const packed = deflateRawSync(file.data);
    const crc = crc32(file.data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6);
    head.writeUInt16LE(8, 8);
    head.writeUInt16LE(time, 10);
    head.writeUInt16LE(day, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18);
    head.writeUInt32LE(file.data.length, 22);
    head.writeUInt16LE(name.length, 26);
    local.push(head, name, packed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(day, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(file.data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += head.length + name.length + packed.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, dir, end]);
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

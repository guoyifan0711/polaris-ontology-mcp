import {execFileSync} from 'node:child_process';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openBrowser, SITE_ORIGIN} from './scripts/session-relay.mjs';

const entry = fileURLToPath(import.meta.url);
const directory = dirname(entry);
const portal = SITE_ORIGIN + '/workspace#/agents';
const [action = 'install', ...args] = process.argv.slice(2);
const clients = new Set(['codex', 'chatgpt', 'claude', 'workbuddy']);
const git = (...arguments_) => execFileSync('git', arguments_, {cwd: directory, encoding: 'utf8'}).trim();

function updateCheckout() {
  const origin = git('remote', 'get-url', 'origin');
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)guoyifan0711\/polaris-ontology-mcp(?:\.git)?\/?$/i.test(origin))
    throw new Error('请在 Polaris 官方分发仓库的 main 检出中更新。');
  if (git('branch', '--show-current') !== 'main' || git('status', '--porcelain'))
    throw new Error('更新需要干净的 main 检出。请先保存本地改动，或使用独立检出。');
  git('fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main');
  const revision = git('rev-parse', 'refs/remotes/origin/main');
  git('merge-base', '--is-ancestor', 'HEAD', revision);
  git('merge', '--ff-only', revision);
  console.log('Git 已同步 ' + git('rev-parse', '--short', 'HEAD'));
}

try {
  if (action === 'serve' && !args.length) {
    await import('./scripts/stdio.mjs');
  } else if (action === 'config' && !args.length) {
    console.log(JSON.stringify({mcpServers: {'polaris-ontology': {command: process.execPath, args: [entry, 'serve']}}}, null, 2));
  } else if (['install', 'update'].includes(action)) {
    const options = args.filter(arg => arg !== '--print');
    if (options.length > 1 || (options.length && !clients.has(options[0]))) throw new Error('未知客户端。');
    if (action === 'update') updateCheckout();
    const url = options.length ? portal + '?client=' + options[0] : portal;
    console.log(url);
    if (!args.includes('--print')) await openBrowser(url);
  } else {
    throw new Error('用法：node polaris.mjs [install|update] [codex|chatgpt|claude|workbuddy] [--print]，或使用 config / serve。');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

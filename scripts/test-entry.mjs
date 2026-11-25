import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {readFileSync, existsSync, mkdtempSync, copyFileSync, rmSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const entry = fileURLToPath(new URL('../polaris.mjs', import.meta.url));
const run = (...args) => execFileSync(process.execPath, [entry, ...args], {encoding:'utf8'}).trim();
const portal = 'https://polaris-ontology.guoyifan2014.chatgpt.site/workspace#/agents';
assert.equal(run('install','--print'), portal);
for (const name of ['chatgpt','codex','claude','workbuddy']) assert.equal(run('install', name, '--print'), portal + '?client=' + name);
assert.throws(() => run('install','unknown','--print'));
const {mcpServers} = JSON.parse(run('config'));
assert.deepEqual(Object.keys(mcpServers), ['polaris-ontology']);
const configuration = mcpServers['polaris-ontology'];
assert.deepEqual(configuration, {command:process.execPath, args:[entry, 'serve']});
const marketplace = JSON.parse(readFileSync(new URL('../.agents/plugins/marketplace.json', import.meta.url)));
assert.equal(marketplace.plugins.length, 0);
assert.equal(existsSync(new URL('../mcp.json', import.meta.url)), false);
assert.equal(existsSync(new URL('../plugin.json', import.meta.url)), false);

const dir = mkdtempSync(join(tmpdir(), 'polaris-entry-'));
try {
  mkdirSync(join(dir, 'scripts'));
  copyFileSync(entry, join(dir, 'polaris.mjs'));
  copyFileSync(join(dirname(entry),'scripts','session-relay.mjs'), join(dir,'scripts','session-relay.mjs'));
  const git = (...args) => execFileSync('git',args,{cwd:dir,stdio:'pipe'});
  git('init','-b','main');
  git('remote','add','origin','https://example.test/other.git');
  assert.throws(() => execFileSync(process.execPath,[join(dir,'polaris.mjs'),'update','--print'],{stdio:'pipe'}), /./);
  git('remote','set-url','origin','https://github.com/guoyifan0711/polaris-ontology-mcp.git');
  assert.throws(() => execFileSync(process.execPath,[join(dir,'polaris.mjs'),'update','--print'],{stdio:'pipe'}), error => error.stderr.toString().includes('干净的 main'));
} finally { rmSync(dir, {recursive:true,force:true}); }

const process_ = spawn(configuration.command, configuration.args, {stdio:['pipe','pipe','pipe'],windowsHide:true});
let timeout;
try {
  const lines = createInterface({input:process_.stdout});
  const reply = once(lines, 'line');
  timeout = setTimeout(() => process_.kill(), 8000);
  process_.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'}) + '\n');
  const [line] = await reply;
  assert.deepEqual(JSON.parse(line).result.tools.map(t=>t.name), ['polaris_source_status']);
  const done = once(process_, 'exit');
  process_.stdin.end();
  assert.equal((await done)[0], 0);
} finally {clearTimeout(timeout);if(process_.exitCode === null)process_.kill();}
console.log('Unified entry, four clients, update guards, single registration and real stdio discovery passed.');

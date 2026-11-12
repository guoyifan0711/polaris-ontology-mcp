import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('./start.cmd', import.meta.url));
const child = spawn('cmd.exe', ['/d','/s','/c','"' + script + '"'], {stdio: ['pipe','pipe','pipe'], windowsHide: true, windowsVerbatimArguments: true});
const waiting = new Map();
let errors = '';
child.stderr.on('data', chunk => { errors += chunk; });
const lines = createInterface({input: child.stdout});
lines.on('line', line => {
  const message = JSON.parse(line);
  const resolve = waiting.get(message.id);
  if (resolve) { waiting.delete(message.id); resolve(message); }
});
const request = input => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('stdio timeout: ' + errors)), 8000);
  waiting.set(input.id, value => { clearTimeout(timer); resolve(value); });
  child.stdin.write(JSON.stringify(input) + '\n');
});
try {
  const init = await request({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2025-11-25', capabilities: {}, clientInfo: {name: 'test', version: '1'}}});
  assert.equal(init.result.protocolVersion, '2025-11-25');
  assert.equal(init.result.serverInfo.version, '0.3.1');
  assert.match(init.result.instructions, /Site/);
  const list = await request({jsonrpc: '2.0', id: 2, method: 'tools/list'});
  assert.equal(list.result.tools.length, 6);
  assert.ok(list.result.tools.every(tool => tool.annotations.readOnlyHint));
  assert.match(list.result.tools.find(tool => tool.name === 'polaris_catalog').description, /首次查询/);
  const ping = await request({jsonrpc: '2.0', id: 3, method: 'ping'});
  assert.deepEqual(ping.result, {});
  child.stdin.end();
  const exit = await new Promise(resolve => child.once('exit', resolve));
  assert.equal(exit, 0, errors);
  console.log('Windows launcher, UTF-8, stdio initialization, five tools and clean exit passed.');
} finally {
  if (child.exitCode === null) child.kill();
  lines.close();
}

import {readFile} from 'node:fs/promises';
import {createSessionRelay} from './session-relay.mjs';

const catalog = JSON.parse(await readFile(new URL('../tool-catalog.json', import.meta.url), 'utf8'));
let initialized = false;
const send = value => process.stdout.write(JSON.stringify(value) + '\n');
const relay = await createSessionRelay({
  tools: catalog.tools,
  onToolsChanged: () => { if (initialized) send({jsonrpc: '2.0', method: 'notifications/tools/list_changed'}); },
});
const errorReply = (id, code, message) => ({jsonrpc: '2.0', id, error: {code, message}});
const versions = ['2026-07-28','2025-11-25','2025-06-18','2024-11-05'];
async function handle(line) {
  let input;
  try { input = JSON.parse(line); }
  catch { send(errorReply(null, -32700, 'JSON 格式无效')); return; }
  if (!input || Array.isArray(input) || input.jsonrpc !== '2.0' || typeof input.method !== 'string' ||
      (input.id !== undefined && !['string','number'].includes(typeof input.id))) {
    send(errorReply(null, -32600, 'JSON-RPC 请求无效')); return;
  }
  if (input.id === undefined) return;
  const result = value => send({jsonrpc: '2.0', id: input.id, result: value});
  if (input.method === 'initialize') {
    initialized = true;
    result({
      protocolVersion: versions.includes(input.params?.protocolVersion) ? input.params.protocolVersion : '2025-11-25',
      capabilities: {tools: {listChanged: true}},
      serverInfo: {name: 'polaris ontology', version: '0.3.1'},
      instructions: '本地 MCP 通过用户已登录的 Polaris Site 会话调用原云端工具。首次调用会打开连接页，请用户用获 Site 授权的账号登录并点击“连接本机 Codex”；完成后重试，不运行 mcp login。连接页保持打开即可后台使用。安装成功不等于认证成功。业务查询先读 polaris_catalog(section=guide)，由云端共享引擎执行；保留范围、币种、as_of、source_snapshot、来源时点和未知，不自行改算 Web 口径。',
    });
  } else if (input.method === 'ping') result({});
  else if (input.method === 'tools/list') result({tools: relay.tools});
  else if (input.method === 'tools/call') {
    try {
      const remote = await relay.call(input);
      send(remote);
    } catch (error) {
      result({isError: true, content: [{type: 'text', text: error.message}], structuredContent: {error: error.message, connection_required: error.code === -32001}});
    }
  } else send(errorReply(input.id, -32601, '方法不存在'));
}
let buffer = '';
let dropping = false;
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  for (const part of chunk.split(/(?<=\n)/)) {
    if (!dropping) buffer += part;
    if (Buffer.byteLength(buffer) > 65536) { dropping = true; buffer = ''; }
    if (part.endsWith('\n')) {
      if (dropping) { dropping = false; send(errorReply(null, -32600, '请求过大')); }
      else if (buffer.trim()) void handle(buffer.trim()).catch(() => send(errorReply(null, -32603, '本机查询暂不可用')));
      buffer = '';
    }
  }
});
const shutdown = async () => { await relay.close(); process.exit(0); };
process.stdin.once('end', shutdown);
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

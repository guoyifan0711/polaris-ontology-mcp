import {createServer} from 'node:http';
import {randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';

export const SITE_ORIGIN = 'https://polaris-ontology.guoyifan2014.chatgpt.site';
export const TOOL_NAMES = ['polaris_catalog','polaris_get','polaris_query','polaris_source_status','polaris_team','polaris_view'];
const TOOL_SET = new Set(TOOL_NAMES);
const MAX_INPUT = 65536;
const MAX_RESULT = 8 * 1024 * 1024;
const fail = (message, code = -32001) => Object.assign(new Error(message), {code});

async function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let failed = false;
    const chunks = [];
    request.on('data', chunk => {
      if (failed) return;
      size += chunk.length;
      if (size > limit) { failed = true; reject(fail('请求过大', 413)); return; }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (failed) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(fail('JSON 格式无效', 400)); }
    });
    request.on('error', reject);
  });
}

export function openBrowser(url) {
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: 'ignore', detached: true, windowsHide: true});
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

export async function createSessionRelay({tools, origin = SITE_ORIGIN, timeoutMs = 30000, pollMs = 20000, open = openBrowser, onToolsChanged = () => {}} = {}) {
  const secret = randomBytes(32).toString('hex');
  const pending = new Map();
  let queue = [];
  let waiter = null;
  let identity = null;
  let lastSeen = 0;
  let openedAt = 0;
  let closing = false;
  let catalog = tools;
  const connected = () => identity !== null && Date.now() - lastSeen < 45000;
  const disconnect = message => {
    identity = null;
    lastSeen = 0;
    queue = [];
    if (waiter) { waiter.finish([]); waiter = null; }
    for (const entry of [...pending.values()]) entry.reject(fail(message));
  };
  const server = createServer(async (request, response) => {
    const address = server.address();
    const sameHost = request.headers.host === '127.0.0.1:' + address.port;
    const sameOrigin = request.headers.origin === origin;
    const send = (status, value) => {
      if (response.destroyed || response.writableEnded) return;
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(sameOrigin && sameHost ? {'Access-Control-Allow-Origin': origin, Vary: 'Origin'} : {}),
      });
      response.end(value === undefined ? undefined : JSON.stringify(value));
    };
    if (!sameHost || !sameOrigin) return send(403, {error: '请求来源无效'});
    const path = request.url;
    if (!['/ready','/poll','/result','/disconnect','/status'].includes(path)) return send(404, {error: '路径不存在'});
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Max-Age': '600', Vary: 'Origin', 'Cache-Control': 'no-store',
      });
      return response.end();
    }
    const bearer = request.headers.authorization || '';
    const expected = 'Bearer ' + secret;
    if (Buffer.byteLength(bearer) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(bearer), Buffer.from(expected))) return send(401, {error: '本次连接信息无效，请回到 Codex 重试'});
    try {
      if (path === '/ready' && request.method === 'POST') {
        const body = await readBody(request, MAX_INPUT);
        if (typeof body.email !== 'string' || body.email.length > 254 || !body.email.includes('@')) return send(400, {error: 'Site 账号信息无效'});
        const names = body.tools?.map(t => t.name).sort();
        if (JSON.stringify(names) !== JSON.stringify(TOOL_NAMES) || body.tools.some(t => !t.inputSchema || t.inputSchema.type !== 'object')) return send(400, {error: '云端工具目录不符'});
        if (identity && identity.email !== body.email) return send(409, {error: '当前连接属于另一个账号，请先断开连接'});
        identity = {email: body.email, subject: body.subject || null};
        lastSeen = Date.now();
        if (JSON.stringify(catalog) !== JSON.stringify(body.tools)) {
          catalog = body.tools;
          onToolsChanged();
        }
        return send(200, {connected: true});
      }
      if (path === '/status' && request.method === 'GET') return send(200, {connected: connected(), identity, pending: pending.size});
      if (path === '/disconnect' && request.method === 'POST') {
        await readBody(request, MAX_INPUT);
        disconnect('Site 会话连接已断开');
        return send(200, {connected: false});
      }
      if (!identity) return send(409, {error: '请先完成 Site 会话连接'});
      if (path === '/poll' && request.method === 'GET') {
        lastSeen = Date.now();
        if (queue.length) { const jobs = queue; queue = []; return send(200, {jobs}); }
        if (waiter) waiter.finish([]);
        const current = {finish: jobs => { clearTimeout(timer); if (waiter === current) waiter = null; send(200, {jobs}); }};
        const timer = setTimeout(() => current.finish([]), pollMs);
        waiter = current;
        response.once('close', () => { clearTimeout(timer); if (waiter === current) waiter = null; });
        return;
      }
      if (path === '/result' && request.method === 'POST') {
        const body = await readBody(request, MAX_RESULT);
        const entry = pending.get(body.id);
        if (!entry || !Number.isInteger(body.status) || !body.body || body.body.jsonrpc !== '2.0' || body.body.id !== entry.rpcId) return send(400, {error: '返回内容不对应当前请求'});
        lastSeen = Date.now();
        if ([401,403].includes(body.status)) {
          disconnect('Site 已拒绝访问，请用获授权的账号重新登录连接');
        } else if (body.status !== 200) entry.reject(fail('云端查询失败（HTTP ' + body.status + '）', -32002));
        else entry.resolve(body.body);
        return send(200, {received: true});
      }
      return send(405, {error: '请求方法无效'});
    } catch (error) { return send(error.code === 413 ? 413 : 400, {error: error.code === 413 ? '请求过大' : '请求无效'}); }
  });
  server.requestTimeout = 35000;
  server.headersTimeout = 5000;
  server.maxConnections = 12;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  const connectUrl = origin + '/mcp-connect#port=' + port + '&key=' + secret;
  return {
    port,
    connectUrl,
    get tools() { return catalog; },
    status() { return {connected: connected(), identity, pending: pending.size}; },
    async call(rpc) {
      if (closing) throw fail('连接已结束');
      if (rpc?.method !== 'tools/call' || !TOOL_SET.has(rpc.params?.name)) throw fail('工具不在已授权只读范围内', -32602);
      if (Buffer.byteLength(JSON.stringify(rpc)) > MAX_INPUT) throw fail('查询参数过大', -32602);
      if (!connected()) {
        if (Date.now() - openedAt > 10000) {
          openedAt = Date.now();
          try { await open(connectUrl); }
          catch { throw fail('无法打开浏览器连接页。请检查本机默认浏览器设置后重试。'); }
        }
        throw fail('请在已打开的 Polaris 连接页，用获 Site 授权的账号登录并点击“连接本机 Codex”；完成后再次调用工具。需保留连接页，可放在后台。');
      }
      if (pending.size >= 4) throw fail('当前查询较多，请等待已有查询完成后重试', -32003);
      const id = randomUUID();
      return new Promise((resolve, reject) => {
        const finish = fn => value => {
          clearTimeout(timer);
          pending.delete(id);
          queue = queue.filter(job => job.id !== id);
          fn(value);
        };
        const timer = setTimeout(() => pending.get(id)?.reject(fail('Site 连接页未在时限内返回，请检查页面后重试', -32004)), timeoutMs);
        pending.set(id, {rpcId: rpc.id, resolve: finish(resolve), reject: finish(reject)});
        const job = {id, rpc};
        if (waiter) waiter.finish([job]);
        else queue.push(job);
      });
    },
    async close() {
      closing = true;
      disconnect('本机 MCP 已结束');
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

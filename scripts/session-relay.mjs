import {createServer} from 'node:http';
import {randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';

export const SITE_ORIGIN = 'https://polaris-ontology.guoyifan2014.chatgpt.site';
export const MAX_RPC_BYTES = 450000 * 3; // Covers the Site's 450,000 UTF-16 code units, including CJK Briefs.
const MAX_INPUT = 65536;
const MAX_RESULT = 8 * 1024 * 1024;
const CONNECTION_TTL = 45000;
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
  let catalogNames = new Set(tools.map(tool => tool.name));
  let expiry;
  const connected = () => identity !== null && Date.now() - lastSeen < CONNECTION_TTL;
  const replaceCatalog = next => {
    if (JSON.stringify(catalog) === JSON.stringify(next)) return;
    catalog = next;
    catalogNames = new Set(next.map(tool => tool.name));
    onToolsChanged();
  };
  const disconnect = message => {
    identity = null;
    lastSeen = 0;
    clearTimeout(expiry);
    replaceCatalog(tools);
    queue = [];
    if (waiter) { waiter.finish([]); waiter = null; }
    for (const entry of [...pending.values()]) entry.reject(fail(message));
  };
  const heartbeat = () => {
    lastSeen = Date.now();
    clearTimeout(expiry);
    expiry = setTimeout(() => disconnect('Site 会话连接已超时，请重新连接'), CONNECTION_TTL).unref();
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
        if (body?.protocol !== 2) return send(400, {error: '连接页尚未更新，请重新打开 Polaris 连接页'});
        const {email, subject, tools: next} = body;
        if (typeof email !== 'string' || email.length > 254 || !email.includes('@') ||
            (subject !== null && (typeof subject !== 'string' || subject.length > 512))) return send(400, {error: 'Site 账号信息无效'});
        if (!Array.isArray(next) || next.some(t => !t || typeof t.name !== 'string' || !/^[A-Za-z0-9_.-]{1,128}$/.test(t.name) || t.inputSchema?.type !== 'object')) return send(400, {error: '云端工具目录不符'});
        const names = new Set(next.map(t => t.name));
        if (names.size !== next.length || !tools.every(t => names.has(t.name))) return send(400, {error: '云端工具目录不符'});
        if (identity && (identity.email !== email || identity.subject !== subject)) return send(409, {error: '当前连接属于另一个账号，请先断开连接'});
        identity = {email, subject};
        heartbeat();
        replaceCatalog(next);
        return send(200, {connected: true});
      }
      if (path === '/status' && request.method === 'GET') return send(200, {connected: connected(), identity, pending: pending.size});
      if (path === '/disconnect' && request.method === 'POST') {
        await readBody(request, MAX_INPUT);
        disconnect('Site 会话连接已断开');
        return send(200, {connected: false});
      }
      if (!connected()) return send(409, {error: '请先完成 Site 会话连接'});
      if (path === '/poll' && request.method === 'GET') {
        heartbeat();
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
        heartbeat();
        if ([401,403].includes(body.status)) {
          disconnect('Site 已拒绝访问，请用获授权的账号重新登录连接');
        } else if (body.status !== 200) entry.reject(fail('云端调用失败（HTTP ' + body.status + '）', -32002));
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
  const connectUrl = origin + '/mcp-connect#port=' + port + '&key=' + secret + '&bridge=2';
  return {
    port,
    connectUrl,
    get tools() { return catalog; },
    status() { return {connected: connected(), identity, pending: pending.size}; },
    async call(rpc) {
      if (closing) throw fail('连接已结束');
      if (rpc?.method !== 'tools/call' || typeof rpc.params?.name !== 'string') throw fail('工具调用无效', -32602);
      if (Buffer.byteLength(JSON.stringify(rpc)) > MAX_RPC_BYTES) throw fail('调用参数过大', -32602);
      if (!connected()) {
        if (Date.now() - openedAt > 10000) {
          openedAt = Date.now();
          try { await open(connectUrl); }
          catch { throw fail('无法打开浏览器连接页。请检查本机默认浏览器设置后重试。'); }
        }
        throw fail('请在已打开的 Polaris 连接页，用获 Site 授权的账号登录并点击“连接本机 Agent”。完成后重试，使用期间保留连接页。');
      }
      if (!catalogNames.has(rpc.params.name)) throw fail('当前账号的工具目录中没有该工具', -32602);
      if (pending.size >= 4) throw fail('当前调用较多，请等待已有调用完成后重试', -32003);
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

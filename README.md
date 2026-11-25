# Polaris Ontology MCP

**[接入 Polaris Agent](https://polaris-ontology.guoyifan2014.chatgpt.site/workspace#/agents)** 是所有账号的安装、更新和首次调用入口。选择正在使用的客户端，按自己的站点账号验证。业务工具随站点发布，授权目录以该账号实际发现的工具为准。

## 从 Git 进入

```powershell
git clone https://github.com/guoyifan0711/polaris-ontology-mcp.git
cd polaris-ontology-mcp
node polaris.mjs install
```

已检出该仓库时，运行 `node polaris.mjs update`，它会将干净的官方 main 检出快进到当前 main，并打开同一接入页。Node.js 需要 20 或更高版本。也可以直接使用页首链接。终端环境可追加 `--print` 输出网址。

## 客户端调用

- ChatGPT 和已能使用 Sites 插件的 Codex 使用原生 **polaris ontology**。发布新工具后，在客户端刷新工具目录或打开新会话。
- Claude Code、WorkBuddy，以及经确认无法使用原生插件的 Windows 本机客户端，通过接入页配置同一服务。需要本机传输时，`node polaris.mjs config` 输出此检出和 Node 的绝对路径，客户端以 `node polaris.mjs serve` 启动。已配置的客户端原位更新同一项，更新 Git 后重启连接并重新配对。
- 已安装旧版 Windows 插件的 Codex，先在本站原生插件中成功调用 `polaris_source_status`，再停用该客户端的旧 `polaris-ontology-mcp@polaris-ontology-mcp` 并打开新会话。其他用户和其他客户端分别迁移。

## 维护

站点负责业务工具、数据和权限。Git 只分发本机传输和统一入口。历史安装可继续按既有版本连接。运行 `node scripts/test-entry.mjs`、`node scripts/test-session-relay.mjs`、`node scripts/test-stdio.mjs` 核验入口、配对和协议。

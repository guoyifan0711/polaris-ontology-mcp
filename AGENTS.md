# Polaris Ontology MCP 分发维护

- 本仓库发布远程 MCP 客户端配置及安装说明，默认分支为 `main`。
- 云端接口是 `https://polaris-ontology.guoyifan2014.chatgpt.site/mcp`；v0.3.0 的 Windows 本地 stdio 通过 `/mcp-connect` 页的用户 Site 会话调用它。
- 保留 Sites 原有认证及访问策略；本机传输不读取或分发 Cookie、OAuth 令牌、导入密钥和服务凭据。安装不代表获得业务权限，当前页面账号须经 Site 校验。
- 凭据由每位使用者在自己的客户端维护。业务数据库、个人令牌、导入密钥和凭据文件均留在分发包之外。
- 业务定义和当前数据从云端工具获取；更新本仓库无需同步数据库或部署 Site。
- 修改时核对 `plugin.json`、`mcp.json`、marketplace、配置示例及 README 的一致性。
- 发布标签对应已提交的源码；校验配置、归档内容并回读 GitHub。
- 分别记录分发配置校验、OAuth 发现检查和跨账号端到端验收；后者未验证时明确说明。
- 2026-11-03：v0.3.0 标准入口为 Windows Codex 本地 stdio 与 Site 会话连接页；独立 HTTP 默认 OAuth 已确认 DCR 不支持，不能作为本地入口的修复流程。Sites 原生插件是另一条要求 App/插件权限的路径。独立注册客户端须另行验证，不能猜测或复用其它用途 client ID。

- 本地监听只绑定127.0.0.1，固定Site Origin、准确Host、临时配对值、工具白名单、大小/并发/超时及401/403断开必须保持。业务结果原样传输，业务规则不复制到客户端。连接页需保持打开。
- 分发前运行scripts/test-session-relay.mjs与scripts/test-stdio.mjs；分发包仅保留公开工具名与通用Schema，完整字段通过获授权的Site会话取得，不将业务目录复制到公开包。Windows启动器仅使用系统cmd启动现有Node，不更改系统执行策略。旧HTTP条目只有名称及URL均匹配本站时才可在用户升级流程移除。

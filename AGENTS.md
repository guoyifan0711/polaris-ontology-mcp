# Polaris Ontology MCP 分发维护

- 本仓库发布远程 MCP 客户端配置及安装说明，默认分支为 `main`。
- 云端接口是 `https://polaris-ontology.guoyifan2014.chatgpt.site/mcp`。
- 保留 OAuth 认证及现有 Site 访问策略；安装插件不代表获得业务访问授权。
- 凭据由每位使用者在自己的客户端维护。业务数据库、个人令牌、导入密钥和凭据文件均留在分发包之外。
- 业务定义和当前数据从云端工具获取；更新本仓库无需同步数据库或部署 Site。
- 修改时核对 `plugin.json`、`mcp.json`、marketplace、配置示例及 README 的一致性。
- 发布标签对应已提交的源码；校验配置、归档内容并回读 GitHub。
- 分别记录分发配置校验、OAuth 发现检查和跨账号端到端验收；后者未验证时明确说明。

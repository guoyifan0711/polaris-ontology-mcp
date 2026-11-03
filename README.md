# polaris ontology MCP

Windows Codex 的 Polaris 只读查询插件。v0.3.0 使用本机 stdio MCP 与使用者自己的 Site 登录会话；原云端五个工具负责查询、OWL 目录与业务计算。

[Polaris Web](https://polaris-ontology.guoyifan2014.chatgpt.site/workspace) · [下载 v0.3.0 ZIP](https://github.com/guoyifan0711/polaris-ontology-mcp/archive/refs/tags/v0.3.0.zip)

## 安装

需要 Windows Codex 本地会话及 Node.js 20+。启动器使用 Codex 随附运行时或 PATH 中的 Node，无需 npm 安装；ChatGPT 网页及云端执行会话不运行本地入口。

可将下面这段发给使用者自己的 Codex：

> 安装 https://github.com/guoyifan0711/polaris-ontology-mcp 的 v0.3.0，启用 polaris ontology MCP。这是本地 stdio 插件。发现五个 Polaris 工具后调用 polaris_source_status；连接页打开后等我登录并点击“连接本机 Codex”，再重试并查询一条业务记录。只有实际调用成功才报告已连接。如曾添加同名 HTTP MCP，仅在其 URL 完全匹配本站 /mcp 时移除旧配置，保留其它配置和连接；不要运行 mcp login。

也可在可用的 Codex CLI 中执行：

    codex plugin marketplace add guoyifan0711/polaris-ontology-mcp --ref v0.3.0
    codex plugin add polaris-ontology-mcp@polaris-ontology-mcp

ZIP 解压后，进入包含 plugin.json 的目录，将第一条命令改为 codex plugin marketplace add .，再安装同一插件。若命令未在 PATH 中，使用 Codex 完成安装或定位当前应用附带的 CLI，不复制其他电脑上的程序路径。

## 连接

1. 重开本地聊天，选择 polaris ontology MCP，并调用任一 Polaris 工具。
2. 在自动打开的 Site 连接页，用获 Site 授权的账号登录，点击“连接本机 Codex”。
3. 浏览器如询问本站访问本机网络，需要使用者允许。
4. 页面显示已连接账号后，保留页面，可放在后台；回到 Codex 重试查询。

首次登录后页面若提示重试，回到 Codex 重新调用即可。页面关闭或本机 MCP 停止后，再次查询会提示重新连接。

## 查询与验收

可以自然语言问：“这个团队近7日日均计润多少？”“哪些已验收项目还有未交付或未付款的 Trade？”“这张报价下多个 Offer 的预算会重复吗？”

| 工具 | 用途 |
| --- | --- |
| polaris_source_status | 来源快照、更新时间与覆盖 |
| polaris_catalog | guide、对象、指标和 OWL |
| polaris_query | 条件、分页、排序与指标 |
| polaris_get | 对象详情与关联 |
| polaris_view | 与 Web 共用的业务视角 |

工作流先读取当前云端 guide，再解析身份、期间、范围与币种。业务结果由 Web 共用后端执行，传输不重新计算。安装状态不代表认证成功：需实际调用来源工具及一条有权访问的业务记录。连接页可复制不含配对值的验证结果，包含账号、时间、来源快照及成功工具次数；所有者与其他账号的验收分别记录。

## 权限与故障

每笔请求仍由原 Site 检查登录及分享权限。本机程序不读取 Cookie 或 OAuth 令牌，分发包不包含业务数据、个人凭据、服务凭据或导入密钥。浏览器只向原 Site 发出正常同源请求；云端 401/403 会使连接失效。

本机仅监听 127.0.0.1 随机端口，检查准确 Host、本站 Origin 及内存中的临时配对值；最多四笔请求，有大小及超时限制。连接页读取后移除 URL 片段，配对值不写入文件。

没有工具时检查当前本地主机、插件来源、0.3.0 版本及启用状态。连不到本机时检查 Codex 是否运行及浏览器的本机网络权限。Site 拒绝访问时核对页面显示的账号和 Site 分享权限。Node 未找到时安装官方 Node.js 20+ 或使用带运行时的 Codex；启动器不改变系统执行策略。

v0.1.0/v0.2.0 独立 HTTP 配置曾报 Dynamic client registration not supported，旧标签和 ZIP 保留原样。若仍出现该报错，检查旧 HTTP 配置或旧版本是否仍启用。Sites 原生插件是另一条路径，要求其 App 和插件权限。

## 维护

默认分支 main。连接前仅包含公开工具名与通用参数结构，完整业务字段在连接后通过获授权的云端会话获取；语义和数据更新沿用云端入口。测试 scripts/test-session-relay.mjs 与 scripts/test-stdio.mjs。发布前核验 ZIP 只包含已提交的配置、传输代码、Skill 和说明。

[OpenAI：本地 MCP](https://developers.openai.com/plugins/deploy/desktop-only) · [插件打包](https://developers.openai.com/plugins/build/plugins) · [Sites 与 MCP](https://learn.chatgpt.com/docs/extend/mcp)

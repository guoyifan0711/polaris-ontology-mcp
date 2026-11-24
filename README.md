# Polaris Ontology MCP

Windows 本机 Codex 和 Claude Code 接入 Polaris 的 MCP。连接网页后，客户端按登录账号发现业务查询、项目协作等工具。每次调用由 Polaris 检查数据范围和项目编辑权限。

[接入 Agent](https://polaris-ontology.guoyifan2014.chatgpt.site/workspace#/agents) · [下载 v0.4.0 ZIP](https://github.com/guoyifan0711/polaris-ontology-mcp/archive/refs/tags/v0.4.0.zip)

## 安装或升级

需要 Windows 本机会话和 Node.js 20+。Codex 启动器可使用 Codex 随附的 Node。Claude Code 使用本机已安装的 Node。

### Codex

在「接入 Agent」选择 Codex 并复制配置指令。也可以在 PowerShell 中安装：

```powershell
codex plugin marketplace add guoyifan0711/polaris-ontology-mcp --ref v0.4.0
codex plugin add polaris-ontology-mcp@polaris-ontology-mcp
codex features enable mcp_tool_list_changed
```

已有 v0.3.x 时，检查 `codex plugin marketplace list`。若旧条目固定在旧标签，先用 `codex plugin marketplace remove polaris-ontology-mcp` 移除这个旧来源，再按以上命令添加 v0.4.0 和安装插件。若安装提示旧插件已装，移除同名旧插件后重新安装。完全退出并重新打开 Codex，再新建本机会话。工具目录刷新设置用于配对后的工具发现。如果客户端版本已移除此开关，核对该版本已默认支持工具目录刷新。

### Claude Code

解压 ZIP 到固定目录。在 PowerShell 中将下方路径换成实际位置：

```powershell
$polarisNode = (Get-Command node.exe -CommandType Application).Source
$polarisStdio = 'C:\path\to\polaris-ontology-mcp-0.4.0\scripts\stdio.mjs'
claude mcp add --transport stdio --scope user polaris-ontology -- $polarisNode $polarisStdio
```

已有 `polaris-ontology` 时，先用 `claude mcp get polaris-ontology` 核对启动命令和作用域。仅在确认是旧版 Polaris 的情况下，按显示的作用域移除该项，再注册新版。打开新的 Claude Code 本机会话，用 `/mcp` 核对服务。 [Claude Code 本机 MCP 文档](https://code.claude.com/docs/en/mcp#option-3-add-a-local-stdio-server)

## 登录并核对工具

1. 让 Agent 调用 `polaris_source_status`。连接前只有这个引导工具，首次调用会打开浏览器连接页。
2. 用自己的获授权账号登录，点击「连接本机 Agent」。浏览器询问访问本机网络时，由你允许。使用期间保留此页。
3. 连接成功后，客户端重新发现当前账号的目录。重试来源查询，再查一条有权访问的业务记录，可在连接页同时核对工具数和来源快照。

项目协作包含创建人工项目、更新成员和 Brief、查历史与恢复版本、更新项目资料、关联或解除 Offer。能否编辑由站点根据账号和项目权限判定。写入前按工具要求读取当前版本和快照，完成后回读。

**删除项目由网页确认。** Agent 先询问用户是否确定，然后提供 `polaris_project_delete` 返回的 `confirmation_url`。具备权限的人需要亲自在网页点击「确认删除」。验收接入时只做读取。

## 权限与故障

- 云端实时检查权限。换号、退出登录或权限失效后，重新用自己的账号配对。旧版 v0.3.x 仍可连接各自的 5–6 个只读工具。
- 本机服务只监听 `127.0.0.1`，检查本站 Origin、端口和临时配对值。配对值位于临时 URL 片段，读取后移除。程序不读取或导出 Cookie、OAuth 令牌或导入密钥。
- 只有引导工具时，检查浏览器是否已配对、连接页是否保持打开、客户端是否实际加载 v0.4.0。Codex 还需启用工具目录刷新设置并重新启动。连不到本机时，检查 Node 版本、MCP 启动状态和浏览器的本机网络权限。
- 浏览器会话接入使用 stdio。遇到 `Dynamic client registration not supported` 时，核查客户端是否仍在使用旧 Polaris HTTP 配置。

## 维护

运行 `node scripts/test-session-relay.mjs` 和 `node scripts/test-stdio.mjs`。标签须对应已提交、验证过的源码。发布包仅附连接引导工具，授权目录和业务语义由当前站点提供。
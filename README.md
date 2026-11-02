# polaris ontology MCP

连接现有 Polaris Ontology 云端服务，供已获授权的用户查询客户、员工、达人账号、报价、Offer、Trade 及交付信息。

**v0.2.0 包含查询工作流：Agent 会从云端读取业务语义、筛选枚举及问题范例，再调用与 Web 共用的查询和计算接口。其他账号的首次认证仍待验收。** 当前认证发行方的发现文档未声明动态客户端注册（DCR）或客户端元数据文档（CIMD）支持。通用 MCP 客户端可能还需要预先登记的 OAuth 客户端；下载或安装本包本身不解决这一条件。

[打开 Polaris Web](https://polaris-ontology.guoyifan2014.chatgpt.site/workspace) · [下载 v0.2.0 ZIP](https://github.com/guoyifan0711/polaris-ontology-mcp/archive/refs/tags/v0.2.0.zip)

## 使用前准备

1. 用自己的账号打开 Polaris Web，确认已获 Site 查看权限。
2. 使用支持远程 Streamable HTTP 与 OAuth 的 MCP 客户端。
3. 安装后通过客户端完成自己的认证。原有 Sites 插件路径还要求关联 App 和插件的访问权限。

业务数据继续保存在云端。仓库提供连接配置、查询工作流和说明；每位用户的登录凭据由自己的客户端管理。

## Codex 桌面端：通过 GitHub 安装

在已安装 Codex CLI 的终端中添加目录源：

```sh
codex plugin marketplace add guoyifan0711/polaris-ontology-mcp --ref v0.2.0
```

然后重启桌面应用，在插件目录中选择 **Polaris Ontology** 来源，安装 **polaris ontology**，按客户端提示连接自己的账号。若认证报告客户端注册不受支持，按下文处理；此时尚未完成连接。

从 ZIP 安装时，先解压并进入包含 `plugin.json` 的目录，再执行：

```sh
codex plugin marketplace add .
```

随后使用同一桌面安装流程。GitHub/本地 marketplace 的可用性取决于具体客户端。

## 直接添加 MCP

无需插件目录的客户端可使用以下连接信息：

| 项目 | 配置 |
| --- | --- |
| 名称 | `polaris-ontology` |
| 传输 | Streamable HTTP |
| 地址 | `https://polaris-ontology.guoyifan2014.chatgpt.site/mcp` |
| 认证 | OAuth，使用自己的账号 |

Codex CLI 配置命令：

```sh
codex mcp add polaris-ontology --url https://polaris-ontology.guoyifan2014.chatgpt.site/mcp
codex mcp login polaris-ontology
```

也可以参考 [Codex TOML 配置](examples/codex-config.toml)。选择一种配置方式，避免重复添加。

若客户端明确要求已登记的 OAuth client ID，请由维护者先确认该客户端可用于此 Site 的资源与回调地址，再通过客户端的受支持配置入口设置。仓库尚未提供已验证的通用 OAuth client ID。不要猜测 ID、复用他人的登录令牌或使用站点导入密钥。

ChatGPT 网页版使用插件或“添加自定义 MCP”入口（取决于账号和工作区权限）。网页端不读取本地 Codex 配置；把 ZIP 上传为聊天附件也不会安装 MCP。

## 自然语言使用

安装后可直接问：“这个团队近7日日均计润多少？”“哪些已验收项目还有未交付或未付款的Trade？”“这张报价下面多个Offer的预算会重复吗？”

插件内置 `polaris-query` 工作流；云端 MCP 的初始化说明也会引导 Agent 首次读取 `polaris_catalog(section="guide")`。业务规则和 OWL 从当前云端读取，结果携带规则版本、来源快照和计算截止。

Agent 负责理解问题、消歧和选择工具；金额、日期、聚合与已实现分类由 Web 共用后端执行。云端保持只读，必要形式推理仍是独立能力。

## 连接后检查

在新会话中请求：“查看 Polaris 当前数据更新时间和来源覆盖范围。”确认客户端实际调用 `polaris_source_status`，再查询一条自己有权查看的业务记录。

| 云端工具 | 用途 |
| --- | --- |
| `polaris_source_status` | 快照、各来源更新时间和覆盖窗口 |
| `polaris_catalog` | 对象、关系、指标、聚合和 OWL 语义 |
| `polaris_query` | 条件查询、分页、排序和指标计算 |
| `polaris_get` | 按业务 ID 读取对象及关联 |
| `polaris_view` | 与 Web 业务视图共用的聚合 |

Agent 应从当前云端目录读取规则，保留返回的快照、计算时点、缺失与未知状态；核对网页结果时使用相同视角、筛选和计算时点。云端服务随数据同步和语义发布更新，本地连接配置通常无需变动。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| `401` | 在客户端完成当前账号的认证，核对连接地址。 |
| `403` | 核对当前登录账号、Site 分享权限，以及所用路径要求的 App/插件权限。 |
| OAuth registration / client ID 错误 | 需要确认已登记客户端的兼容性；保留原错误交维护者处理。 |
| 数据较旧 | 先读 `polaris_source_status`；安装包更新不会触发业务库刷新。 |
| 安装成功但没有工具 | 检查插件启用状态、认证结果及客户端支持范围，在新会话中复查。 |

## 维护与官方说明

分发更新在本仓库提交到 `main` 并打版本标签。使用者可升级 marketplace 来源并安装新版本；已有云端数据库与访问策略继续由 Site 管理。

- [OpenAI：插件打包与 GitHub marketplace](https://developers.openai.com/plugins/build/plugins)
- [OpenAI：MCP 连接、OAuth 与 Sites 访问权限](https://learn.chatgpt.com/docs/extend/mcp)

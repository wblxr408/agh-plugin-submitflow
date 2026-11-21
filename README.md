# 岗位与投递工作台 · SubmitFlow Job Tracker

检索岗位、收藏和投递阶段，读取时间线做周复盘，可选更新本地追踪记录。

市场版本提供配置和启动入口，运行权限通过独立组件或 MCP 单独授权。

## 配置 MCP

先下载固定版本的运行组件。

```sh
git clone --branch runtime-v1.0.0 --single-branch https://github.com/wblxr408/agh-plugin-submitflow.git submitflow-runtime
```

在 AGH「连接（MCP）」建立 ID 为 `submitflow` 的 stdio 连接。命令为 Node.js 24，参数依次是 `<运行组件绝对目录>/submitflow.mjs`、`--url`、个人本机 SubmitFlow 的源站。运行文件和数据目录需满足 AGH 宿主策略。核对配置后测试并启用连接。

将这个个人实例的 `auth_token` 值保存为 AGH 密钥，并绑定到 `SUBMITFLOW_TOKEN`。这个版本适用于本机单人实例。查岗位、收藏和投递默认为只读。需维护收藏和阶段时，所有者可追加 `--allow-writes` 并重新审核。工具不会向招聘方投递或发消息。 [SubmitFlow](https://github.com/wblxr408/SubmitFlow)

从「智能体」启动「岗位与投递工作台」，在草稿中填写实际问题。 [AGH MCP 配置](https://github.com/AgnesAI-Labs/agnes-harness/blob/main/docs/guide/mcp.zh-CN.md)

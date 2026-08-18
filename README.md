# dsh-sidebar-upload

一个 `dsh-better-sidebar` 的**消费插件**：在侧边栏新增一个「上传」tab，支持把**任意文件或整个文件夹**直接拖进去，上传到当前会话的工作区（保留文件夹结构）。

它不是对 `dsh-better-sidebar` 源码的修改，而是通过其公开的 `ctx.betterSidebar.registerTab` 服务注册的一个独立插件页。

## 功能

- 🗂️ 拖拽**任意文件**（文本 / 图片 / PDF / 二进制…）上传
- 📁 拖拽**整个文件夹**上传，按原目录结构落盘
- 📊 上传进度条 + 结果汇总（新增 / 覆盖 / 失败列表）
- 🔒 与 `/api` 相同的浏览器信任围栏 + 会话 cwd 路径约束（防目录穿越）

## 工作原理

| 半边 | 作用 |
|---|---|
| host（`lib/index.js`） | 注册 `POST /sidebar-upload/upload` 原始字节上传路由，写入会话工作区 |
| client（`lib/client.js`） | 通过 `ctx.betterSidebar.registerTab` 注册 `sidebar-upload` tab，渲染拖拽区 |

上传路由契约：`POST /sidebar-upload/upload?sessionId=<id>&dir=<绝对目录>&name=<相对路径>`，body 为原始字节；`dir` 缺省时使用会话 cwd。响应 `{ ok, value: { path, bytes, overwrote } }`。

## 安装

```sh
# 1. 把本插件链接进 web profile
cd ~/.dsh/profiles/web

# 2. package.json 的 dependencies 加入本地路径（或用你发布后的版本）
#    "dsh-sidebar-upload": "link:/path/to/dsh-sidebar-upload"
#    dsh.profile.bundles 追加 "dsh-sidebar-upload"

# 3. 安装
pnpm install
```

或手动编辑（等价于上面的第 2 步）：

```jsonc
// ~/.dsh/profiles/web/package.json
{
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-better-sidebar", "dsh-sidebar-upload"]
    }
  },
  "dependencies": {
    "dsh-better-sidebar": "0.12.2",
    "dsh-sidebar-upload": "link:/path/to/dsh-sidebar-upload"
  }
}
```

## 启用

- **host 半改动需要重启** `dsh web`（本插件包含 host 半，必须重启一次）；
- 重启后**浏览器硬刷新**（Cmd/Ctrl+Shift+R），侧边栏 `+` 菜单里就会出现「上传」tab。

## 配置（可选）

在 profile 的 `cordis.patch.yml` 里给挂载行加 config 可调上传大小上限：

```yaml
- insert:
    - id: sidebar-upload
      name: 'dsh-sidebar-upload'
      config:
        uploadLimit: 104857600   # 100 MB；默认 50 MB
```

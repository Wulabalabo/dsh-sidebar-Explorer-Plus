# dsh-sidebar-upload

一个 `dsh-better-sidebar` 的**消费插件**：在侧边栏新增一个「上传」tab，内置一棵**固定在工作区（cwd）内的文件夹树**——先选中要上传到的目录，再把**任意文件或整个文件夹**拖进去，按原目录结构落盘。

它通过 `dsh-better-sidebar` 公开的 `ctx.betterSidebar.registerTab` 服务注册，是一个独立插件，不改动 better-sidebar 源码。

## 功能

- 🗂️ 拖拽**任意文件**（文本 / 图片 / PDF / 二进制…）上传
- 📁 拖拽**整个文件夹**上传，按原目录结构落盘
- 📂 文件夹树选择上传目标（始终锁定在当前项目工作区内，不会越出 cwd）
- 📊 上传进度条 + 结果汇总（新增 / 覆盖 / 失败列表）
- 🔒 与 `/api` 相同的浏览器信任围栏 + 会话 cwd 路径约束（防目录穿越）

## 安装

> 前置：已安装 `dsh-better-sidebar`（本插件通过其 `betterSidebar` 服务注册 tab）。

```sh
dsh plugin --profile web add github:Wulabalabo/dsh-sidebar-upload
```

装完**重启 `dsh web`**（本插件含 host 半），再**浏览器硬刷新**（Cmd/Ctrl+Shift+R），侧边栏 `+` 菜单里就会出现「上传」tab。

## 工作原理

| 半边 | 作用 |
|---|---|
| host（`src/index.ts` → `lib/index.js`） | 注册 `POST /sidebar-upload/upload` 原始字节上传路由，写入会话工作区 |
| client（`src/client/index.tsx` → `lib/client.js`） | `ctx.betterSidebar.registerTab` 注册 `sidebar-upload` tab，渲染文件夹树 + 拖拽区 |

上传路由契约：`POST /sidebar-upload/upload?sessionId=<id>&dir=<绝对目录>&name=<相对路径>`，body 为原始字节。响应 `{ ok, value: { path, bytes, overwrote } }`。

## 开发 / 构建

```sh
npm install           # 安装 devDependencies
npm run typecheck     # tsc --noEmit
npm run build         # esbuild 打包 + 生成 lib/types/*.d.ts
```

- `lib/` 是构建产物，**已提交进仓库**，因此从 git 安装无需任何构建步骤。
- 客户端 bundle 走 `window.__ModuleLoader__.load({ id: 'dsh-sidebar-upload', factory })` 注册，`react` 作为 external 由模块表运行时解析。

## 配置（可选）

在 profile 的挂载行加 config 可调上传大小上限（默认 50 MB）：

```yaml
- insert:
    - id: sidebar-upload
      name: 'dsh-sidebar-upload'
      config:
        uploadLimit: 104857600   # 100 MB
```

## License

MIT

# dsh-sidebar-explorer-plus

一个 `dsh-better-sidebar` 的**消费插件**：在侧边栏新增一个「文件」tab，内置一棵**固定在工作区（cwd）内的文件树**，提供真正的文件管理能力——上传、移动、删除、重命名、新建文件夹。它补充了 better-sidebar 自带 Explorer 缺失的「写」操作（Explorer 只读）。

它通过 `dsh-better-sidebar` 公开的 `ctx.betterSidebar.registerTab` 服务注册，是一个独立插件，不改动 better-sidebar 源码。

## 功能

- 🗂️ 拖拽**任意文件**（文本 / 图片 / PDF / 二进制…）上传，上传到指定目录
- 📁 拖拽**整个文件夹**上传，按原目录结构落盘
- 📂 文件树展示文件与文件夹；点文件在侧边栏编辑器打开
- ↕️ **拖拽移动**：把文件/文件夹拖到另一个文件夹上移动（冲突报错跳过，不覆盖）
- ✏️ **重命名**：右键 → 重命名
- 🗑️ **删除**：右键 → 删除（永久删除 + 二次确认；文件夹递归删除）
- ➕ **新建文件夹**：在选中目录下建子目录
- 🔒 与 `/api` 相同的浏览器信任围栏 + 会话 cwd 路径约束（所有操作锁定在当前项目内，防目录穿越）

## 安装

> 前置：已安装 `dsh-better-sidebar`（本插件通过其 `betterSidebar` 服务注册 tab）。

```sh
dsh plugin --profile web add github:Wulabalabo/dsh-sidebar-Explorer-Plus
```

装完**重启 `dsh web`**（本插件含 host 半），再**浏览器硬刷新**（Cmd/Ctrl+Shift+R），侧边栏 `+` 菜单里就会出现「文件」tab。

## 工作原理

| 半边 | 作用 |
|---|---|
| host（`src/index.ts` → `lib/index.js`） | 注册 `/sidebar-explorer/*` 路由：`upload`（原始字节）/ `delete` / `move` / `rename` / `mkdir`（JSON），全部限定在会话 cwd 内 |
| client（`src/client/index.tsx` → `lib/client.js`） | `ctx.betterSidebar.registerTab` 注册 `sidebar-explorer` tab，渲染文件树 + 拖拽区 + 右键菜单 |

路由契约：`POST /sidebar-explorer/<op>`；`upload` 用 query（`sessionId`/`dir`/`name`）+ 原始 body，其余用 JSON body（`sessionId`/`path`/`from`/`to`/`name`）。响应统一 `{ ok, value }`。

## 开发 / 构建

```sh
npm install           # 安装 devDependencies
npm run typecheck     # tsc --noEmit
npm run build         # esbuild 打包 + 生成 lib/types/*.d.ts
```

- `lib/` 是构建产物，**已提交进仓库**，因此从 git 安装无需任何构建步骤。
- 客户端 bundle 走 `window.__ModuleLoader__.load({ id: 'dsh-sidebar-explorer-plus', factory })` 注册，`react` 作为 external 由模块表运行时解析。

## 配置（可选）

在 profile 的挂载行加 config 可调上传大小上限（默认 50 MB）：

```yaml
- insert:
    - id: sidebar-explorer
      name: 'dsh-sidebar-explorer-plus'
      config:
        uploadLimit: 104857600   # 100 MB
```

## License

MIT

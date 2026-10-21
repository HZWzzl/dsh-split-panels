# dsh-split-panels

DSH Web 对话区横向分屏插件。侧栏、顶栏永远只有一份，只有中间对话区被切成若干栏。

## 行为

- **状态提示保留**：pane 顶栏下方渲染原生 session header 的状态 slot（Agent Team、Standard mode、后台任务、子代理、定时任务等），与原生页一致；没有状态项时不占高度。
- **颜色区分 + 侧栏同步**：每个 pane 顶栏有颜色（顶部 2px 色条 + 淡色背景 + 左侧色点），侧栏对应会话卡片同步同样的背景/左侧色条。默认按 pane 顺序从 8 色调色板分配；点顶栏色点可选预设色、自定义取色，或"默认"重置。选择存 `localStorage: dsh.split-panels.colors.v1`。
- **仅桌面端启用**：手机 / 窄触屏视口访问时插件整体停用（不渲染分屏、不拦截点击/拖拽），保持原生单会话界面；窗口尺寸变化会重新判断。

- **点击即分屏**：点击侧栏历史会话 / New Session，统一在右侧新建一个 pane（没有 pane 时先建第一个）。已打开过的会话再点击只聚焦，不重复开 pane。
- **拆分模式是粘性的**：1 个 pane 也算分屏模式；关闭到只剩 1 个仍保持分屏；关掉最后一个 pane 才回到原生单会话视图。
- **横向最多 3 个 pane**：第 4 个会被拒绝，并在屏幕正中弹提示，要求先关闭一个。
- **从不自动替换**：已有 pane 不会被替换，必须点该 pane 右上角的关闭按钮。
- **pane 顶栏只有标题 + 关闭**；无圆角/边框/卡片，彼此只用 1px 竖线隔开，无外边距内边距。
- **活体渲染**：pane 常驻挂载（切到插件页时仅 `display:none`），不会因导航重建而显示旧快照；running 状态取自会话 face。
- 中间显示插件页、设置等非会话内容时自动隐藏分屏，弹窗/模态在分屏之上。
- 布局持久化在 localStorage。

## 项目结构

```
src/client.ts        # 客户端全部逻辑（module-loader 经典脚本，非 ESM）
src/index.ts         # host 端空实现（Cordis 入口）
src/types.d.ts       # 领域类型（SplitTree / SessionColorMap / HealthSummary…）
src/globals.d.ts     # window.__ModuleLoader__ / __DSH_BOOT__ / __dshSplitPanels 声明
lib/client.js        # 构建产物（提交进仓库，link 部署直接加载）
lib/index.js
tsconfig.json        # typecheck（strict:false，逐步收紧）
tsconfig.build.json  # 构建配置
```

## 开发

```sh
pnpm add -D typescript   # 首次；本机 pnpm 根目录有 workspace，装到本目录
pnpm typecheck           # tsc --noEmit
pnpm build               # src/*.ts → lib/*.js（tsc，保留注释）
```

修改 `src/` 后执行 `pnpm build`，DSH 的 HMR 会捡到新的 `lib/client.js`；页面仍需刷新一次加载新 bundle。
`lib/` 已提交，不跑构建也能直接 link 部署当前版本。

## 安装

```sh
dsh plugin --profile web add link:/home/zzl/projects/dsh-split-panels
# 把 dsh-split-panels 加进 ~/.dsh/profiles/web/package.json 的 dsh.profile.bundles
# 重启 dsh web，刷新页面
```

## 诊断

```js
window.__dshSplitPanels.health()            // panes / active / geometry / lastError
window.__dshSplitPanels.setEnabled(false)   // 关闭分屏
window.__dshSplitPanels.reset()             // 清除持久化布局
```

## 来源

fork 自 YEYEYEYESHIFU/dsh-split-screen v1.7.0（MIT），按以上行为重写。

## 排错

如果点击会话只是切换原生视图、看不到分屏，通常是旧版本的崩溃保护把分屏暂停了：

```js
window.__dshSplitPanels.health()   // 看 enabled / safeMode / panes
window.__dshSplitPanels.setEnabled(true)
window.__dshSplitPanels.retry()
```

0.2.0 起：升级加载时会自动清掉旧版本留下的暂停状态并重新启用；只有真实连续崩溃才会进入安全模式。

# 项目审查报告 — `multi_srs_kinetics_react_front`

## 总体评价

整体架构清晰，前后端分离合理，业务逻辑完整。以下按严重程度分类列出需要改进的地方。

---

## 🔴 高优先级（有实质性隐患）

### 1. Zustand Stores 完全是死代码

三个 store（`workflowStore.ts`、`plotStore.ts`、`uiStore.ts`）**没有任何地方调用它们**。所有状态都是用 `useState` 在 `AppShell` 里管理的，这些 store 是当初设计时留下的空壳。

- `uiStore.ts` 中的 `isLeftPanelCollapsed` 状态：左侧面板**没有折叠功能**，但 store 里有完整的 toggle 逻辑。
- `workflowStore.ts` 和 `plotStore.ts` 的字段与 `AppShell` 里的 state 高度重叠，却从未同步。

**建议**：要么删掉这三个文件，要么真正迁移到 Zustand 管理状态。

---

### 2. `useApiHooks.ts` 是未使用的基础设施

`src/hooks/api/useApiHooks.ts` 定义了 6 个 `useMutation` hook，但 **AppShell 直接用 `apiClient.post()` 调用接口，完全绕过了这些 hook**。

结果等于有两套 API 调用层，只有一套在工作。

**建议**：统一使用其中一种方式。如果保留 hook，需要把 AppShell 里的直接调用迁移过去；如果不用，删掉 `useApiHooks.ts`。

---

### 3. `App.css` 是 Vite 模板残留，应删除

`src/App.css`（185 行）全是 Vite 初始化模板的样式（`.hero`、`.counter`、`#center`、`#next-steps` 等），项目里**没有任何组件引用这些类名**，而且 `App.tsx` 也没有 `import './App.css'`。

这个文件是纯无用代码，可以直接删除。

---

### 4. `AppShell.tsx` 体积过大（874 行），职责过于集中

整个应用的状态（30+ 个 `useState`）、所有业务逻辑（提取、积分、拟合、图表渲染、record 存储）都在一个组件里。这是典型的 "God Component" 问题：

- 难以测试
- 难以维护
- `useEffect` 的依赖数组有 20 个依赖项（第 753–774 行），非常脆弱

**建议**：按业务域拆分状态，例如将提取相关、积分相关、拟合相关各自抽成 custom hook 或迁移至 Zustand。

---

## 🟡 中优先级（影响质量或健壮性）

### 5. `package.json` 同时安装了两个 Plotly 包

```json
"plotly.js": "^2.30.0",
"plotly.js-basic-dist": "^2.30.0",
```

但实际只用了 `plotly.js/dist/plotly`（见 `usePlotly.ts`），`plotly.js-basic-dist` 没被引用。两个都是重量级包，共同打包会让 bundle 非常大。

**建议**：删除 `plotly.js-basic-dist`，保留 `plotly.js`。另外建议对 Plotly 做更彻底的按需引入（如只打包 `scatter` trace）。

---

### 6. 后端使用 `tempfile._get_candidate_names()` 生成 run_id

`main.py` 第 354 行：
```python
run_id = next(tempfile._get_candidate_names())
```

这是 Python 标准库的**私有 API**（下划线前缀），Python 版本升级后可能失效。

**建议**：改用 `import secrets; run_id = secrets.token_hex(8)` 或 `uuid.uuid4().hex[:12]`。

---

### 7. 后端 `/integrate` 接口接受两种完全不同的 payload 格式

接口同时支持：
- 直接传 `wavenumbers/time/spectra` 数组
- 传 `run_id + filename` 让后端自己读文件

但前端从不传数组，只用 `run_id + filename` 方式。这种过度泛化引入了额外复杂度，且没有被使用。

**建议**：如果不需要，移除内嵌数组的路径，统一为 `run_id + filename`。

---

### 8. `KineticsPlot.tsx` 依赖 Plotly 私有内部 API

```typescript
const axis = plotDiv?._fullLayout?.xaxis;
setAxisMeta({
  offset: axis._offset,
  length: axis._length,
  l2p: axis.l2p.bind(axis),
  p2l: axis.p2l.bind(axis),
});
```

`_fullLayout`、`_offset`、`_length`、`l2p`、`p2l` 都是 Plotly 的内部属性（前缀 `_`），Plotly 升级后可能直接失效。`WaterfallPlot.tsx` 也有同样的问题。

这是支撑拖拽 fit range 功能的关键代码，一旦 Plotly 改变内部结构就会静默失效。

**建议**：在关键路径加防御性检查，或者换用 Plotly 的公开事件（`plotly_relayout` 配合 `shapes`）来实现范围拖拽。

---

### 9. `sampleColors('None', count)` 在 count > 10 时会循环使用颜色

`workflowUtils.ts` 第 132 行：
```typescript
if (scaleName === 'None') return anchors.slice(0, count);
```

`None` 调色板只有 10 个颜色，当 `count > 10` 时会被截断。但其他调色板会插值并返回任意数量。这两者行为不一致，且对 `None` 方案来说当文件数量很多时会返回不足数量的颜色，导致 `palette[idx % palette.length]` 循环复用颜色但无法直观分辨。

**建议**：给 `None` 方案也做循环处理，或提示用户切换方案。

---

## 🟢 低优先级（细节完善）

### 10. `index.html` 的 `<title>` 是原始项目名

```html
<title>multi_srs_kinetics_react_front</title>
```

用户实际看到的浏览器标签页标题是项目目录名，应改为有意义的名称（如 "Multi SRS Studio"）。

---

### 11. `apiClient.ts` 中有一条未完成的 TODO 注释

```typescript
// Optionally: Hook into UI Zustand store here to automatically show Toasts on API errors
```

这个注释指向了一个明确的功能意图（全局 API 错误处理），但从未实现，也没有 issue 跟踪。

---

### 12. `start.py` 在生产模式下仍开启了 `--reload`

```python
uvicorn backend.app.main:app --reload ...
```

`start.py` 定位是生产/日常使用入口，但 `--reload` 是开发模式功能，会监控文件变动并重启，对生产环境来说既浪费资源又有安全风险。

**建议**：`start.py` 去掉 `--reload`，只在 `dev.py` 中保留。

---

### 13. `WaterfallPlot` 中 `visibleRange` 计算对单帧数据会崩

```typescript
const visibleRange = {
  start: Math.min(...frameIdx.map((idx) => dataset.time[idx])),
  end: Math.max(...frameIdx.map((idx) => dataset.time[idx])),
};
```

如果 `frameIdx` 为空（极端数据），`Math.min()` 和 `Math.max()` 会返回 `Infinity`/`-Infinity`，然后 `emitVisibleTimeRangeChange` 会向上传递无效值。

---

### 14. `handleFigurePanelChange` 每次输入都触发后端请求

用户在 Figure Settings 里输入坐标轴标题时，每按一个键都会立即调用 `/render-fit-figures`，没有 debounce。这会造成大量无效的图片渲染请求。（而 `handleIntegrationRangeChange` 已经正确做了 debounce）

**建议**：对 `handleFigurePanelChange` 也加防抖（300–500ms）。

---

## 总结

| 优先级 | 问题数 | 主要类别 |
|--------|--------|----------|
| 🔴 高 | 4 | 死代码、过度集中的组件 |
| 🟡 中 | 5 | 安全性、稳定性、性能 |
| 🟢 低 | 5 | UX 细节、防御性编程 |

最值得立即处理的是：**删除 3 个未使用的 Zustand store 和 `App.css`**（零风险），以及**修复 start.py 中的 `--reload`**（容易改且有实际影响）。

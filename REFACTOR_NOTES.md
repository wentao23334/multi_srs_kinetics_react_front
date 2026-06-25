# 重构台账

日期：2026-06-22

目标：在不改变现有使用体验的前提下，降低项目复杂度，给核心流程补最小回归检查。

## 当前原则

- 优先删除无用代码，再考虑新增结构。
- 只拆有清楚边界的代码，不为了行数好看强拆。
- 每轮改动后至少跑 `npm run build`、`npm run lint`、`npm test`。
- 用户已确认前一次主流程体验正常；`LeftControlPanel` 拆分后仍建议再点一次左侧 Step 展开和主流程。

## 已完成

- 依赖和模板清理：
  - 删除未使用依赖和模板资源。
  - 删除未使用的 `SafePlot`。
  - 删除空的 React Query provider 和无效 axios interceptor。
- Plotly 瘦身：
  - 从完整 Plotly 改为 `plotly.js/dist/plotly-basic`。
  - 保留当前同步加载，不做动态加载，因为用户当前不觉得卡，收益和复杂度不匹配。
- API 边界整理：
  - 新增 `workflowApi`，把接口调用集中到一层。
  - 补齐前后端 API 类型。
- 状态和业务拆分：
  - 新增 `useExtractionSource` 管理文件夹扫描和文件选择。
  - 新增 `useDatasetWorkflow` 管理 dataset、integration cache、fit ranges。
  - 新增 `runRecordUtils` 管理运行记录快照。
  - 新增 `useResizablePanes` 和 `layoutUtils` 管理左右栏拖拽布局。
  - 把拟合循环抽成 `runFitsForFiles`。
  - 把 fit 图片 URL 操作抽成纯 helper。
- 左侧面板整理：
  - 新增 `LeftControlPanelCards`，承载独立表单卡片。
  - `LeftControlPanel` 从约 817 行降到约 519 行。
  - 没有继续拆 5 个 Step 主体，避免引入过多 props 传递。
- 回归检查：
  - 新增 `npm test`。
  - 新增前端 `node --test` 覆盖核心纯逻辑。
  - 新增后端 smoke 测试覆盖 `integrate` 和 `fit_kinetics`。

## 未完成

- `backend/app/main.py` 仍偏集中，后续可按绘图、数据读取、拟合拆分。
- `LeftControlPanel` 的 5 个 Step 主体仍在同一文件内，暂不拆，除非后续实际维护痛点明显。
- Plotly chunk 仍大于 500KB，但当前不做动态加载。
- 浏览器端完整自动化测试尚未建立，目前依赖用户手动点主流程。

## 已知风险

- 并行跑 `npm run build` 和其他 npm 命令时，Vite/Rolldown 曾偶发 HTML 输出错误；单独跑 `npm run build` 通过。
- 图表拖拽范围依赖 Plotly 内部布局字段，升级 Plotly 时需要重点回归 waterfall 和 kinetics 交互。
- 后端仍有部分宽 payload 支持和集中式路由，继续拆前应先补对应 smoke 或小测试。

## 下一步建议

1. 用户再手动验证一次左侧 5 个 Step 展开、提取、积分、拟合、出图。
2. 暂停前端结构重构，优先处理真实痛点。
3. 若继续重构，优先从后端 `main.py` 中拆纯绘图 helper，并保持每次只拆一个边界。

## 每轮检查清单

```bash
npm run build
npm run lint
npm test
```


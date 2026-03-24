# Multi SRS Kinetics

这个版本已经把 React 前端和 Python 后端整合到同一个仓库里，不再依赖外部的 `/Users/wentao/multi_srs_kinetics_webapp`，日常使用只需要在这个目录里启动一次。

## 目录说明

- `src/`: React 前端
- `backend/app/`: FastAPI API 和 `srs_extractor`
- `backend/data/runs/`: 运行时提取结果、拟合图、`run_record.json`
- `start.py`: 单命令启动入口，会在需要时自动先构建前端
- `dev.py`: 单命令开发入口，会同时拉起 FastAPI 和 Vite

## 首次安装

第一次配置时，在当前目录执行：

```bash
cd /Users/wentao/multi_srs_kinetics_react_front
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
```

## 日常使用

以后正常分析数据时，只需要在这个目录执行一次：

```bash
cd /Users/wentao/multi_srs_kinetics_react_front
source .venv/bin/activate
python3 start.py
```

然后打开 [http://127.0.0.1:8000](http://127.0.0.1:8000)。

`start.py` 会做两件事：

1. 如果前端还没打包，或者源码比 `dist/` 更新，就自动执行 `npm run build`
2. 启动 FastAPI，并直接服务当前仓库里的前端页面

所以现在没有“去另一个目录开 `uvicorn`，再回来开 `npm run dev`”这种流程了。

## 开发模式

如果你在改前端界面，希望保留 Vite 热更新，也不需要手动开两个终端，直接在当前目录执行：

```bash
cd /Users/wentao/multi_srs_kinetics_react_front
source .venv/bin/activate
python3 dev.py
```

这会同时启动：

- FastAPI: `http://127.0.0.1:8000`
- Vite: `http://127.0.0.1:5173`

## 当前技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Plotly.js
- FastAPI + Uvicorn
- NumPy / SciPy / Matplotlib

## 说明

- 所有 API 都在这个仓库的 `backend/app/main.py`
- `srs_extractor` 也已经复制到这个仓库里
- 旧项目 `/Users/wentao/multi_srs_kinetics_webapp` 不再是运行依赖，只保留作历史参考

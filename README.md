# Multi SRS Kinetics

这个版本已经把 React 前端和 Python 后端整合到同一个仓库里，不再依赖外部的 `/Users/wentao/multi_srs_kinetics_webapp`，日常使用只需要在这个目录里启动一次。

## 目录说明

- `src/`: React 前端
- `backend/app/`: FastAPI API 和 `srs_extractor`
- `backend/data/runs/`: 运行时提取结果、拟合图、`run_record.json`
- `start.py`: 单命令启动入口，会在需要时自动先构建前端
- `dev.py`: 单命令开发入口，会同时拉起 FastAPI 和 Vite

## 环境原则

不要直接用系统 Python 裸跑本项目。`start.py` 和 `dev.py` 会使用当前命令行里的 `python`，也就是 `sys.executable` 指向的解释器；如果没有先进入项目环境，依赖可能会装到全局 Python，或者启动时找不到 `uvicorn`、`fastapi`、`numpy` 等包。

推荐在项目根目录使用 `.venv`。仓库已经在 `.gitignore` 中忽略 `.venv`，不会提交到 GitHub。

## 首次安装

第一次配置时，在项目根目录执行：

### Windows / PowerShell

```powershell
cd D:\multi_srs_kinetics_react_front
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
npm install --legacy-peer-deps
```

如果 PowerShell 阻止激活脚本，可以只为当前用户放开本地脚本执行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

如果你明确使用 conda，也可以用 conda 环境代替 `.venv`，但日常启动前必须先 `conda activate <env-name>`，不要在未激活环境时运行 `python dev.py` 或 `python start.py`。

### macOS / Linux

```bash
cd /path/to/multi_srs_kinetics_react_front
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
npm install --legacy-peer-deps
```

## 日常使用

### 推荐：开发/日常分析模式

这是当前最稳定的启动方式，会同时拉起后端和前端开发服务器：

#### Windows / PowerShell

```powershell
cd D:\multi_srs_kinetics_react_front
.\.venv\Scripts\Activate.ps1
python dev.py
```

#### macOS / Linux

```bash
cd /path/to/multi_srs_kinetics_react_front
source .venv/bin/activate
python3 dev.py
```

启动后访问：

- 前端：<http://127.0.0.1:5173>
- 后端：<http://127.0.0.1:8001>

### `start.py` 的用途

`start.py` 是**生产/单服务模式**入口。它会先执行 `npm run build`，然后由 FastAPI 直接服务 `dist/` 里的前端静态文件。

只有在前端可以成功 build 时，才建议使用：

#### Windows / PowerShell

```powershell
cd D:\multi_srs_kinetics_react_front
.\.venv\Scripts\Activate.ps1
python start.py
```

#### macOS / Linux

```bash
cd /path/to/multi_srs_kinetics_react_front
source .venv/bin/activate
python3 start.py
```

默认访问地址：<http://127.0.0.1:8000>

## 开发模式

如果你在改前端界面，希望保留 Vite 热更新，也不需要手动开两个终端，直接在当前目录执行：

### Windows / PowerShell

```powershell
cd D:\multi_srs_kinetics_react_front
.\.venv\Scripts\Activate.ps1
python dev.py
```

### macOS / Linux

```bash
cd /path/to/multi_srs_kinetics_react_front
source .venv/bin/activate
python3 dev.py
```

这会同时启动：

- FastAPI: `http://127.0.0.1:8001`
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

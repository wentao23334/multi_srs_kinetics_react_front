# Multi SRS Kinetics (React 前端)

这是一个为 `multi_srs_kinetics_webapp` 专门重构的现代 React 前端控制台。它彻底替代了之前依靠原生 HTML/JS 的旧版网页，转而采用行业标准的 React 单页应用 (SPA) 架构，利用状态管理机制让界面更流畅、维护更方便。

## 🎯 核心特性

- **现代深色工作台 UI：** 基于 Tailwind CSS 和 Sonner 打造丝滑流畅的科学数据分析体验。
- **高性能交互图表：** 无缝集成 `react-plotly.js`，支持在图表上通过拖拽直接设置积分范围或动力学拟合边界，实现“半受控”双向绑定计算。
- **状态分层管理：** 使用 [Zustand](https://github.com/pmndrs/zustand) 管理 UI 和绘制参数的全局交互状态；使用 [React Query](https://tanstack.com/query/latest) 接管后端数据的拉取、缓存及加载反馈（Loading/Error Toasts）。
- **完全解耦：** 前端运行在独立的 Node.js 开发服务器中（默认 `5173` 端口），纯粹通过 API 与本机的 Python 核心 (`8000` 端口) 交互。

---

## 🚀 启动指南 (运行日常分析工作)

因为我们目前采用了**前后端分离**的架构，所以你每次想要使用这个工具时，需要分别启动**后端（Python 计算引擎）**和**前端（React 交互界面）**。

### 第一步：启动核心后端 (Python FastAPI)

请新开一个终端窗口（Terminal 1），进入你**原来的项目目录**里的 `backend` 文件夹，并像往常一样启动计算服务。

```bash
# 1. 切换到原生后端目录 (根据你的实际路径调整)
cd /Users/wentao/multi_srs_kinetics_webapp/backend

# 2. 激活你的 Python 虚拟环境 (如果是 .venv)
source .venv/bin/activate

# 3. 启动 Uvicorn 本地服务（运行在 8000 端口）
uvicorn app.main:app --reload
```
后端启动后，请将这个终端挂在后台，不要关闭。

### 第二步：启动控制台前端 (React + Vite)

请再新开第二个终端窗口（Terminal 2），进入**本页面所在的全新 React 前端目录**。

```bash
# 1. 切换到新的前端目录
cd /Users/wentao/multi_srs_kinetics_react_front

# 2. 如果是第一次拉取代码或者别人刚拉取，请先安装依赖 (你平时不需要重复安装)
# npm install

# 3. 开启前端主控制面板服务
npm run dev
```

启动完毕后，终端上会弹出一个本地地址（通常是 `http://localhost:5173/`）。你只需要 **按住 `Cmd / Ctrl` 点击该链接**，它就会在你的浏览器里自动打开了！

---

## 🛠️ 技术栈清单

- **构建工具：** [Vite 8](https://vitejs.dev/)
- **框架：** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **样式方案：** [Tailwind CSS 4](https://tailwindcss.com/)
- **全局状态：** [Zustand](https://zustand-demo.pmnd.rs/)
- **网络与服务端缓存：** [TanStack Query (React Query)](https://tanstack.com/query/latest) + [Axios](https://axios-http.com/)
- **图表呈现：** [Plotly.js](https://plotly.com/javascript/)
- **UI 反馈组件：** [Sonner (Toasts)](https://sonner.emilkowal.ski/)

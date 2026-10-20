# 恋爱集市 · Love Market

> 面向校园的恋爱社交社区平台 —— 帖子信息流、点赞评论、分区发帖、关键词搜索与个人资料管理。

<p>
  <img alt="Vue" src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white">
  <img alt="Vue Router" src="https://img.shields.io/badge/Vue%20Router-4-4FC08D?logo=vue.js&logoColor=white">
  <img alt="Pinia" src="https://img.shields.io/badge/Pinia-2-FFD859?logo=pinia&logoColor=black">
  <img alt="Axios" src="https://img.shields.io/badge/Axios-1.7-5A29E4?logo=axios&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

---

## 📖 项目简介

**恋爱集市** 是一个面向校园场景的恋爱社交社区 Web 应用。用户注册登录后，可以在广场浏览帖子信息流、点赞与评论、按分区发布帖子、通过关键词搜索内容，并维护个人资料；首页配套轮播推荐与实时热榜。

项目为**纯前端 SPA**，通过 RESTful API 与后端服务通信，使用 hash 路由模式部署，并集成 PWA 支持离线访问。

---

## ✨ 功能特性

| 模块 | 说明 |
|---|---|
| **用户体系** | 注册（5 层前端校验）、登录、登录态持久化与跨刷新恢复 |
| **帖子信息流** | 广场列表、滚动触底分页加载、加载三态提示 |
| **帖子详情** | 正文展示、点赞 / 取消点赞、评论区发布 |
| **发布帖子** | 标题 + 分区标签下拉选择 + 正文，发布后跳转详情 |
| **搜索** | 关键词搜索帖子，独立结果页 |
| **我的帖子** | 个人帖子列表、分页、删除 |
| **个人资料** | 资料展示与编辑（头像、昵称、学校、兴趣、签名等） |
| **热榜** | 侧边栏热榜，10 分钟长间隔轮询刷新 |

---

## 🛠 技术栈

| 类别 | 选型 |
|---|---|
| 框架 | Vue 3.5（Composition API + Options API 混用） |
| 构建 | Vue CLI 5（webpack 5） |
| 路由 | Vue Router 4（hash 模式 + 路由级懒加载） |
| 状态管理 | Pinia 2 |
| 网络 | Axios 1.7（统一实例 + 请求/响应拦截器） |
| UI 组件 | Swiper 11（轮播） |
| 其他 | PWA（Service Worker 离线缓存）、Browserslist 兼容降级 |

---

## 🏗 目录结构

```
src/
├── components/          # 可复用组件
│   ├── Header.vue       # 全局顶栏（导航 + 搜索 + 响应式断点）
│   ├── PostList.vue     # 信息流容器（分页 / 加载互斥 / 触底监听）
│   ├── PostItem.vue     # 帖子卡片（纯展示，props 数据契约）
│   ├── Sidebar.vue      # 热榜侧边栏
│   └── ChatView.vue     # 私信会话视图
├── views/               # 路由页面
│   ├── Login.vue        # 登录
│   ├── Register.vue     # 注册（含多层表单校验）
│   ├── Home.vue         # 首页轮播
│   ├── Square.vue       # 广场信息流
│   ├── Postdetail.vue   # 帖子详情 + 评论
│   ├── Postposts.vue    # 发布帖子
│   ├── Searchpost.vue   # 搜索结果
│   ├── ProfilePage.vue  # 个人主页
│   ├── SettingsPage.vue # 资料设置
│   ├── view_my_posts.vue# 我的帖子
│   └── NotFound.vue     # 404 兜底页
├── request/
│   └── request.js       # 统一请求层（拦截器 / 鉴权 / 错误归一化）
├── router/
│   └── index.js         # 路由表 + 全局鉴权守卫
├── store/
│   └── chatStore.js     # Pinia store（会话与登录态）
├── assets/              # 图片资源
├── App.vue
└── main.js
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm >= 8

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 生产构建
npm run build
```

### 后端接口配置

项目的后端地址集中定义在 `src/request/request.js`：

```js
export const BASE_URL = 'http://localhost:8080'
```

请根据实际情况修改为你的后端服务地址。**所有接口请求都会自动使用该地址**，业务代码中只写相对路径（如 `/api/v1/posts`）。

---

## 🔧 核心实现说明

### 1. 统一请求层与鉴权拦截

所有网络请求收敛到单一 `request` 实例（`src/request/request.js`），业务代码不再直接使用 Axios：

- **请求拦截器**：根据本地登录态实时注入 `Authorization: Bearer <token>`；未登录时显式清除该头，避免误带上一个用户的凭证
- **响应拦截器**：
  - 统一剥离一层响应体，业务层直接拿到 body
  - `401/403` → 清理本地登录态并回跳登录页（带去重开关，避免并发请求重复跳转）
  - 超时 / 断网 / 4xx / 5xx → 归一化为可读提示
  - 非 JSON 响应（如 HTML 错误页）→ 容错返回原文，不再中断 Promise 链
  - `responseType === 'blob'` 的文件下载响应单独放行
- **地址集中管理**：后端地址收敛为 `BASE_URL` 单一常量，便于多环境切换

### 2. 路由级鉴权与导航兜底

`src/router/index.js` 通过全局前置守卫实现：

- 以 `meta.public` 标记免登录白名单，未标记的路由默认要求登录
- 未登录访问受保护页面 → 重定向到登录页并携带 `?redirect=`，登录后**原路返回**（含开放重定向防护）
- 已登录访问登录 / 注册页 → 自动跳转首页
- `/:pathMatch(.*)*` 兜底路由 + 404 页面，避免未匹配地址白屏
- `afterEach` 统一维护 `document.title`

> **实现要点**：守卫内不引用 Pinia store，而是直接读取持久化登录态。这样可以规避「router 先于 `app.use(pinia)` 加载」以及「请求层 ↔ 路由层循环依赖」两个问题。

### 3. 组件复用与分页

- `PostList`（容器）与 `PostItem`（展示）分离，**广场页与搜索结果页共用同一套渲染逻辑**
- `PostItem` 的全部 props 提供默认值，字段缺失时降级显示而非渲染 `undefined`
- 分页采用滚动触底增量加载，并用加载互斥锁防止滚动事件高频触发重复请求
- 通过 `isExhausted` 状态位在「无更多数据」后主动解绑滚动监听

### 4. 稳定性与容错设计

| 场景 | 处理方式 |
|---|---|
| 本地登录态数据损坏 | 防御式解析（try/catch + 结构校验），降级为「未登录」而非抛错 |
| 未登录时初始化 store | 静默返回，不发起必然失败的请求 |
| 时间字段非法 | 格式化前校验，非法值返回原文，避免渲染 `NaN-NaN-NaN` |
| 组件卸载 | 使用 Vue 3 的 `beforeUnmount` 释放监听器与定时器 |
| 接口异常 | `catch` 兜底 + 用户可读提示，避免静默失败或页面崩溃 |

### 5. 兼容性

- `.browserslistrc` 配置目标浏览器范围（`> 1%`、`last 2 versions`、`not dead`、`not ie 11`）
- 生产构建启用 Service Worker 离线缓存（PWA）

---

## ⚠️ 已知限制

本项目为学习 / 演示性质，以下方面尚未完善，欢迎作为改进方向：

- **无自动化测试**：缺少单元测试与端到端测试，回归依赖手工验证
- **无 ESLint / Prettier**：代码风格靠约定，未做静态检查约束
- **无 CI/CD**：未配置持续集成与自动化部署流水线
- **依赖安全欠账**：`npm audit` 存在待处理 advisory，其中 `swiper` 的修复版本跨主版本，需评估升级影响
- **私信模块**：仅为雏形，功能未完整实现
- **时间格式化重复**：三处独立实现，且直接按本地时区格式化 ISO 时间，存在时区处理隐患

---

## 📄 许可证

本项目基于 [MIT License](https://choosealicense.com/licenses/mit/) 开源，仅供学习交流使用。

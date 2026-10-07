import axios from 'axios'
import router from '../router'

// ============================================================================
// 全局接口配置
// 原代码把 http://127.0.0.1:8080 硬编码在 17 个文件里（另有 1 处写成 localhost），
// 两台主机在浏览器中属于不同源，CORS 白名单只放行一个时会出现"部分接口莫名被拦"。
// 这里收敛为单一常量，后续接环境变量只需改这一行。
// ============================================================================
export const BASE_URL = 'http://localhost:8080'
export const REQUEST_TIMEOUT = 5000

// 业务成功码：后端统一使用 1000 表示成功
const SUCCESS_CODE = 1000

// 创建 axios 实例
const request = axios.create({
  // `baseURL` 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL
  baseURL: BASE_URL,
  // `timeout` 指定请求超时的毫秒数(0 表示无超时时间)
  timeout: REQUEST_TIMEOUT,
})

// ============================================================================
// 登录态读取与失效处理
// 这里直接读 localStorage，而不是引入 Pinia store：
// 其一，router 会 import 本文件，若再反向 import store 会形成循环依赖；
// 其二，登录态本就是以 localStorage 为唯一持久化来源，直接读取语义更清晰。
// ============================================================================
export function getToken() {
  try {
    return localStorage.getItem('token') || ''
  } catch (error) {
    return ''
  }
}

export function isLoggedIn() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw || !getToken()) return false
    const user = JSON.parse(raw)
    return !!(user && typeof user === 'object' && user.userid != null)
  } catch (error) {
    // 本地数据损坏时按未登录处理，绝不能因为解析失败而阻断导航
    return false
  }
}

// token 失效时可能多个并发请求同时返回 401，
// 用一个开关保证只跳转一次，避免路由被反复 push 或出现死循环。
let redirectingToLogin = false

function handleUnauthorized() {
  if (redirectingToLogin) return
  redirectingToLogin = true

  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  } catch (error) {
    console.warn('[request] 清理本地登录态失败:', error)
  }
  delete axios.defaults.headers.common['Authorization']

  const current = router.currentRoute.value
  // 已经在登录页就不要再跳，否则会形成重定向循环
  if (current && current.path === '/login') {
    redirectingToLogin = false
    return
  }

  console.warn('[request] 登录已过期，请重新登录')
  router
    .push({ path: '/login', query: { redirect: current ? current.fullPath : '/home' } })
    .catch(() => {})
    .finally(() => {
      // 留出一点缓冲，避免同一批并发请求在跳转完成前重复触发
      setTimeout(() => {
        redirectingToLogin = false
      }, 1000)
    })
}

// ============================================================================
// 错误归一化：把 axios 各种失败形态翻译成一句人话
// ============================================================================
function resolveErrorMessage(error) {
  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
    return '请求超时，请检查网络后重试'
  }
  if (!error.response) {
    return '网络连接失败，请确认后端服务已启动'
  }
  const status = error.response.status
  if (status === 401 || status === 403) {
    return '登录状态已失效，请重新登录'
  }
  if (status === 404) {
    return '请求的接口不存在（404），请确认接口地址'
  }
  if (status >= 500) {
    return '服务器开小差了（' + status + '），请稍后重试'
  }
  return '请求失败（' + status + '）'
}

// ============================================================================
// 拦截器注册
// 同时注册到 axios 全局默认实例和 request 实例上：
// 项目里仍有 38 处业务代码直接使用裸 axios，注册到全局可以让它们立刻共享
// 统一的鉴权注入与 401 处理，无需一次性改动全部调用点。
// ============================================================================
function registerInterceptors(instance) {
  // ---------------------------- 请求拦截器 ----------------------------
  // 可以自请求发送前对请求做一些处理，比如统一加 token
  instance.interceptors.request.use(
    (config) => {
      if (!config.headers) config.headers = {}

      // 统一鉴权注入：原先这段逻辑散落在 9 处业务代码里重复书写，
      // 且写在模块加载期（token 可能还是 null，会写入字面量 "Bearer null"）。
      const token = getToken()
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      } else {
        // 未登录时不能带空令牌，显式清掉，避免命中上一个用户的登录态
        delete config.headers['Authorization']
      }

      // 有响应体时才声明 Content-Type，GET 请求无需声明避免触发预检
      if (!config.headers['Content-Type'] && config.data !== undefined) {
        config.headers['Content-Type'] = 'application/json;charset=utf-8'
      }

      return config
    },
    (error) => Promise.reject(error)
  )

  // ---------------------------- 响应拦截器 ----------------------------
  // 可以在接口响应后统一处理结果
  instance.interceptors.response.use(
    (response) => {
      let res = response.data

      // 如果是返回的文件
      // Blob(Binary long Object) 是二进制长对象，通常用于存储图片或声音文件
      if (response.config && response.config.responseType === 'blob') {
        return res
      }

      // 兼容服务端返回的字符串数据。
      // 原实现是裸的 JSON.parse(res)，服务端返回非 JSON 文本（如 HTML 报错页、
      // 空字符串 "ok"）时会直接抛错并中断整个 Promise 链，这里必须兜住。
      if (typeof res === 'string') {
        if (!res) return res
        try {
          res = JSON.parse(res)
        } catch (error) {
          console.warn('[request] 响应不是合法 JSON，已按原文返回:', res.slice(0, 120))
          return res
        }
      }

      return res
    },
    (error) => {
      const status = error.response && error.response.status

      // 401/403 统一交给登录态失效流程：清理本地凭证并跳回登录页
      if (status === 401 || status === 403) {
        handleUnauthorized()
      } else {
        // 其余错误给出可读提示，替代原先仅 console.log 的静默失败。
        // 业务侧仍可用 .catch 做更细的兜底，这里只保证"不会白屏、不无声失败"。
        const message = resolveErrorMessage(error)
        console.error('[request] ' + message, error.config ? error.config.url : '')
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(message)
        }
      }

      return Promise.reject(error)
    }
  )
}

registerInterceptors(axios)
registerInterceptors(request)

// 导出成功码，供业务侧判断 response.data.code 时复用，避免魔法数字散落
export { SUCCESS_CODE }

export default request

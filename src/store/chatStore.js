import { defineStore } from 'pinia'
// 统一使用封装好的 request 实例：baseURL、超时、鉴权头注入、错误兜底
// 全部由 src/request/request.js 的拦截器集中处理，本文件不再关心网络细节。
import request from '../request/request.js'

/**
 * 安全读取 localStorage 中的登录用户信息。
 * 未登录 / 数据被清空 / JSON 损坏时必须返回 null，绝不能抛出异常：
 * Pinia 的 state() 在 store 首次被使用时同步执行，一旦抛错会导致整个页面白屏。
 */
function readStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // 必须是对象，且至少包含 userid，否则视为无效登录态
    if (!parsed || typeof parsed !== 'object' || parsed.userid == null) return null
    return parsed
  } catch (error) {
    console.warn('[chatStore] 本地用户信息解析失败，已按未登录处理:', error)
    return null
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem('token') || null
  } catch (error) {
    return null
  }
}

/**
 * 兼容后端可能返回 data 直接为数组、或 data.data 为数组的两种结构。
 * 注意：request 拦截器已剥离一层 axios response，这里收到的是响应体本身。
 */
function pickList(body, key) {
  if (!body) return []
  const nested = body.data
  if (Array.isArray(nested)) return nested
  if (nested && Array.isArray(nested[key])) return nested[key]
  if (Array.isArray(body[key])) return body[key]
  return []
}

function describeError(scope, error) {
  const url = (error && error.config && error.config.url) || ''
  const detail = error && error.response ? error.response.data : error && error.message
  console.error(`[chatStore] ${scope}失败:`, detail, url ? `(URL: ${url})` : '')

  // 令牌失效时清理本地登录态，避免页面停留在"看似已登录但所有请求都失败"的状态
  if (error && error.response && (error.response.status === 401 || error.response.status === 403)) {
    return 'UNAUTHORIZED'
  }
  return 'FAILED'
}

export const useChatStore = defineStore('chat', {
  state: () => {
    // 这里必须做空值兜底，否则未登录访问任意页面都会抛 TypeError 白屏
    const storedUser = readStoredUser()
    return {
      me: [],
      users: [], // 从后端获取
      messages: [], // 从后端获取
      activeFriendId: null, // 当前选中的好友 ID
      currentUserId: storedUser ? storedUser.userid : null, // 当前用户 ID，未登录为 null
      token: readStoredToken(), // 登录令牌
    }
  },
  getters: {
    // 是否已持有一个可用的登录态
    isLoggedIn: (state) => state.currentUserId != null && !!state.token,
    // 获取当前选中的好友信息
    activeFriend: (state) => state.users.find((user) => user.id === state.activeFriendId),
    // 获取当前用户的聊天记录
    activeMessages: (state) =>
      state.messages.filter(
        (msg) =>
          (msg.sender_id === state.currentUserId && msg.receiver_id === state.activeFriendId) ||
          (msg.sender_id === state.activeFriendId && msg.receiver_id === state.currentUserId)
      ),
  },
  actions: {
    /**
     * 页面加载时调用：从本地持久化数据恢复登录态与用户信息。
     * 未登录时静默返回，不发起任何请求，避免未登录状态下刷出一屏报错。
     */
    hydrate() {
      const storedUser = readStoredUser()
      const storedToken = readStoredToken()
      this.currentUserId = storedUser ? storedUser.userid : null
      this.token = storedToken
      if (this.currentUserId == null || !storedToken) {
        // 回到干净的未登录状态
        this.me = []
        return false
      }
      return true
    },

    // 退出登录：清理本地登录态，避免残留 token 被后续请求误用。
    // Authorization 头已改由 request.js 的请求拦截器按 localStorage 实时注入，
    // 这里只需清掉持久化数据，下一次请求自然不会携带令牌。
    logout() {
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } catch (error) {
        console.warn('[chatStore] 清理本地登录态失败:', error)
      }
      this.token = null
      this.currentUserId = null
      this.me = []
      this.users = []
      this.messages = []
      this.activeFriendId = null
    },

    async fetchMe() {
      if (!this.isLoggedIn) {
        console.warn('[chatStore] 未登录，跳过 fetchMe')
        return
      }
      try {
        console.log('Getting...')
        const response = await request.get('/api/v1/message/getme')
        if (response.code === 200) {
          this.me = response.data
          console.log('个人信息获取成功:', this.me)
        } else {
          console.error('获取个人信息失败，后端返回错误:', response.message)
        }
      } catch (error) {
        if (describeError('获取个人信息', error) === 'UNAUTHORIZED') this.logout()
      }
    },

    // 从后端获取用户列表
    async fetchUsers() {
      if (!this.isLoggedIn) {
        console.warn('[chatStore] 未登录，跳过 fetchUsers')
        return
      }
      try {
        const response = await request.get('/api/v1/message/getfriends')
        if (response.code === 200) {
          this.users = pickList(response, 'data').map((user) => ({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
          }))
          console.log('用户列表获取成功:', this.users)
        } else {
          console.error('获取用户列表失败，后端返回错误:', response.message)
        }
      } catch (error) {
        if (describeError('获取用户列表', error) === 'UNAUTHORIZED') this.logout()
      }
    },

    // 从后端获取消息列表
    async fetchMessages() {
      if (!this.isLoggedIn) {
        console.warn('[chatStore] 未登录，跳过 fetchMessages')
        return
      }
      if (this.activeFriendId == null) {
        // 未选中好友时不请求，避免发出一份无意义的空查询
        this.messages = []
        return
      }
      try {
        const response = await request.post('/api/v1/message/getmessages', {
          friend_id: this.activeFriendId,
        })
        if (response && response.code === 200) {
          const rawList = pickList(response, 'messages')
          console.log('Response messages:', rawList)
          this.messages = rawList.map((msg) => ({
            id: msg.mid, // 对应后端的 ID 字段
            sender_id: msg.send_user_id, // 映射到 SenderID
            receiver_id: msg.rev_user_id, // 映射到 ReceiverID
            text: msg.content, // 映射到 Text
            timestamp: String(msg.create_time),
          }))
          console.log('Mapped messages:', this.messages)
        } else {
          console.error('后端返回错误:', response)
        }
      } catch (error) {
        if (describeError('获取消息列表', error) === 'UNAUTHORIZED') this.logout()
      }
    },

    // 设置当前选中的好友
    setActiveFriend(friendId) {
      this.activeFriendId = friendId
    },

    // 发送消息到后端
    async sendMessage(messageContent) {
      if (!this.isLoggedIn) {
        console.warn('[chatStore] 未登录，无法发送消息')
        return
      }
      let sent = false
      try {
        const requestData = {
          rev_user_id: this.activeFriendId,
          content: messageContent.text,
        }
        const response = await request.post('/api/v1/message/send', requestData)
        if (response && response.code === 200) {
          // 将返回的新消息添加到本地状态
          this.messages.push({
            mid: response.message.mid,
            send_user_id: this.currentUserId,
            rev_user_id: requestData.rev_user_id,
            content: requestData.content,
            create_time: response.message.create_time,
          })
          sent = true
        } else {
          console.error('后端返回错误:', response)
        }
      } catch (error) {
        if (describeError('发送消息', error) === 'UNAUTHORIZED') this.logout()
      }
      // 仅在发送成功后回拉列表校对，避免失败时也触发一次无效请求
      if (sent) {
        await this.fetchMessages()
        console.log('Message sent and messages list updated.')
      }
    },

    // 撤回消息
    async revokeMessage(messageId) {
      if (!this.isLoggedIn) {
        console.warn('[chatStore] 未登录，无法撤回消息')
        return
      }
      try {
        // 后端撤回接口尚未提供，先做本地移除并保留占位说明
        // await axios.delete(`${baseURL}/api/v1/message/revoke`, { data: { mid: messageId } })
        this.messages = this.messages.filter((msg) => msg.id !== messageId) // 从本地状态中移除消息
      } catch (error) {
        describeError('撤回消息', error)
      }
    },

    // 设置当前用户
    setCurrentUser(userId) {
      this.currentUserId = userId
    },
  },
})

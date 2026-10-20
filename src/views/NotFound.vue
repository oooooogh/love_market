<template>
  <div class="not-found">
    <h1 class="code">404</h1>
    <p class="message">页面走丢了，或者地址输入有误</p>
    <p class="path">当前地址：{{ $route.fullPath }}</p>
    <div class="actions">
      <button class="primary" @click="goHome">返回首页</button>
      <button class="secondary" @click="goBack">返回上一页</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFound',
  methods: {
    goHome() {
      // 使用 replace 避免用户点浏览器后退又回到 404 页面
      this.$router.replace('/home')
    },
    goBack() {
      // 没有历史记录时（直接输入地址进入）回退到首页兜底
      if (window.history.length > 1) {
        this.$router.back()
      } else {
        this.$router.replace('/home')
      }
    },
  },
}
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  padding: 20px;
  box-sizing: border-box;
}

.code {
  font-size: 96px;
  margin: 0;
  color: #f0a7c2;
  letter-spacing: 4px;
}

.message {
  font-size: 20px;
  margin: 10px 0 4px;
}

.path {
  font-size: 14px;
  color: #999;
  margin: 0 0 30px;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: 16px;
}

.actions button {
  padding: 12px 26px;
  font-size: 15px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
}

.primary {
  background-color: #f0a7c2;
}

.primary:hover {
  background-color: #e74c97;
}

.secondary {
  background-color: #bbb;
}

.secondary:hover {
  background-color: #999;
}
</style>

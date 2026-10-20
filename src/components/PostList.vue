<template>
  <div class="post-list">
    <p v-if="posts.length == 0">{{ mes }}</p>
    <PostItem
        v-for="(post, index) in posts"
        :key="index"
        :vote_count="post.vote_count"
        :title="post.title"
        :content="post.content"
        :author_name="post.author_name"
        :create_time="post.create_time"
        :id="post.id"
        :summary="post.summary"
        :community_name="post.community && post.community.name ? post.community.name : ''"
    />
    <!-- 提示加载 -->
    <div v-if="posts.length != 0 && isLoading" class="loading">{{ mes }}</div>
  </div>
</template>
  
  <script>
  import PostItem from "./PostItem.vue";
  // 统一使用封装好的 request 实例（baseURL / 超时 / 鉴权头 / 错误兜底见 src/request/request.js）
  import request from "@/request/request.js";
  
  export default {
    name: "PostList",
    components: {
      PostItem,
    },
    data() {
      return {
        mes: "loading...",
        posts: [],   // 存放帖子的数组
        page: 1,     // 当前页码，初始值为1
        size: 8,  // 每页请求的帖子数
        isLoading: false, // 是否正在加载数据
        isExhausted: false, // 是否已加载完所有数据
      };
    },
    created() {
      // 只绑定一次，保证 add/removeEventListener 引用一致，否则监听器永远无法卸载
      this.boundHandleScroll = this.handleScroll.bind(this);
    },
    mounted() {
      // 在组件加载时请求数据
      this.fetchPosts();
      // 添加滚动监听
      window.addEventListener("scroll", this.boundHandleScroll);
    },
    beforeUnmount() {
      // 移除滚动监听（Vue 3 中 beforeDestroy 已废弃，不会再被调用）
      this.stopScrollListener();
    },
    methods: {
      // 统一收口滚动监听的移除逻辑
      stopScrollListener() {
        if (this.boundHandleScroll) {
          window.removeEventListener("scroll", this.boundHandleScroll);
        }
      },
      // 请求数据的方法
      fetchPosts() {
        if (this.isLoading || this.isExhausted) return; // 防止重复加载 / 已无更多数据
        this.isLoading = true;      // 标记加载中
        // 发起 GET 请求，获取帖子列表数据
        request.get(`/api/v1/posts?page=${this.page}&size=${this.size}`)
          .then(response => {
            if (response.code === 1000) {
              // 请求成功，更新 posts 数据
              this.posts = [...this.posts, ...(response.data || [])];
              // 更新 page 变量，每次请求后加一
              this.page += 1;
              this.isLoading = false; // 加载完成
              this.mes = "loading...";
              if (!response.hasMore) {
                // 如果没有更多数据，移除滚动事件监听，避免继续触底请求
                this.isExhausted = true;
                this.stopScrollListener();
                this.mes = "没有更多数据了";
              }
            }
            else {
              console.error('请求失败:', response.msg);
              this.isLoading = false; // 加载完成
              this.mes = '请求失败，请稍后重试';
            }
          })
          .catch(error => {
            console.error('请求失败:', error);
            this.isLoading = false; // 加载完成
            this.mes = '请求失败，请稍后重试'; // 提示用户请求失败
          });
      },
      // 处理滚动事件
      handleScroll() {
        // 已明确没有更多数据时不再触发请求
        if (this.isExhausted) return;

        const scrollTop = document.documentElement.scrollTop; // 已滚动高度
        const clientHeight = document.documentElement.clientHeight; // 视口高度
        const scrollHeight = document.documentElement.scrollHeight; // 页面总高度

        // 判断是否到达底部
        if (scrollTop + clientHeight >= scrollHeight - 50) {
          this.fetchPosts(); // 加载更多数据
        }
      },
    },
  };
</script>
  
  <style scoped>
  .post-list {
    display: flex;
    flex-direction: column;
    gap: 20px; /* 每个帖子的间距 */
    width: 100%; /* 列表宽度最大化 */
    max-width: 1500px; /* 最大宽度 */
    margin: 0 auto;
    padding: 20px;
    height: 100%; /* 增加高度，使列表更长 */
    overflow-y: auto; /* 如果内容过长，允许滚动 */
  }
  </style>
  
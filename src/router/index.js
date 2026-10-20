import { createRouter, createWebHashHistory } from 'vue-router'
import Squre from '../views/Square.vue'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Postposts from '../views/Postposts.vue'
import ProfilePage from '../views/ProfilePage.vue';
import SettingsPage from '../views/SettingsPage.vue';
import ChatLayout from '../views/ChatLayout.vue'
import ChatView from '../components/ChatView.vue'
import Myposts from '../views/view_my_posts.vue'


const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            redirect: '/login'
        },
        {
            // 登录/注册页属于"免登录白名单"，用 meta.public 显式标记
            path: '/login',
            component: Login,
            meta: { public: true, title: '登录' }
        },
        {
            path: '/register',
            component: Register,
            meta: { public: true, title: '注册' }
        },
        {   
            path: '/home',
            name: 'home',
            component: Home
        },
        {   
            path: '/square',
            name: 'square',
            component: Squre
        },
        {
            path: '/posts/:id',
            name: 'posts',
            component: () => import ('../views/Postdetail.vue')
        },
        {
            path: '/postposts',
            name: 'postposts',
            component: Postposts
        },
        {
            path: '/search/:searchdetail',
            name: 'search',
            component: () => import ('../views/Searchpost.vue')
        },
        {
            path: '/profile',
            name: 'ProfilePage',
            component: ProfilePage
        },
        {
            path: '/settings',
            name: 'SettingsPage',
            component: SettingsPage
        },
        {
            path: '/chat',
            name:'chat',
            component: ChatLayout,
            children: [
              {
                path: ':friendId',
                name: 'ChatView',
                component: ChatView
              }
            ]
        },
        {
            path: '/myposts',
            name:'myposts',
            component: Myposts,
        },
        {
            // 兜底路由：未匹配的地址不再是白屏，给出明确出口
            path: '/:pathMatch(.*)*',
            name: 'notFound',
            meta: { public: true, title: '页面不存在' },
            component: () => import('../views/NotFound.vue')
        }
    ]
})

/**
 * 读取本地持久化的登录态。
 * 这里刻意不 import Pinia store：
 *  1. router 模块在 main.js 里先于 app.use(pinia) 被加载，此时调用 useChatStore()
 *     会因为 Pinia 尚未激活而报 "getActivePinia()" 错误；
 *  2. request.js 会 import router，若 router 再反向 import store 会形成循环依赖。
 * 登录态本就以 localStorage 为唯一持久化来源，此处直接读取，语义清晰且无耦合。
 */
function hasValidSession() {
    try {
        const rawUser = localStorage.getItem('user')
        const token = localStorage.getItem('token')
        if (!rawUser || !token) return false
        const user = JSON.parse(rawUser)
        return !!(user && typeof user === 'object' && user.userid != null)
    } catch (error) {
        // 本地数据损坏时按未登录处理，绝不能因为解析异常而阻断导航
        console.warn('[router] 本地登录态解析失败，已按未登录处理:', error)
        return false
    }
}

// 全局前置守卫：在页面真正渲染之前完成鉴权判断
router.beforeEach((to, from) => {
    const loggedIn = hasValidSession()
    // 未显式标记 public 的路由，一律视为需要登录
    const isPublic = to.meta.public === true || to.matched.some((record) => record.meta.public === true)

    // ① 未登录访问受保护页面：踢回登录页，并记住原本想去哪，登录后可原路返回
    if (!isPublic && !loggedIn) {
        console.warn('[router] 未登录，已拦截对 ' + to.fullPath + ' 的访问')
        return { path: '/login', query: { redirect: to.fullPath } }
    }

    // ② 已登录还去登录/注册页：直接送回首页，避免重复登录
    if (isPublic && loggedIn && (to.path === '/login' || to.path === '/register')) {
        return { path: '/home' }
    }

    // ③ 其余情况放行
    return true
})

// 全局后置守卫：统一维护页面标题（无需再在每个页面里手写）
router.afterEach((to) => {
    const base = '恋爱集市'
    document.title = to.meta && to.meta.title ? `${to.meta.title} - ${base}` : base
})

export default router

<template>
    <Header />
    <div class="profile-page">
        <div class="profile-header">
            <div class="avatar">
                <img :src="avatar" alt="头像" />
                <button @click="goToSettings">更换头像</button>
            </div>
            <div class="profile-info">
                <h2>{{ nickname }}</h2>
                <p>账户名: {{ username }}</p>
                <p>年龄: {{ age }}岁</p>
                <p>性别: {{ gender }}</p>
                <p>地区: {{ location }}</p>
                <p>学校: {{ school }}</p>
                <p>兴趣爱好: {{ hobbies }}</p>
                <p>个性签名: {{ signature }}</p>
            </div>
        </div>

        <div class="contact-info">
            <p>手机号: {{ phone }}</p>
            <p>邮箱: <a :href="'mailto:' + email">{{ email }}</a></p>
        </div>

        <div class="profile-settings">
            <button @click="goToSettings">设置</button>
        </div>
    </div>
</template>

<script>
import Header from "@/components/Header.vue";
    // 统一使用封装好的 request 实例；鉴权头由 src/request/request.js 的请求拦截器统一注入。
    // 原先在模块加载期直接写 axios.defaults.headers 是有害的：
    // 此时 token 可能尚不存在，会写入字面量 "Bearer null" 并污染后续所有请求。
    import request from "@/request/request.js";
    export default {
        components:{
            Header
        },
        data() {
            return {
                avatar: 'https://via.placeholder.com/150',  // 默认头像
                nickname: 'JohnDoe123',
                username: 'john_doe_01',
                age: 30,
                gender: '男',
                location: '北京',
                school: '中山大学',
                hobbies: '旅行、摄影、音乐、编程',
                signature: '探索未知，享受生活。',
                phone: '+86 138 0000 0000',
                email: 'john.doe@email.com'
            };
        },
        methods: {
            goToSettings() {
                this.$router.push('/settings');
            }
        },
        created() {
            // 从后端获取用户信息
            request.get('/api/v1/userdetail')
                .then(response => {
                    // 兼容后端可能返回 {code, data:{...}} 或直接返回用户对象两种结构
                    const userData = (response && response.data) ? response.data : response;
                    if (!userData) return;
                    this.avatar = userData.profile_picture;
                    this.nickname = userData.nickname;
                    this.username = userData.username;
                    this.age = userData.age;
                    this.gender = userData.gender;
                    this.location = userData.location;
                    this.school = userData.school;
                    this.hobbies = userData.hobbies;
                    this.signature = userData.signature;
                    this.phone = userData.phone_number;
                    this.email = userData.email;
                })
                .catch(error => {
                    console.error('获取用户信息失败', error);
                });
        }
    };
</script>

<style scoped>
    .profile-page {
        max-width: 1000px; /* 调整页面宽度以适应横屏 */
        margin: 0 auto;
        font-family: Arial, sans-serif;
        padding: 40px; /* 减少内边距 */
        background-color: #f9f9f9;
        border-radius: 20px;
        color: #333;
    }

    .profile-header {
        display: flex;
        align-items: center;
        margin-bottom: 50px; /* 减少下方间距 */
    }

    .avatar img {
        width: 150px; /* 调整头像大小 */
        height: 150px;
        border-radius: 50%;
        margin-right: 30px;
    }

    .avatar button {
        background-color: #f8c8d1;
        color: white;
        border: none;
        padding: 10px 20px; /* 调整按钮内边距 */
        border-radius: 10px;
        cursor: pointer;
    }

        .avatar button:hover {
            background-color: #f0a7c2;
        }

    .profile-info {
        flex-grow: 1;
    }

        .profile-info h2 {
            font-size: 2em; /* 调整字体大小 */
            margin-bottom: 20px; /* 减少h2下方的间距 */
            color: #f0a7c2;
        }

        .profile-info p {
            font-size: 1.2em;
            margin: 15px 0; /* 减少每个p元素的上下间距 */
        }

    .contact-info p {
        font-size: 1.2em;
        margin: 15px 0; /* 减少每个p元素的上下间距 */
    }

    .profile-settings button {
        background-color: #f0a7c2;
        color: white;
        border: none;
        padding: 15px 25px; /* 调整按钮内边距 */
        border-radius: 10px;
        cursor: pointer;
        margin-top: 40px; /* 减少上方间距 */
        width: 100%;
    }

        .profile-settings button:hover {
            background-color: #f8c8d1;
        }
</style>
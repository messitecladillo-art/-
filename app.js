document.addEventListener('DOMContentLoaded', () => {
    // 星空背景生成逻辑优化
    function generateStars(elementId, count, size) {
        const layer = document.getElementById(elementId);
        let shadowStr = '';
        for(let i=0; i<count; i++) {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            shadowStr += `${x}vw ${y}vh #fff${i === count - 1 ? '' : ','}`;
        }
        layer.style.boxShadow = shadowStr;
        layer.style.width = size;
        layer.style.height = size;
    }
    
    // 初始化极多随机星星
    generateStars('stars', 100, '1px');
    generateStars('stars2', 50, '2px');
    generateStars('stars3', 20, '3px');

    // ========= 星空 Toast 通知（替代原生 alert）=========
    function starToast(msg) {
        const container = document.getElementById('star-toast-container');
        if(!container) return;
        const toast = document.createElement('div');
        toast.className = 'star-toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }

    // UI 交互元素
    const tabs = document.querySelectorAll('.tab-btn');
    const contentInput = document.getElementById('post-content');
    const authorInput = document.getElementById('post-author');
    const submitBtn = document.getElementById('submit-btn');
    const wallContainer = document.getElementById('wall');
    
    // 管理员后门元素
    const titleElement = document.getElementById('brand-title');
    const adminPwdInput = document.getElementById('admin-pwd');
    
    let currentType = 'vent'; // 默认发泄
    let isAdmin = false;

    // ========= 匿名身份与历史轨道追踪 =========
    let myClientId = localStorage.getItem('star_client_id');
    if (!myClientId) {
        myClientId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
        localStorage.setItem('star_client_id', myClientId);
    }
    
    let myPosts = [];
    try {
        const stored = localStorage.getItem('my_posts');
        if(stored) myPosts = JSON.parse(stored);
    } catch(e) {}
    
    function updateProfileStats() {
        const statsEl = document.getElementById('left-profile-stats');
        if(statsEl) statsEl.textContent = myPosts.length;
        
        const avatarEl = document.getElementById('left-profile-avatar');
        if(avatarEl) {
            if(window.myPet && window.myPet.type && EMOJIS[window.myPet.type]) {
                avatarEl.textContent = EMOJIS[window.myPet.type];
            } else {
                avatarEl.textContent = '🦊';
            }
        }
    }

    function addMyPost(id) {
        if(!myPosts.includes(id)) {
            myPosts.push(id);
            localStorage.setItem('my_posts', JSON.stringify(myPosts));
            updateProfileStats();
        }
    }

    // ========= 账号系统 =========
    let currentUser = null;
    try {
        const savedUser = localStorage.getItem('star_user');
        if(savedUser) currentUser = JSON.parse(savedUser);
    } catch(e) {}

    function updateAuthUI() {
        const btnLogin = document.getElementById('btn-login');
        const btnLogout = document.getElementById('btn-logout');
        const userDisplay = document.getElementById('user-display');
        const profileName = document.getElementById('left-profile-name');
        
        if(currentUser) {
            if(btnLogin) btnLogin.style.display = 'none';
            if(btnLogout) btnLogout.style.display = 'inline-block';
            if(userDisplay) userDisplay.textContent = `🛸 ${currentUser.username}`;
            if(profileName) profileName.textContent = currentUser.username;
            // 如果有登录用户，用用户 id 作为 clientId（跨设备统一身份）
            myClientId = currentUser.id;
            // 用户名自动填入署名
            if(authorInput && !authorInput.value) authorInput.value = currentUser.username;
        } else {
            if(btnLogin) btnLogin.style.display = 'inline-block';
            if(btnLogout) btnLogout.style.display = 'none';
            if(userDisplay) userDisplay.textContent = '';
            if(profileName) profileName.textContent = '匿名星尘';
        }
        updateProfileStats();
    }

    // 从数据库同步该用户发过的所有帖子 ID（实现跨设备记忆）
    async function syncMyPosts() {
        if(!currentUser || SUPABASE_URL === '你要填的URL') return;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?user_id=eq.${currentUser.id}&select=id`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            if(res.ok) {
                const data = await res.json();
                data.forEach(p => addMyPost(p.id));
            }
        } catch(e) {}
    }

    // 注册
    async function doRegister(username, password) {
        if(!username || !password) { starToast('星际代号和量子密钥不能为空'); return; }
        if(username.length < 2) { starToast('代号至少2个字符'); return; }
        if(password.length < 4) { starToast('密钥至少4位'); return; }

        // 检查是否已存在
        const check = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const existing = await check.json();
        if(existing.length > 0) { starToast('该星际代号已被占用'); return; }

        const newUser = {
            id: 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2,6),
            username: username,
            password: password,
            created_at: Date.now()
        };
        
        await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify(newUser)
        });
        
        currentUser = { id: newUser.id, username: newUser.username };
        localStorage.setItem('star_user', JSON.stringify(currentUser));
        myClientId = currentUser.id;
        updateAuthUI();
        document.getElementById('auth-modal').style.display = 'none';
        starToast(`🌟 欢迎加入星系，${username}！`);
        await syncMyPosts();
    }

    // 登录
    async function doLogin(username, password) {
        if(!username || !password) { starToast('请输入你的星际代号和量子密钥'); return; }
        
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=id,username`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const data = await res.json();
        if(data.length === 0) { starToast('代号或密钥错误，请重试'); return; }

        currentUser = { id: data[0].id, username: data[0].username };
        localStorage.setItem('star_user', JSON.stringify(currentUser));
        myClientId = currentUser.id;
        updateAuthUI();
        document.getElementById('auth-modal').style.display = 'none';
        starToast(`🛸 欢迎回来，${currentUser.username}！`);
        await syncMyPosts();
        loadWall();
    }

    // 登出
    function doLogout() {
        currentUser = null;
        localStorage.removeItem('star_user');
        // 恢复匿名身份
        myClientId = localStorage.getItem('star_client_id') || ('user_' + Date.now());
        updateAuthUI();
        starToast('你已退出轨道，回到匿名漫游模式');
    }

    // 绑定按钮事件
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const authModal = document.getElementById('auth-modal');
    
    if(btnLogin) btnLogin.addEventListener('click', () => { authModal.style.display = 'flex'; });
    if(btnLogout) btnLogout.addEventListener('click', doLogout);
    
    const btnDoLogin = document.getElementById('btn-do-login');
    const btnDoRegister = document.getElementById('btn-do-register');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    
    if(btnDoLogin) btnDoLogin.addEventListener('click', () => {
        const u = document.getElementById('auth-username').value.trim();
        const p = document.getElementById('auth-password').value.trim();
        doLogin(u, p);
    });
    if(btnDoRegister) btnDoRegister.addEventListener('click', () => {
        const u = document.getElementById('auth-username').value.trim();
        const p = document.getElementById('auth-password').value.trim();
        doRegister(u, p);
    });
    if(btnCloseAuth) btnCloseAuth.addEventListener('click', () => { authModal.style.display = 'none'; });

    // 登录框支持 Enter 键
    const authPwd = document.getElementById('auth-password');
    if(authPwd) authPwd.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') { btnDoLogin && btnDoLogin.click(); }
    });

    // 初始化 UI
    updateAuthUI();
    if(currentUser) syncMyPosts();

    // 标签切换
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentType = tab.getAttribute('data-type');
            
            if(currentType === 'vent') {
                contentInput.placeholder = "无需顾忌，随心写下你现在的真实感受...";
                if(wallContainer) wallContainer.innerHTML = '<div class="empty-state">正在切换通讯频段...</div>';
            } else if(currentType === 'share') {
                contentInput.placeholder = "分享一件今天让你感到内心平静或窃喜的小事吧...";
                if(wallContainer) wallContainer.innerHTML = '<div class="empty-state">正在切换通讯频段...</div>';
            } else if(currentType === 'history') {
                contentInput.placeholder = "回顾那些抛向宇宙深处的碎片...";
                if(wallContainer) wallContainer.innerHTML = '<div class="empty-state">正在打捞过去的记忆...</div>';
            }
            
            // 切换标签时重置页码并刷新墙面
            currentWallPage = 0;
            loadWall();
        });
    });

    // ========== 情绪标签选择器 ==========
    let selectedMood = null;
    const MOOD_MAP = {
        sad: { emoji: '😢', label: '忧伤', color: '#93c5fd' },
        angry: { emoji: '😤', label: '愤怒', color: '#fca5a5' },
        anxious: { emoji: '😰', label: '焦虑', color: '#fcd34d' },
        happy: { emoji: '😊', label: '开心', color: '#6ee7b7' },
        calm: { emoji: '😌', label: '平静', color: '#c4b5fd' },
        lonely: { emoji: '🌙', label: '孤独', color: '#94a3b8' }
    };

    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = btn.dataset.mood;
            if(selectedMood === mood) {
                selectedMood = null;
                document.querySelectorAll('.mood-btn').forEach(b => b.style.outline = 'none');
            } else {
                selectedMood = mood;
                document.querySelectorAll('.mood-btn').forEach(b => b.style.outline = 'none');
                btn.style.outline = `2px solid ${MOOD_MAP[mood].color}`;
                btn.style.outlineOffset = '2px';
            }
        });
    });

    // ========== 搜索与情绪筛选 ==========
    let currentMoodFilter = 'all';
    let currentSearchQuery = '';
    let allLoadedPosts = []; // 缓存当前页面加载的帖子

    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        let searchTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                currentSearchQuery = searchInput.value.trim().toLowerCase();
                filterAndRenderWall();
            }, 300);
        });
    }

    document.querySelectorAll('.mood-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-filter').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
            });
            btn.classList.add('active');
            btn.style.background = 'rgba(255,255,255,0.1)';
            currentMoodFilter = btn.dataset.filter;
            filterAndRenderWall();
        });
    });

    function filterAndRenderWall() {
        let filtered = allLoadedPosts;
        if(currentMoodFilter !== 'all') {
            filtered = filtered.filter(p => p.mood === currentMoodFilter);
        }
        if(currentSearchQuery) {
            filtered = filtered.filter(p => 
                (p.content && p.content.toLowerCase().includes(currentSearchQuery)) ||
                (p.author && p.author.toLowerCase().includes(currentSearchQuery))
            );
        }
        
        const wall = document.getElementById('wall');
        if(!wall) return;
        if(filtered.length === 0) {
            wall.innerHTML = '<div class="empty-state">这片星域暂无相关碎片...</div>';
        } else {
            wall.innerHTML = filtered.map(p => createCardHTML(p)).join('');
            checkContentOverflow(wall);
        }
    }

    // ========== 情绪光谱分布统计 ==========
    function updateMoodDistribution(posts) {
        const dist = {};
        posts.forEach(p => { if(p.mood) dist[p.mood] = (dist[p.mood] || 0) + 1; });
        const total = Object.values(dist).reduce((a,b) => a+b, 0) || 1;
        const container = document.getElementById('mood-distribution');
        if(!container) return;
        container.innerHTML = '';
        Object.entries(dist).sort((a,b) => b[1]-a[1]).forEach(([mood, count]) => {
            const info = MOOD_MAP[mood];
            if(!info) return;
            const pct = ((count/total)*100).toFixed(0);
            container.innerHTML += `
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px 14px; display: flex; align-items: center; gap: 8px; min-width: 100px;">
                    <span style="font-size: 1.2rem;">${info.emoji}</span>
                    <div>
                        <div style="font-size: 0.8rem; color: ${info.color}; font-weight: bold;">${info.label}</div>
                        <div style="font-size: 0.7rem; color: #64748b;">${count}条 · ${pct}%</div>
                    </div>
                    <div style="flex:1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; margin-left: 5px;">
                        <div style="height:100%; width:${pct}%; background: ${info.color}; border-radius: 2px; transition: width 0.5s;"></div>
                    </div>
                </div>
            `;
        });
        if(Object.keys(dist).length === 0) {
            container.innerHTML = '<span style="color:#64748b; font-size:0.85rem;">暂无情绪标签数据</span>';
        }
    }

    // ========== 右侧面板统计 & 每日星语 ==========
    const STAR_QUOTES = [
        "宇宙不会忘记任何一声叹息。",
        "你的眼泪，是星尘最温柔的形态。",
        "每一次脆弱，都是勇气的另一种表达。",
        "深夜的孤独，是灵魂在长大的声音。",
        "你不需要完美，只需要真实。",
        "月亮也会有阴晴圆缺，何况是你。",
        "伤口是光照进来的地方。",
        "允许自己慢下来，宇宙不赶时间。",
        "你的故事值得被倾听。",
        "今夜的泪水，是明天花园里的露珠。",
        "即使全世界都在沉睡，星星依然为你闪烁。",
        "没有永恒的黑夜，黎明只是在路上。",
        "孤独不是软弱，而是与自己对话的开始。",
        "你已经走了很远了，别忘了看看星空。"
    ];

    // 每天固定一句（基于日期的伪随机）
    function getDailyQuote() {
        const day = new Date().getDate() + new Date().getMonth() * 31;
        return STAR_QUOTES[day % STAR_QUOTES.length];
    }

    // 初始化语录
    const quoteEl = document.getElementById('daily-quote');
    if(quoteEl) quoteEl.textContent = `"${getDailyQuote()}"`;

    // 模拟在线人数（基于时间段的合理波动）
    function getSimulatedOnline() {
        const hour = new Date().getHours();
        // 深夜活跃用户更多（符合树洞场景）
        let base;
        if(hour >= 22 || hour <= 2) base = 30 + Math.floor(Math.random() * 25);
        else if(hour >= 10 && hour <= 18) base = 8 + Math.floor(Math.random() * 12);
        else base = 15 + Math.floor(Math.random() * 15);
        return base;
    }

    function updateSidePanel(posts) {
        const onlineEl = document.getElementById('stat-online');
        const todayEl = document.getElementById('stat-today');
        const totalEl = document.getElementById('stat-total');
        
        if(onlineEl) onlineEl.textContent = getSimulatedOnline();
        
        if(posts && posts.length > 0) {
            // 今日碎片：计算 timestamp 在今天 0 点之后的帖子
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayCount = posts.filter(p => p.timestamp >= todayStart.getTime()).length;
            if(todayEl) todayEl.textContent = todayCount;
            if(totalEl) totalEl.textContent = posts.length;
        }
    }

    // 每 30 秒随机波动在线人数
    setInterval(() => {
        const el = document.getElementById('stat-online');
        if(el) el.textContent = getSimulatedOnline();
    }, 30000);

    // ========== 背景音乐 (Everything's Alright) ==========
    const bgm = new Audio('bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.35;
    let bgmPlaying = false;

    const ambientToggle = document.getElementById('ambient-toggle');
    if(ambientToggle) {
        ambientToggle.addEventListener('click', () => {
            const icon = document.getElementById('radio-icon');
            if(!bgmPlaying) {
                bgm.play().catch(() => {});
                bgmPlaying = true;
                if(icon) icon.innerHTML = '<i class="fa-solid fa-music"></i>';
                ambientToggle.classList.add('radio-playing');
            } else {
                bgm.pause();
                bgmPlaying = false;
                if(icon) icon.innerHTML = '<i class="fa-solid fa-power-off"></i>';
                ambientToggle.classList.remove('radio-playing');
            }
        });
    }

    // ========== 首次访问引导 ==========
    const onboardingSteps = [
        { icon: '🌌', title: '欢迎来到深夜树洞', desc: '在这片星空下，你可以卸下所有伪装，向宇宙倾诉最真实的自己。' },
        { icon: '✍️', title: '抛出你的碎片', desc: '选择一种心情标签，写下此刻的感受，匿名发布到无垠的情绪墙。' },
        { icon: '🤖', title: '星空回信', desc: '月亮女神、星河先知、星际幻兽——三位 AI 灵魂将为你送来温柔回响。' },
        { icon: '🐾', title: '养一只星空幻兽', desc: '它会陪你一起成长。每次倾诉，都是喂养它的星尘食粮。' },
        { icon: '💬', title: '星语空间', desc: '遇到共鸣的陌生人？发起邀请，开启一段匿名的 1V1 星际对话。' }
    ];
    let onboardStep = 0;
    
    if(!localStorage.getItem('onboarded')) {
        const overlay = document.getElementById('onboarding-overlay');
        if(overlay) {
            overlay.style.display = 'flex';
            renderOnboardStep();
        }
    }

    function renderOnboardStep() {
        const step = onboardingSteps[onboardStep];
        const icon = document.getElementById('onboard-icon');
        const title = document.getElementById('onboard-title');
        const desc = document.getElementById('onboard-desc');
        const dots = document.getElementById('onboard-dots');
        const nextBtn = document.getElementById('onboard-next');
        
        if(icon) icon.textContent = step.icon;
        if(title) title.textContent = step.title;
        if(desc) desc.textContent = step.desc;
        if(nextBtn) nextBtn.textContent = onboardStep === onboardingSteps.length - 1 ? '开始探索 🚀' : '继续 →';
        
        if(dots) {
            dots.innerHTML = '';
            onboardingSteps.forEach((_, i) => {
                dots.innerHTML += `<div style="width:8px; height:8px; border-radius:50%; background:${i === onboardStep ? '#818cf8' : 'rgba(255,255,255,0.2)'}; transition: background 0.3s;"></div>`;
            });
        }
    }

    const onboardNext = document.getElementById('onboard-next');
    const onboardSkip = document.getElementById('onboard-skip');
    if(onboardNext) {
        onboardNext.addEventListener('click', () => {
            onboardStep++;
            if(onboardStep >= onboardingSteps.length) {
                document.getElementById('onboarding-overlay').style.display = 'none';
                localStorage.setItem('onboarded', '1');
            } else {
                renderOnboardStep();
            }
        });
    }
    if(onboardSkip) {
        onboardSkip.addEventListener('click', () => {
            document.getElementById('onboarding-overlay').style.display = 'none';
            localStorage.setItem('onboarded', '1');
        });
    }

    // ========== 真正的云端数据库接入层 (Supabase) ==========
    // 你的匿名公钥 (你刚才发来的)
    const SUPABASE_KEY = 'sb_publishable_2VaHtNZuHt_6Kn8PWqsweA_qRTqk19M'; 
    // TODO: 请把这里的网址换成你在 Supabase 控制台获取的 Project URL (格式类似 https://xxx.supabase.co)
    const SUPABASE_URL = 'https://koezaddeeifmufjuahxb.supabase.co'; 

    // 👉 在这里填入【硅基流动 SiliconFlow】的 API Key (格式为 sk-xxxxxx)
    // 这是国内顶级的神仙免费接口，彻底告别 OpenRouter 各种断线和跨域拦截报错！
    const SILICONFLOW_API_KEY = 'sk-qenoboegpvpueumfdqfbchvxehlrbofdxsyirgruglhowbbk';

    async function savePost(post) {
        if(SUPABASE_URL === '你要填的URL') {
            starToast('请先在 app.js 第 39 行配置你的 Supabase URL！');
            return;
        }

        // 自动关联当前用户
        if(currentUser) {
            post.user_id = currentUser.id;
        }

        const response = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(post)
        });

        if (!response.ok) {
            console.error('保存失败', await response.text());
            throw new Error('网络异常');
        }
        return post;
    }

    async function fetchPosts(page = 0, isHistory = false) {
        if(SUPABASE_URL === '你要填的URL') return [];

        let url = `${SUPABASE_URL}/rest/v1/posts?select=*&order=timestamp.desc`;
        
        if (isHistory) {
            // 优先用数据库的 user_id 查（跨设备记忆），否则用 localStorage 的 ID 列表
            if (currentUser) {
                url += `&user_id=eq.${currentUser.id}`;
            } else if (myPosts.length > 0) {
                url += `&id=in.(${myPosts.join(',')})`;
            } else {
                return [];
            }
        } else {
            const limit = 40;
            const offset = page * limit;
            url += `&limit=${limit}&offset=${offset}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
        return [];
    }

    async function deletePost(id) {
        await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
    }
    // ==============================================================================

    const EMOJIS = { fox: '🦊', cat: '🐱', rabbit: '🐰', none: '' };

    // 脏话过滤词汇字典
    const BAD_WORDS = ['傻逼', '操', '妈的', '死妈', '贱人', '脑残', '弱智', '废物', '去死', '他妈'];
    function filterProfanity(text) {
        let filtered = text;
        BAD_WORDS.forEach(word => {
            const regex = new RegExp(word, 'g');
            filtered = filtered.replace(regex, '☄️'.repeat(word.length)); // 用高雅的陨石屏蔽
        });
        return filtered;
    }

    // 渲染单张卡片
    function createCardHTML(post) {
        const dateStr = new Date(post.timestamp).toLocaleString('zh-CN', {
            month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'
        });
        
        const rotate = post.type === 'vent' ? (Math.random() * 2 - 1).toFixed(1) : 0; // 发泄模式再次呈现倾斜感
        
        // 视觉区分徽章
        let badgeHTML = '';
        let extraStyle = '';
        if (post.type === 'vent') {
            badgeHTML = `<span class="card-badge badge-vent">🌧️ 树洞发泄</span>`;
        } else if (post.type === 'ai') {
            badgeHTML = `<span class="card-badge badge-share" style="background: rgba(168,85,247,0.2); color: #c084fc; border-color: rgba(168,85,247,0.4);">🔮 星空回响</span>`;
            // AI卡片独占的极光动态渐变，每次刷新都有随机的星云色调
            const hue1 = Math.floor(Math.random() * 360);
            const hue2 = (hue1 + 60) % 360;
            extraStyle = `background: linear-gradient(135deg, hsla(${hue1}, 60%, 15%, 0.95), hsla(${hue2}, 60%, 20%, 0.85)); box-shadow: 0 4px 20px hsla(${hue1}, 50%, 50%, 0.4); border: 1px solid hsla(${hue1}, 50%, 60%, 0.5);`;
        } else {
            badgeHTML = `<span class="card-badge badge-share">☀️ 星空碎语</span>`;
        }
        
        // 解析挂载的宠物（所有卡片统一显示）
        let petHTML = '';
        if(post.pet_state && post.pet_state.type) {
            petHTML = `<span style="font-size:1.1rem; margin-left: 2px; filter: drop-shadow(0 0 5px rgba(255,255,255,0.4));">${EMOJIS[post.pet_state.type]}</span><span style="font-size:0.65rem; color:#ffd700; background:rgba(0,0,0,0.4); padding:1px 4px; border-radius:4px; margin-left:2px;">Lv.${post.pet_state.level}</span>`;
        }
        
        const likes = post.likes || 0;
        const pats = post.pats || 0;
        const isLiked = localStorage.getItem(`likes_${post.id}`);
        const isPatted = localStorage.getItem(`pats_${post.id}`);
        const isMine = myPosts.includes(post.id);
        
        // 情绪标签
        let moodBadge = '';
        if(post.mood && MOOD_MAP[post.mood]) {
            const m = MOOD_MAP[post.mood];
            moodBadge = `<span style="font-size:0.75rem; padding:2px 8px; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:${m.color};">${m.emoji} ${m.label}</span>`;
        }

        return `
            <div class="card" data-type="${post.type}" data-id="${post.id}" style="transform: rotate(${rotate}deg); ${extraStyle}">
                <button type="button" class="delete-btn" style="${isMine ? 'display:flex;' : ''}" onclick="triggerDelete('${post.id}')"><i class="fa-solid fa-trash"></i></button>
                <div class="card-header">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span class="author">${post.author || '匿名旅人'}</span>
                        ${petHTML}
                        ${badgeHTML}
                        ${moodBadge}
                    </div>
                    <span class="time">${dateStr}</span>
                </div>
                <div class="card-content-wrapper" style="position: relative;">
                    <div class="card-content collapsed">${post.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                    <button type="button" class="expand-btn" style="display:none;" onclick="window.toggleExpand(this)"><span>展开全文</span> <i class="fa-solid fa-chevron-down"></i></button>
                </div>
                <div class="card-actions">
                    <button type="button" class="action-btn pat-btn ${isPatted ? 'active' : ''}" onclick="window.interactPost('${post.id}', 'pats', this)">
                        🫂 <span>${pats}</span>
                    </button>
                    <button type="button" class="action-btn like-btn ${isLiked ? 'active' : ''}" onclick="window.interactPost('${post.id}', 'likes', this)">
                        ✨ <span>${likes}</span>
                    </button>
                    <button type="button" class="action-btn comment-btn" onclick="window.toggleComments('${post.id}')" style="font-size: 0.95rem; display: flex; align-items: center; gap: 5px;">
                        💬 <span>寄送回声</span>
                    </button>
                    ${!isMine ? `<button type="button" class="action-btn invite-btn" onclick="window.sendChatRequest('${post.id}', '${post.author || '匿名旅人'}')" style="font-size: 0.95rem; margin-left: auto; color: #a5b4fc; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 20px; padding: 4px 10px;">
                        📡 <span style="font-size:0.85rem">邀请星语</span>
                    </button>` : ''}
                </div>
                <!-- 留言区展开面板 -->
                <div id="comments-${post.id}" class="comments-section" style="display:none; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; display: none; flex-direction: column; gap: 10px;">
                    <div class="comments-list" id="comments-list-${post.id}" style="max-height: 200px; overflow-y: auto; font-size: 0.9rem; color: #cbd5e1; margin-bottom: 5px; display: flex; flex-direction: column; gap: 8px;">
                        <span style="font-size:0.8rem; color:#64748b; text-align:center;">读取星际连线中...</span>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <input type="text" id="comment-input-${post.id}" placeholder="在此留下星河回响..." style="flex:1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 12px; border-radius: 8px; outline: none; font-size: 0.9rem; font-family: inherit;">
                        <button type="button" onclick="window.submitComment('${post.id}')" style="background: rgba(139, 92, 246, 0.4); border: 1px solid rgba(139, 92, 246, 0.5); color: #fff; padding: 6px 14px; border-radius: 8px; cursor:pointer; font-weight: bold; transition: all 0.3s;" onmouseover="this.style.background='rgba(139, 92, 246, 0.6)'" onmouseout="this.style.background='rgba(139, 92, 246, 0.4)'">发送</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== 展开与折叠长文本机制 ==========
    window.toggleExpand = function(btn) {
        const content = btn.previousElementSibling;
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            btn.classList.add('active');
            btn.querySelector('span').innerText = '收起漫长回声';
        } else {
            content.classList.remove('expanded');
            content.classList.add('collapsed');
            btn.classList.remove('active');
            btn.querySelector('span').innerText = '展开全文';
        }
    };

    // ========== 评论/留言机制 ==========
    window.toggleComments = async function(postId) {
        const panel = document.getElementById(`comments-${postId}`);
        if(panel.style.display === 'none') {
            panel.style.display = 'flex';
            await window.fetchComments(postId);
        } else {
            panel.style.display = 'none';
        }
    };

    window.fetchComments = async function(postId) {
        const listDiv = document.getElementById(`comments-list-${postId}`);
        if(SUPABASE_URL === '你要填的URL') {
            listDiv.innerHTML = '<span style="font-size:0.8rem; color:#64748b; text-align:center;">本地预览模式不可留言</span>';
            return;
        }

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/comments?post_id=eq.${postId}&order=timestamp.asc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            if(res.ok) {
                const comments = await res.json();
                if(comments.length === 0) {
                    listDiv.innerHTML = '<span style="font-size:0.8rem; color:#64748b; text-align:center;">暂无宇宙回声，来留下第一句吧。</span>';
                } else {
                    listDiv.innerHTML = '';
                    comments.forEach(c => {
                        const date = new Date(c.timestamp).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});
                        listDiv.innerHTML += `
                            <div style="background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 6px; position:relative; overflow:hidden;">
                                <span style="color: #a5b4fc; font-weight: bold; margin-right: 5px; font-size: 0.85rem;">${c.author}:</span>
                                <span style="font-size: 0.9rem;">${c.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
                                <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px; text-align: right;">${date}</div>
                            </div>
                        `;
                    });
                    listDiv.scrollTop = listDiv.scrollHeight;
                }
            }
        } catch(err) {
            listDiv.innerHTML = '<span style="font-size:0.8rem; color:#f87171; text-align:center;">获取回声失败</span>';
        }
    };

    window.submitComment = async function(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        let content = input.value.trim();
        if(!content) return;
        content = filterProfanity(content); // 继续使用屏蔽词机制
        
        const authorInputVal = document.getElementById('post-author');
        const author = authorInputVal && authorInputVal.value.trim() ? authorInputVal.value.trim() : '匿名旅人';

        const newComment = {
            id: 'cmt_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            post_id: postId,
            content: content,
            author: author,
            timestamp: new Date().getTime()
        };

        input.value = '';
        input.placeholder = '发射中...';
        input.disabled = true;

        if(SUPABASE_URL !== '你要填的URL') {
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
                    method: 'POST',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                    body: JSON.stringify(newComment)
                });
            } catch(e) { console.error('留言失败', e); }
        }
        
        input.disabled = false;
        input.placeholder = '在此留下星河回响...';
        await window.fetchComments(postId);
    };

    function checkContentOverflow($container) {
        // 延迟检查以确保 DOM 已完成渲染
        setTimeout(() => {
            const contents = $container.querySelectorAll('.card-content.collapsed');
            contents.forEach(content => {
                if (content.scrollHeight > content.clientHeight + 10) { // 有溢出
                    const btn = content.nextElementSibling;
                    if(btn && btn.classList.contains('expand-btn')) {
                        btn.style.display = 'flex';
                    }
                } else {
                    // 没有溢出，去掉遮罩
                    content.classList.remove('collapsed');
                }
            });
        }, 100);
    }

    // 加载并渲染墙面
    let currentWallPage = 0;

    async function loadWall() {
        // 如果是在“我的轨迹”标签下，则拉取历史
        const isHistory = (currentType === 'history');
        const posts = await fetchPosts(currentWallPage, isHistory);
        
        // 当换一批到没有数据时（且不是在历史面板里），重置回第一页并重新加载
        if (posts.length === 0 && currentWallPage > 0 && !isHistory) {
            currentWallPage = 0;
            return await loadWall();
        }

        // 缓存加载结果供搜索/筛选使用
        allLoadedPosts = posts;

        // 更新情绪脉搏折线图
        if(window.updateChart) window.updateChart(posts);
        
        // 更新情绪光谱分布
        updateMoodDistribution(posts);
        
        // 更新右侧面板统计
        updateSidePanel(posts);

        if(posts.length === 0) {
            wallContainer.innerHTML = '<div class="empty-state" style="text-align:center; color:#94a3b8; margin-top:50px;">宇宙空荡荡的，留下你的第一声回音吧。</div>';
            return;
        }
        
        wallContainer.innerHTML = '';
        
        // 性能优化防御：截取当前页的最多 40 条数据进行渲染
        const renderPosts = posts.slice(0, 40);
        renderPosts.forEach(post => {
            wallContainer.insertAdjacentHTML('beforeend', createCardHTML(post));
        });
        
        // 检查渲染完毕的卡片文本是否过长需要展示展开按钮
        checkContentOverflow(wallContainer);

        if (posts.length === 40) {
            wallContainer.insertAdjacentHTML('beforeend', '<div style="text-align:center; color:#64748b; margin-top:30px; margin-bottom: 30px; font-size: 0.9rem;">更早的记忆已被深空吞噬...</div>');
        }
    }

    // 换一批功能绑定
    const refreshBtn = document.getElementById('refresh-wall-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('i');
            // 星空加速旋转动画
            icon.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            icon.style.transform = 'rotate(360deg)';
            refreshBtn.disabled = true;
            
            // 星空跃迁特效 (时空模糊与缩放)
            wallContainer.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            wallContainer.style.opacity = '0';
            wallContainer.style.transform = 'scale(0.95) translateY(20px)';
            wallContainer.style.filter = 'blur(10px)';
            
            // 稍作延迟，营造穿梭感
            setTimeout(async () => {
                currentWallPage++;
                await loadWall();
                
                // 跃迁完成，新信号浮现
                wallContainer.style.opacity = '1';
                wallContainer.style.transform = 'scale(1) translateY(0)';
                wallContainer.style.filter = 'blur(0)';
                
                setTimeout(() => {
                    icon.style.transition = 'none';
                    icon.style.transform = 'rotate(0)';
                    refreshBtn.disabled = false;
                }, 500);
            }, 500);
        });
    }

    // 提交新内容

    // Enter 快捷发射（Shift+Enter 换行）
    contentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitBtn.click();
        }
    });

    submitBtn.addEventListener('click', async () => {
        let content = contentInput.value.trim();
        if(!content) return;
        content = filterProfanity(content); // 敏感词过滤护航

        const author = authorInput.value.trim();
        
        const newPost = {
            id: 'post_' + new Date().getTime() + '_' + Math.floor(Math.random()*1000),
            type: currentType,
            content: content,
            author: author,
            mood: selectedMood || null,
            timestamp: new Date().getTime(),
            pet_state: window.myPet // 发送情绪时带上自己的当前幻兽状态！
        };

        // 按钮进入冷却
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 发射中...';
        submitBtn.disabled = true;

        try {
            // 所有发泄与分享模式统一上墙归档
            if(currentType !== 'history') {
                await savePost(newPost);
                addMyPost(newPost.id); // 记录轨迹
            }
            
            // ========= 绝对高光时刻：文字化作繁星飞向宇宙的慢动作特效 =========
            const rect = contentInput.getBoundingClientRect();
            contentInput.classList.add('shaking-textarea');
            
            for (let i = 0; i < 40; i++) {
                const p = document.createElement('div');
                p.className = 'text-particle';
                p.style.left = (rect.left + Math.random() * rect.width) + 'px';
                p.style.top = (rect.top + Math.random() * rect.height) + 'px';
                const angle = Math.random() * Math.PI * 2;
                const dist = 100 + Math.random() * 200; 
                p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
                p.style.setProperty('--dy', Math.sin(angle) * dist - 300 + 'px'); // 往往上飞
                p.style.setProperty('--duration', (2.5 + Math.random() * 1.5) + 's'); // 让人静静看几秒
                document.body.appendChild(p);
                setTimeout(() => p.remove(), 4500);
            }

            // 配合星星飞散，清空文本框
            setTimeout(() => {
                contentInput.value = ''; 
                contentInput.classList.remove('shaking-textarea');
            }, 500);
            // ===============================================================
            
            // 重置情绪标签选择
            selectedMood = null;
            document.querySelectorAll('.mood-btn').forEach(b => b.style.outline = 'none');

            // 每次发射，宠物获得 5 点经验！
            if(window.gainPetExp) window.gainPetExp(5);

            await loadWall(); 
            // 无论发泄还是分享，都触发深空 AI 的陪伴回音
            if(window.callOpenRouterAI) window.callOpenRouterAI(content);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // 初次加载墙
    loadWall();

    // ========== 管理员“后门”逻辑 ==========
    let clickCount = 0;
    let clickTimer;
    
    // 双击/连击标题 3 次触发密码框
    titleElement.addEventListener('click', () => {
        clickCount++;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => clickCount = 0, 1000);
        
        if(clickCount >= 3) {
            adminPwdInput.style.display = 'inline-block';
            clickCount = 0;
        }
    });

    // 检查管理员密码
    adminPwdInput.addEventListener('input', (e) => {
        if(e.target.value === 'hqcyes2026') { 
            isAdmin = true;
            document.body.classList.add('admin-mode');
            adminPwdInput.style.border = "1px solid #10b981";
            adminPwdInput.style.color = "#10b981";
        } else {
            isAdmin = false;
            document.body.classList.remove('admin-mode');
            adminPwdInput.style.border = "1px solid #dc2626";
            adminPwdInput.style.color = "white";
        }
    });

    // 挂载全局删除方法
    window.triggerDelete = async function(id) {
        if(!isAdmin) return;
        if(confirm('确定要从宇宙中抹除这条痕迹吗？')) {
            await deletePost(id);
            loadWall();
        }
    }

    // ========== 电子宠物(星空幻兽)系统 ==========
    window.myPet = JSON.parse(localStorage.getItem('my_star_pet'));
    const petContainer = document.getElementById('my-pet-container');
    const petAvatar = document.getElementById('my-pet-avatar');
    const petLvlText = document.getElementById('pet-lvl-text');
    const petModal = document.getElementById('pet-picker-modal');

    function initPet() {
        if (!window.myPet) {
            petModal.classList.add('active'); // 没选过宠物，弹出选择框
        } else {
            renderPet();
        }
    }

    function renderPet() {
        if(!window.myPet) return;
        petContainer.classList.remove('pet-hidden');
        petAvatar.innerText = EMOJIS[window.myPet.type];
        petLvlText.innerText = window.myPet.level;
    }

    // 领养幻兽
    document.querySelectorAll('.pet-card').forEach(card => {
        card.addEventListener('click', () => {
            window.myPet = {
                type: card.getAttribute('data-pet'),
                level: 1,
                exp: 0
            };
            localStorage.setItem('my_star_pet', JSON.stringify(window.myPet));
            petModal.classList.remove('active');
            renderPet();
            
            // 顺便更新左侧的漫游档案头像
            if(typeof updateProfileStats === 'function') updateProfileStats();
        });
    });

    // 抚摸互动 (点一次冒小心心)
    const heartsContainer = document.getElementById('pet-hearts-container');
    petContainer.addEventListener('click', () => {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.innerText = '❤';
        // 计算随机的 X 轴偏移，让爱心飘的自然
        heart.style.setProperty('--rox', (Math.random() * 40 - 20)); 
        heartsContainer.appendChild(heart);
        setTimeout(() => heart.remove(), 1000);
    });

    // 经验与升级系统
    window.gainPetExp = function(amt) {
        if(!window.myPet) return;
        window.myPet.exp += amt;
        const requiredExp = window.myPet.level * 10; // 每级需要的基础经验慢慢变多
        
        if(window.myPet.exp >= requiredExp) {
            window.myPet.level += 1;
            window.myPet.exp -= requiredExp;
            
            // 升级金光狂暴特效
            petContainer.style.filter = 'drop-shadow(0 0 30px #fbbf24) brightness(1.5) scale(1.2)';
            setTimeout(()=> {
                petContainer.style.filter = '';
                petContainer.style.transform = '';
            }, 800);
        }
        localStorage.setItem('my_star_pet', JSON.stringify(window.myPet));
        renderPet();
    }

    // 初始化运行
    initPet();

    // ========== 梦幻星空情绪脉搏折线图系统 (Chart.js) ==========
    let emotionChart = null;
    let currentChartRange = '24h'; // 默认 24小时

    document.querySelectorAll('.chart-tab-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartRange = btn.getAttribute('data-range');
            const posts = await fetchPosts();
            window.updateChart(posts);
        });
    });

    window.updateChart = function(posts) {
        if(!document.getElementById('emotionChart')) return;
        const ctx = document.getElementById('emotionChart').getContext('2d');

        // 生成流光紫蓝渐层
        const gradientFill = ctx.createLinearGradient(0, 0, 0, 250);
        gradientFill.addColorStop(0, 'rgba(139, 92, 246, 0.5)'); // 上方紫光
        gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.0)'); // 下方透明发散

        // 根据 Range 聚合数据
        let labels = [];
        let dataPoints = [];
        const now = new Date();

        if (currentChartRange === '24h') {
            // 取最近 24 小时，按小时计
            const counts = {};
            for(let i=23; i>=0; i--) {
                const d = new Date(now.getTime() - i * 60 * 60 * 1000);
                const k = d.getHours() + ':00';
                counts[k] = 0;
                labels.push(k);
            }
            posts.forEach(p => {
                const diffTime = now.getTime() - p.timestamp;
                if(diffTime <= 24 * 60 * 60 * 1000) {
                    const h = new Date(p.timestamp).getHours() + ':00';
                    if(counts[h] !== undefined) counts[h]++;
                }
            });
            labels.forEach(l => dataPoints.push(counts[l]));
        } else {
            // 最近 7 天，按日计
            const counts = {};
            for(let i=6; i>=0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const k = (d.getMonth()+1) + '/' + d.getDate();
                counts[k] = 0;
                labels.push(k);
            }
            posts.forEach(p => {
                const diffTime = now.getTime() - p.timestamp;
                if(diffTime <= 7 * 24 * 60 * 60 * 1000) {
                    const d = new Date(p.timestamp);
                    const k = (d.getMonth()+1) + '/' + d.getDate();
                    if(counts[k] !== undefined) counts[k]++;
                }
            });
            labels.forEach(l => dataPoints.push(counts[l]));
        }

        if(emotionChart) {
            emotionChart.destroy();
        }

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Noto Serif SC', serif";

        emotionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '树洞接收频率',
                    data: dataPoints,
                    borderColor: '#a855f7',
                    borderWidth: 3,
                    backgroundColor: gradientFill,
                    fill: true,
                    tension: 0.4, // 平滑曼妙的曲线
                    pointBackgroundColor: '#e0e7ff',
                    pointBorderColor: '#8b5cf6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30,30,40,0.8)',
                        titleFont: { size: 14 },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(255,255,255,0.05)', borderDash: [5, 5] }
                    }
                }
            }
        });
    }

    // ========== 设置弹窗与拍拍、点赞互动机制 ==========

    // 挂载拍拍与点赞机制
    window.interactPost = async function(id, type, btn) {
        if(localStorage.getItem(`${type}_${id}`)) {
            starToast('你已经给予过这份共鸣咯 ✨');
            return;
        }

        const span = btn.querySelector('span');
        let currentVal = parseInt(span.innerText) || 0;
        
        // 乐观UI更新
        span.innerText = currentVal + 1;
        btn.classList.add('active');
        localStorage.setItem(`${type}_${id}`, 'true');

        if(SUPABASE_URL === '你要填的URL') return;

        try {
            const getRes = await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}&select=${type}`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            const data = await getRes.json();
            const realVal = (data[0][type] || 0) + 1;
            
            await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [type]: realVal })
            });
        } catch(err) {
            console.error('互动更新失败', err);
        }
    }

    // ========== 接入 星空回音大模型 ==========
    const aiModal = document.getElementById('ai-reply-modal');
    
    let currentAIText = "";
    let currentAIAuthor = "";

    document.getElementById('close-ai-modal').addEventListener('click', () => {
        aiModal.classList.remove('active');
        const saveBtn = document.getElementById('btn-save-ai');
        if(saveBtn) saveBtn.style.display = 'none'; 
    });

    // 绑定“放入星海”按钮功能
    document.getElementById('btn-save-ai').addEventListener('click', () => {
        if(!currentAIText) return;
        
        const newPost = {
            id: Date.now().toString() + Math.random().toString(36).substr(2,5),
            type: 'ai',
            content: currentAIText,
            author: currentAIAuthor,
            timestamp: new Date().getTime()
        };
        savePost(newPost);
        
        // 动态渲染到墙上，呈现极光卡片
        const wall = document.getElementById('wall');
        const emptyState = wall.querySelector('.empty-state');
        if(emptyState) emptyState.remove();
        wall.insertAdjacentHTML('afterbegin', createCardHTML(newPost));

        // 检查刚插入的这张卡片是否超长
        checkContentOverflow(wall);

        // 华丽关闭
        aiModal.classList.remove('active');
        document.getElementById('btn-save-ai').style.display = 'none';
        
        // 释放漫天星辰特效
        createStarBurst();
    });

    function createStarBurst() {
        for(let i=0; i<40; i++){
            const star = document.createElement('div');
            star.style.position = 'fixed';
            star.style.left = '50%';
            star.style.top = '50%';
            star.style.width = '5px';
            star.style.height = '5px';
            star.style.background = `hsl(${Math.random()*360}, 100%, 75%)`;
            star.style.borderRadius = '50%';
            star.style.boxShadow = `0 0 15px ${star.style.background}`;
            star.style.pointerEvents = 'none';
            star.style.zIndex = '99999';
            document.body.appendChild(star);
            
            const angle = Math.random() * Math.PI * 2;
            const distance = 150 + Math.random() * 400;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            star.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 800 + Math.random() * 600,
                easing: 'cubic-bezier(0, .9, .57, 1)'
            }).onfinish = () => star.remove();
        }
    }

    window.callOpenRouterAI = async function(content) {
        const apiKey = SILICONFLOW_API_KEY.trim();
        if(!apiKey || apiKey.startsWith('在这里填入')) return; // 没有 Key 就静默结束
        
        const persona = document.getElementById('ai-persona-select').value;
        if(persona === 'none') {
            return; // 明确不触发 AI
        }
        
        let systemPrompt = "";
        
        if(persona === 'sister') {
            systemPrompt = "你是一个生活在星空尽头的月亮女神，以无尽的温柔和包容俯瞰世间的悲欢。用户向你倾诉了心声，请用极其温柔、知性、疗愈的中文回信，让他感到温暖不再孤单。不要超过100字。";
        } else if(persona === 'observer') {
            systemPrompt = "你是一个理智且带点神秘感的星河先知，以宇宙的宏大视角和哲理思考，来回应地球人的凡尘琐事。多用星系、超新星、光年等词汇，中文作答，不要超过100字。";
        } else {
            // pet
            const petType = window.myPet ? window.myPet.type : 'fox';
            const petNames = { fox: '星云幻狐', cat: '曜石黑猫', rabbit: '月桂星兔' };
            systemPrompt = `你是一只名为【${petNames[petType]}】的星际幻兽，是用户最忠诚的星空羁绊。请用卖萌、可爱、极具动物感且能带给人欢乐的中文语气回应主人的心事。不要超过100字。`;
        }

        const replyContent = document.getElementById('ai-reply-content');
        aiModal.classList.add('active');
        replyContent.innerHTML = '<span class="ai-typing"><i class="fa-solid fa-satellite-dish fa-spin"></i> 正在跨越光年思考中</span>';

        try {
            const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    // 零门槛国货之光：通义千问 2.5 (7B) Instruct 版，在硅基流动上永久免费！
                    model: "Qwen/Qwen2.5-7B-Instruct", 
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: "这是我抛向星空的碎片回忆：" + content }
                    ]
                })
            });
            
            const data = await response.json();
            
            // 兼容多种形态的报错抛出
            if (data.code && data.code !== 20000 && data.code !== 200) {
                throw new Error(data.message || JSON.stringify(data));
            } else if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            } else if(data.choices && data.choices.length > 0) {
                const text = data.choices[0].message.content;
                replyContent.innerHTML = '';
                
                // 存储当前 AI 回复的全部详情，供“抛入星海”使用
                currentAIText = text;
                const petNames = { fox: '星云幻狐', cat: '曜石黑猫', rabbit: '月桂星兔' };
                if(persona === 'pet') {
                    currentAIAuthor = petNames[window.myPet ? window.myPet.type : 'fox'];
                } else if(persona === 'sister') {
                    currentAIAuthor = "月亮女神";
                } else {
                    currentAIAuthor = "星河先知";
                }

                let i = 0;
                const timer = setInterval(() => {
                    if(i < text.length) {
                        replyContent.innerHTML += text.charAt(i);
                        i++;
                    } else {
                        clearInterval(timer);
                        const saveBtn = document.getElementById('btn-save-ai');
                        if (saveBtn) saveBtn.style.display = 'inline-block';
                    }
                }, 40);
            } else {
                throw new Error("无有效回复: " + JSON.stringify(data));
            }

        } catch(err) {
            console.error(`硅基流动 API 报错:`, err);
            replyContent.innerHTML = "宇宙信号再次中断... 最终死因: " + (err.message || err);
        }
    }

    // ========== 沉浸式星语空间 (1V1 匿名私聊) ==========
    let currentChatRoomId = null;
    let chatInterval = null;
    let myPendingRequest = null;

    window.sendChatRequest = async function(postId, author) {
        if(SUPABASE_URL === '你要填的URL') {
            starToast('本地预览模式不可使用星云通讯');
            return;
        }
        const req = {
            id: 'req_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            post_id: postId,
            requester_id: myClientId,
            target_author_id: author,
            status: 'pending',
            timestamp: new Date().getTime()
        };
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/chat_requests`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            });
            starToast('📡 星语邀请已发射！等待对方接收响应...');
            pollRequestStatus(req.id);
        } catch(e) { console.error('发送邀请失败', e); }
    };

    function pollRequestStatus(reqId) {
        const timer = setInterval(async () => {
            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_requests?id=eq.${reqId}`, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const data = await res.json();
                if(data && data.length > 0) {
                    if(data[0].status === 'accepted') {
                        clearInterval(timer);
                        openChatRoom(reqId);
                    } else if(data[0].status === 'rejected') {
                        clearInterval(timer);
                        starToast('📡 对方的星系拒绝了你的通讯请求...');
                    }
                }
            } catch(e) {}
        }, 5000);
    }

    setInterval(async () => {
        if(SUPABASE_URL === '你要填的URL') return;
        if(currentChatRoomId) return; 
        try {
            // 用两种方式检测：1) 按 post_id 匹配自己的帖子  2) 按 target_author_id 匹配自己的身份
            let url = `${SUPABASE_URL}/rest/v1/chat_requests?status=eq.pending&order=timestamp.desc&limit=1`;
            
            // 优先按用户名/作者名匹配（最可靠的方式）
            // 同时也检查 post_id 是否在自己发过的帖子里
            if(myPosts.length > 0) {
                url += `&post_id=in.(${myPosts.join(',')})`;
            } else {
                // 没有帖子记录时跳过
                return;
            }
            
            const res = await fetch(url, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            const data = await res.json();
            if(data && data.length > 0) {
                const req = data[0];
                if(req.requester_id !== myClientId) { 
                    showChatNotification(req);
                }
            } else {
                const noti = document.getElementById('chat-notification');
                if(noti) noti.style.display = 'none';
                myPendingRequest = null;
            }
        } catch(e) {}
    }, 8000);

    function showChatNotification(req) {
        if(myPendingRequest && myPendingRequest.id === req.id) return;
        myPendingRequest = req;
        const noti = document.getElementById('chat-notification');
        if(noti) noti.style.display = 'block';
    }

    const btnAcceptChat = document.getElementById('btn-accept-chat');
    if (btnAcceptChat) {
        btnAcceptChat.addEventListener('click', async () => {
            if(!myPendingRequest) return;
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/chat_requests?id=eq.${myPendingRequest.id}`, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'accepted' })
                });
                document.getElementById('chat-notification').style.display = 'none';
                openChatRoom(myPendingRequest.id);
            } catch(e) {}
        });
    }

    const btnRejectChat = document.getElementById('btn-reject-chat');
    if (btnRejectChat) {
        btnRejectChat.addEventListener('click', async () => {
            if(!myPendingRequest) return;
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/chat_requests?id=eq.${myPendingRequest.id}`, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'rejected' })
                });
                document.getElementById('chat-notification').style.display = 'none';
                myPendingRequest = null;
            } catch(e) {}
        });
    }

    function openChatRoom(roomId) {
        currentChatRoomId = roomId;
        const modal = document.getElementById('chat-modal');
        if(modal) modal.style.display = 'flex';
        
        const container = document.getElementById('chat-messages-container');
        if(container) container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.85rem; margin-bottom: 20px;">连接已建立，进入端到端匿名量子频段...</div>';
        
        if(chatInterval) clearInterval(chatInterval);
        fetchChatMessages();
        chatInterval = setInterval(fetchChatMessages, 3000);
    }

    const closeChatModal = document.getElementById('close-chat-modal');
    if (closeChatModal) {
        closeChatModal.addEventListener('click', () => {
            const modal = document.getElementById('chat-modal');
            if(modal) modal.style.display = 'none';
            currentChatRoomId = null;
            if(chatInterval) clearInterval(chatInterval);
        });
    }

    let lastMsgCount = 0;
    async function fetchChatMessages() {
        if(!currentChatRoomId) return;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?room_id=eq.${currentChatRoomId}&order=timestamp.asc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            const messages = await res.json();
            if(messages.length !== lastMsgCount) {
                lastMsgCount = messages.length;
                const container = document.getElementById('chat-messages-container');
                if(!container) return;
                
                container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.85rem; margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 5px; border-radius:20px;">连接已建立，进入端到端匿名量子频段...</div>';
                
                let myPetEmoji = window.myPet && window.myPet.type ? EMOJIS[window.myPet.type] : '🦊';
                let theirPetEmoji = '👽'; // 陌生星辰默认头像

                messages.forEach(msg => {
                    const isMine = msg.sender_id === myClientId;

                    if (msg.content === '[SYSTEM_HUG]') {
                        const hugText = isMine ? '你发送了一个跨星际拥抱' : '对方发送了一个跨星际拥抱';
                        container.innerHTML += `<div style="text-align:center; margin: 10px 0;"><span style="background:rgba(244,114,182,0.15); color:#f472b6; padding: 5px 15px; border-radius:15px; font-size:0.85rem; border:1px solid rgba(244,114,182,0.3);">✨ ${hugText} 🫂</span></div>`;
                        
                        // 如果是刚才接收到新的拥抱（非自己发出的），且是最新渲染的，可以触发接收端特效
                        // （在真实环境中可以通过增量渲染触发，这里简化处理）
                        return;
                    }

                    const cssClass = isMine ? 'chat-mine' : 'chat-theirs';
                    const avatar = isMine ? myPetEmoji : theirPetEmoji;
                    
                    if(isMine) {
                        container.innerHTML += `
                            <div style="display:flex; justify-content:flex-end; gap:8px; align-items:flex-end; margin-bottom: 5px;">
                                <div class="chat-bubble ${cssClass}">${msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                                <div style="font-size:1.5rem; filter:drop-shadow(0 0 5px rgba(255,255,255,0.3));">${avatar}</div>
                            </div>
                        `;
                    } else {
                        container.innerHTML += `
                            <div style="display:flex; justify-content:flex-start; gap:8px; align-items:flex-end; margin-bottom: 5px;">
                                <div style="font-size:1.5rem; filter:drop-shadow(0 0 5px rgba(255,255,255,0.3));">${avatar}</div>
                                <div class="chat-bubble ${cssClass}">${msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                            </div>
                        `;
                    }
                });
                container.scrollTop = container.scrollHeight;
            }
        } catch(e) {}
    }

    async function sendChatMessage(content) {
        if(!content || !currentChatRoomId) return;
        const newMsg = {
            id: 'msg_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            room_id: currentChatRoomId,
            sender_id: myClientId,
            content: filterProfanity(content),
            timestamp: new Date().getTime()
        };
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                body: JSON.stringify(newMsg)
            });
            fetchChatMessages();
        } catch(e) {}
    }

    const btnSendChat = document.getElementById('btn-send-chat');
    if (btnSendChat) {
        btnSendChat.addEventListener('click', async () => {
            const input = document.getElementById('chat-msg-input');
            if(!input || !input.value.trim()) return;
            await sendChatMessage(input.value.trim());
            input.value = '';
            input.focus();
        });
    }
    
    const chatMsgInput = document.getElementById('chat-msg-input');
    if (chatMsgInput) {
        chatMsgInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                const btn = document.getElementById('btn-send-chat');
                if(btn) btn.click();
            }
        });
    }

    // 发送拥抱动效
    const btnSendHug = document.getElementById('btn-send-hug');
    if (btnSendHug) {
        btnSendHug.addEventListener('click', async () => {
            await sendChatMessage('[SYSTEM_HUG]');
            // 触发自己这边的动效
            triggerHugEffect();
        });
    }

    function triggerHugEffect() {
        const modal = document.getElementById('chat-modal');
        for(let i=0; i<15; i++) {
            const heart = document.createElement('div');
            heart.textContent = ['🫂','💖','✨','🌟'][Math.floor(Math.random()*4)];
            heart.style.position = 'absolute';
            heart.style.left = Math.random() * 100 + '%';
            heart.style.top = '100%';
            heart.style.fontSize = (1.5 + Math.random()) + 'rem';
            heart.style.pointerEvents = 'none';
            heart.style.opacity = '1';
            heart.style.transition = 'all 2s cubic-bezier(0.2, 1, 0.3, 1)';
            heart.style.transform = `rotate(${Math.random()*60-30}deg)`;
            modal.appendChild(heart);

            setTimeout(() => {
                heart.style.top = (Math.random() * 40 + 10) + '%';
                heart.style.opacity = '0';
                heart.style.transform = `rotate(${Math.random()*60-30}deg) scale(1.5)`;
            }, 50);

            setTimeout(() => heart.remove(), 2000);
        }
    }

    // 切断星轨
    const btnDisconnectChat = document.getElementById('btn-disconnect-chat');
    if (btnDisconnectChat) {
        btnDisconnectChat.addEventListener('click', async () => {
            if(!currentChatRoomId) return;
            // 发送最后一条断开消息
            await sendChatMessage('📡 *星轨已断开，对方消失在深空中...*');
            
            const modal = document.getElementById('chat-modal');
            if(modal) modal.style.display = 'none';
            currentChatRoomId = null;
            if(chatInterval) clearInterval(chatInterval);
            starToast('已切断通讯，各自安好。');
        });
    }

    // ========== 互动小游戏：深空纸船放逐仪式 ==========
    const btnRitual = document.getElementById('btn-ritual');
    const ritualModal = document.getElementById('ritual-modal');
    const btnCancelRitual = document.getElementById('btn-cancel-ritual');
    const btnFireRitual = document.getElementById('btn-fire-ritual');
    const ritualContent = document.getElementById('ritual-content');
    const ritualText = document.getElementById('ritual-text');
    const ritualBlackhole = document.getElementById('ritual-blackhole');
    const ritualEcho = document.getElementById('ritual-echo');

    if (btnRitual && ritualModal) {
        btnRitual.addEventListener('click', () => {
            // 重置状态
            ritualContent.style.transform = 'none';
            ritualContent.style.opacity = '1';
            ritualContent.style.filter = 'none';
            ritualContent.style.animation = 'none';
            ritualText.value = '';
            ritualBlackhole.style.opacity = '1';
            ritualBlackhole.style.animation = 'blackholeSpin 10s linear infinite';
            ritualEcho.style.opacity = '0';
            
            ritualModal.style.opacity = '1';
            ritualModal.style.display = 'flex';
            setTimeout(() => {
                ritualText.focus();
            }, 100);
        });
    }

    if (btnCancelRitual) {
        btnCancelRitual.addEventListener('click', () => {
            ritualModal.style.display = 'none';
        });
    }

    if (btnFireRitual) {
        btnFireRitual.addEventListener('click', () => {
            if (!ritualText.value.trim()) {
                starToast('写点什么再放逐吧...');
                return;
            }

            // 触发折叠与吸入黑洞动画
            ritualContent.style.animation = 'shipFlyIntoBlackhole 4s forwards cubic-bezier(0.5, 0, 0.2, 1)';
            
            // 播放回响字幕
            setTimeout(() => {
                ritualEcho.style.opacity = '1';
            }, 2500);

            // 自动关闭
            setTimeout(() => {
                ritualModal.style.opacity = '0';
                ritualModal.style.transition = 'opacity 1s';
                
                setTimeout(() => {
                    ritualModal.style.display = 'none';
                    ritualBlackhole.style.animation = 'none';
                }, 1000);
            }, 6000);
        });
    }

});

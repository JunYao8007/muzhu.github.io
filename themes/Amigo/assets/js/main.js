let artalkInstances = [];

document.addEventListener("DOMContentLoaded", function() {
    initMoments();
    initArtalk();
    initTwikoo();
    initLightbox();
    initMenu();
    initTheme();
    initThemeToggle();
    initHeaderMedia();
    initLivePhotoShortcodes();
    initArchiveFilter();
    initHomeSearch();
    initDanmaku();
});

// 页面跳转前，先把 Artalk 评论实例给销毁掉，省得占内存
document.addEventListener("pjax:send", function() {
    artalkInstances.forEach(inst => {
        if (inst && typeof inst.destroy === 'function') {
            inst.destroy();
        }
    });
    artalkInstances = [];
    document.querySelectorAll('.twikoo-comments-area').forEach(el => {
        el.innerHTML = '';
        delete el.dataset.twikooInit;
    });
});

// 页面加载完了（包括 PJAX 跳完后），重新初始化一波
document.addEventListener("pjax:complete", function() {
    initMoments();
    initArtalk();
    initTwikoo();
    initLightbox();
    initMenu();
    initThemeToggle();
    initHeaderMedia();
    initLivePhotoShortcodes();
    initArchiveFilter();
    initHomeSearch();
    initDanmaku();
});

function initMenu() {
    // 选一下菜单开关和遮罩层
    const toggle = document.querySelector('#menu-toggle');
    const overlay = document.querySelector('#menu-overlay');
    
    if (!toggle || !overlay) {
        // console.log('找不到菜单元素');
        return;
    }

    // 克隆一下再替换，主要是为了清掉之前的事件监听器，防止重复绑定
    const newToggle = toggle.cloneNode(true);
    if (toggle.parentNode) {
        toggle.parentNode.replaceChild(newToggle, toggle);
    }
    
    // 遮罩层也一样，克隆一份干净的
    const newOverlay = overlay.cloneNode(true);
    if (overlay.parentNode) {
        overlay.parentNode.replaceChild(newOverlay, overlay);
    }

    const toggleMenu = (e) => {
        e.preventDefault(); // 别让 a 标签乱跳
        const isActive = newOverlay.classList.contains('active');
        if (isActive) {
            newOverlay.classList.remove('active');
            document.body.style.overflow = ''; // 恢复滚动
        } else {
            newOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // 菜单开了就别让背景滚了
        }
    };

    newToggle.addEventListener('click', toggleMenu);
    
    newOverlay.addEventListener('click', (e) => {
        if (e.target === newOverlay) {
            toggleMenu(e); // 点遮罩层外面也关掉
        }
    });
}

function initTwikoo() {
    const containers = document.querySelectorAll('.twikoo-comments-area');
    if (!containers.length || !window.amigoConfig) return;
    if (window.amigoConfig.commentMode !== 'twikoo') return;

    const envId = window.amigoConfig.twikooEnvId;
    if (!envId || !window.twikoo || typeof window.twikoo.init !== 'function') return;

    containers.forEach(el => {
        if (el.dataset.twikooInit) return;
        el.dataset.twikooInit = '1';

        const path = el.dataset.pageKey || location.pathname;
        const config = { envId, el, path };
        if (window.amigoConfig.twikooLang) config.lang = window.amigoConfig.twikooLang;

        el.innerHTML = '';
        window.twikoo.init(config);
    });
}

/* ==========================================================================
   主题管理（深色/浅色模式）
   ========================================================================== */

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // 应用主题的函数
    function apply(isDark) {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    // 初始化时：有本地存储就用本地的，没有就用系统的
    if (savedTheme) {
        apply(savedTheme === 'dark');
    } else {
        apply(mediaQuery.matches);
    }

    // 监听系统主题变化：如果用户没手动设置过，就跟随系统
    mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            apply(e.matches);
        }
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const isDark = current === 'dark';
    const targetDark = !isDark;
    
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (typeof Qmsg !== 'undefined') Qmsg.info('切到亮色模式啦');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (typeof Qmsg !== 'undefined') Qmsg.success('切到深色模式啦');
    }

    // 评论框也得跟着变色
    artalkInstances.forEach(inst => {
        if (inst && typeof inst.setDarkMode === 'function') {
            inst.setDarkMode(targetDark);
        }
    });

    // 如果用了 Giscus 评论，也给它发个消息改主题
    const giscusFrame = document.querySelector('iframe.giscus-frame');
    if (giscusFrame) {
        const theme = targetDark ? 'dark' : 'light';
        giscusFrame.contentWindow.postMessage(
            { giscus: { setConfig: { theme: theme } } },
            'https://giscus.app'
        );
    }
}

// 点击头像就能切换主题，挺方便的
document.addEventListener('click', (e) => {
    if (e.target.closest('.header-avatar')) {
        toggleTheme();
    }
});

// 监听系统主题变化，要是用户没手动改过，就跟着系统走
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
        if (e.matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }
});

function initThemeToggle() {
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(btn => {
        // 老规矩，克隆一份清掉监听器
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTheme();
        });
    });
}

function initLightbox() {
    // 图片浏览器初始化
    if (window.ViewImage) {
        ViewImage.init('.moment-gallery img, .article-gallery img, .article-text img');
    }
}

function initHomeSearch() {
    var header = document.querySelector('.home-header');
    if (!header) return;
    var input = document.getElementById('home-search-input');
    var clearBtn = document.getElementById('home-search-clear');
    if (!input || !clearBtn) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll('.moments-feed .moment-card'));
    var timer = null;

    function applyFilter(q) {
        var query = (q || '').trim().toLowerCase();
        var anyVisible = false;
        cards.forEach(function(card) {
            var authorEl = card.querySelector('.moment-author');
            var textEl = card.querySelector('.moment-text');
            var timeEl = card.querySelector('.moment-time');
            var locationEl = card.querySelector('.moment-location');
            var tagsEl = card.querySelector('.moment-tags');
            
            var author = authorEl ? authorEl.textContent.trim().toLowerCase() : '';
            var text = textEl ? textEl.textContent.trim().toLowerCase() : '';
            var time = timeEl ? timeEl.textContent.trim().toLowerCase() : '';
            var location = locationEl ? locationEl.textContent.trim().toLowerCase() : '';
            var tags = tagsEl ? tagsEl.textContent.trim().toLowerCase() : '';
            
            var hit = !query || 
                      author.indexOf(query) !== -1 || 
                      text.indexOf(query) !== -1 || 
                      time.indexOf(query) !== -1 || 
                      location.indexOf(query) !== -1 ||
                      tags.indexOf(query) !== -1;
            
            card.style.display = hit ? '' : 'none';
            if (hit) anyVisible = true;
        });
        clearBtn.style.display = input.value ? 'flex' : 'none';
        var emptyTip = document.getElementById('home-search-empty');
        if (!emptyTip) {
            emptyTip = document.createElement('div');
            emptyTip.id = 'home-search-empty';
            emptyTip.style.margin = '10px 0';
            emptyTip.style.color = 'var(--text-muted)';
            emptyTip.style.textAlign = 'center';
            emptyTip.style.display = 'none';
            var feed = document.querySelector('.moments-feed');
            if (feed) feed.prepend(emptyTip);
        }
        emptyTip.textContent = '未找到匹配的内容';
        emptyTip.style.display = anyVisible ? 'none' : 'block';
    }

    var newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    input = newInput;

    var newClear = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClear, clearBtn);
    clearBtn = newClear;

    input.addEventListener('input', function() {
        if (timer) clearTimeout(timer);
        var value = input.value;
        timer = setTimeout(function() { applyFilter(value); }, 150);
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            input.value = '';
            applyFilter('');
        }
    });

    clearBtn.addEventListener('click', function(e) {
        e.preventDefault();
        input.value = '';
        applyFilter('');
    });

    // 监听标签点击，自动填充搜索框并过滤
    var feed = document.querySelector('.moments-feed');
    if (feed) {
        feed.addEventListener('click', function(e) {
            // 点击标签
            if (e.target.classList.contains('moment-tag')) {
                e.preventDefault();
                e.stopPropagation();
                var tagName = e.target.textContent.replace('#', '').trim();
                input.value = tagName;
                applyFilter(tagName);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            // 点击地点
            else if (e.target.classList.contains('moment-location')) {
                e.preventDefault();
                e.stopPropagation();
                var locName = e.target.textContent.trim();
                input.value = locName;
                applyFilter(locName);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    applyFilter('');
}
function initArchiveFilter() {
    var container = document.querySelector('.archive-view');
    if (!container) return;

    var header = document.getElementById('archive-header');
    var blocks = container.querySelectorAll('.archive-year-block');
    var card = document.getElementById('archive-author-card');
    var cardName = card ? card.querySelector('.archive-author-name') : null;
    var cardMeta = card ? card.querySelector('.archive-author-meta') : null;
    var cardAvatar = card ? card.querySelector('.archive-author-avatar img') : null;

    if (!header || !blocks.length) return;

    var params = new URLSearchParams(window.location.search);
    var author = params.get('author');
    author = author ? author.trim() : '';

    if (!author) {
        header.textContent = '所有文章';
        blocks.forEach(function(block) {
            block.style.display = '';
            var items = block.querySelectorAll('.archive-item');
            items.forEach(function(item) {
                item.style.display = '';
            });
        });
        if (card) {
            card.style.display = 'none';
        }
        return;
    }

    var target = author.toLowerCase();
    var totalVisible = 0;

    var avatarSrc = '';
    var allItems = container.querySelectorAll('.archive-item');
    allItems.forEach(function(item) {
        var a = item.getAttribute('data-author') || '';
        a = a.trim().toLowerCase();
        if (!avatarSrc && a && a === target) {
            avatarSrc = item.getAttribute('data-avatar') || '';
        }
    });

    blocks.forEach(function(block) {
        var items = block.querySelectorAll('.archive-item');
        var anyVisible = false;

        items.forEach(function(item) {
            var a = item.getAttribute('data-author') || '';
            a = a.trim().toLowerCase();
            if (a && a === target) {
                item.style.display = '';
                anyVisible = true;
                totalVisible++;
            } else {
                item.style.display = 'none';
            }
        });

        block.style.display = anyVisible ? '' : 'none';
    });

    if (totalVisible > 0) {
        header.textContent = '作者：' + author + ' 的文章';
        if (card) {
            card.style.display = 'flex';
        }
        if (cardName) {
            cardName.textContent = author;
        }
        if (cardMeta) {
            cardMeta.textContent = '文章数：' + totalVisible;
        }
        if (cardAvatar && avatarSrc) {
            cardAvatar.src = avatarSrc;
        }
    } else {
        header.textContent = '暂无作者 “' + author + '” 的文章，已显示全部文章';
        blocks.forEach(function(block) {
            block.style.display = '';
            var items = block.querySelectorAll('.archive-item');
            items.forEach(function(item) {
                item.style.display = '';
            });
        });
        if (card) {
            card.style.display = 'none';
        }
    }
}

function initArtalk() {
    const containers = document.querySelectorAll('.moment-comments-area');
    if (!containers.length || !window.amigoConfig) return;

    containers.forEach(el => {
        // 别重复初始化了
        if (el.dataset.artalkInit) return;
        
        const pageKey = el.dataset.pageKey;
        if (!pageKey) return;

        // 看看是首页列表（只读风格）还是详情页（完整交互）
        const isFeed = el.classList.contains('feed-comments');

        try {
            let ArtalkConstructor = window.Artalk;
            if (typeof ArtalkConstructor !== 'function' && ArtalkConstructor.default) {
                ArtalkConstructor = ArtalkConstructor.default;
            }

            const config = {
                el: el,
                pageKey: pageKey,
                pageTitle: document.title,
                server: window.amigoConfig.artalkServer,
                site: window.amigoConfig.artalkSite,
                darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
                useBackendConf: true,
                flatMode: true, // 朋友圈风格一律用平铺模式
                nestMax: 1,
                gravatar: {
                   mirror: 'https://cravatar.cn/avatar/'
                }
            };

            // 首页列表稍微改改配置
            if (isFeed) {
                // 首页隐藏编辑器什么的
            } else {
                // 详情页保持默认
            }

            const artalk = new ArtalkConstructor(config);

            artalk.on('list-loaded', (comments) => {
                let dataList = [];
                if (Array.isArray(comments)) {
                    dataList = comments;
                } else if (comments && Array.isArray(comments.data)) {
                    dataList = comments.data;
                }

                if (window.__amigoDanmakuPush && dataList.length) {
                    window.__amigoDanmakuPush(dataList);
                }

                if (isFeed) {
                    renderWeChatFeed(artalk, el, dataList);
                } else {
                    processWeChatStyle(el, false);
                }
            });

            artalkInstances.push(artalk);
            el.dataset.artalkInit = "true";
            
            // 绑定点赞按钮（只在首页列表有）
            if (isFeed) {
                const card = el.closest('.moment-card');
                if (card) {
                    const likeBtn = card.querySelector('.btn-like');
                    if (likeBtn) {
                         likeBtn.addEventListener('click', (e) => {
                             e.stopPropagation();
                             e.preventDefault();
                             
                             // 点完赞把那个弹出小框关了
                             const popover = likeBtn.closest('.action-popover');
                             if (popover) popover.classList.remove('is-visible');

                             handleLikeAction(artalk);
                         });
                    }
                }
            }

        } catch (e) {
            console.error('Artalk 初始化失败了：', e);
        }
    });
}

/**
 * 处理点赞动作
 * 其实就是发条内容带 [LIKE] 的评论，咱们后面再把它渲染成爱心
 */
function handleLikeAction(artalkInstance) {
    // 看看用户是谁，没名字就随机分配一个“访客XXX”
    let user = artalkInstance.ctx.get('user').getData();
    let currentNick = user.nick;
    let currentEmail = user.email;

    if (!currentNick) {
        const randomNum = Math.floor(Math.random() * 10000) + 1;
        currentNick = `访客${randomNum}`;
        currentEmail = `visitor${randomNum}@example.com`; // 瞎编个邮箱
        
        try {
            artalkInstance.ctx.get('user').update({
                nick: currentNick,
                email: currentEmail
            });
        } catch (e) { console.warn('更新用户信息失败了', e); }
    }

    // 下面是一堆尝试获取编辑器并提交点赞的逻辑
    
    // 尝试 1：直接拿编辑器
    let editor = artalkInstance.editor;
    
    // 尝试 2：调方法拿
    if (!editor && typeof artalkInstance.getEditor === 'function') {
        editor = artalkInstance.getEditor();
    }
    
    // 尝试 3：从 Context 里挖（针对 2.8.x 版本）
    if (!editor && artalkInstance.ctx && typeof artalkInstance.ctx.get === 'function') {
        try {
            editor = artalkInstance.ctx.get('editor');
        } catch (e) {
            console.warn('从 ctx 里没挖到编辑器', e);
        }
    }

    // 检查一下编辑器好不好使
    if (editor && (typeof editor.getContent !== 'function' || typeof editor.setContent !== 'function')) {
        console.warn('编辑器找到了但方法不对，当没找到处理', editor);
        editor = null;
    }
    
    // 如果真没编辑器（比如只读模式），那就直接调 API 发评论
    if (!editor) {
        console.warn('没找到编辑器，尝试直接调 API 点赞');
        
        if (typeof Qmsg !== 'undefined') Qmsg.loading('正在点赞...', { autoClose: true });

        // 随机来点点赞文案，显得有生气
        const randomPhrases = [
            '很棒的文章！', 'Get！', '不错不错', '支持一下', '写得很好', 'Mark', '顶一下', 'Interesting', 'Cool', '👍'
        ];
        const randomPhrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];
        const likeContent = `👍 已点赞 ${randomPhrase} <span style="display:none">[LIKE]</span>`;

        const payload = {
            nick: currentNick,
            name: currentNick, 
            email: currentEmail,
            link: user.link || '',
            content: likeContent,
            page_key: artalkInstance.conf.pageKey,
            page_title: artalkInstance.conf.pageTitle,
            site_name: artalkInstance.conf.site
        };

        const onSuccess = () => {
             if (typeof Qmsg !== 'undefined') Qmsg.success('点赞成功！');
             artalkInstance.reload(); // 刷一下列表
        };

        const onError = (err) => {
            console.error('点赞失败了：', err);
            const msg = '点赞失败了：' + (err.message || err);
            if (typeof Qmsg !== 'undefined') Qmsg.error(msg); else alert(msg);
        };

        // 先试试 Artalk 自带的 http 工具
        try {
            const http = artalkInstance.ctx.get('http');
            if (http && typeof http.post === 'function') {
                 http.post('/comments', payload).then(onSuccess).catch(err => { throw err; });
                 return;
            }
        } catch (e) {
             console.warn('Artalk 内部 API 用不了，换原生 fetch 试试', e);
        }

        // 原生 fetch 兜底
        try {
            const serverUrl = artalkInstance.conf.server.replace(/\/$/, '');
            const apiUrl = `${serverUrl}/api/v2/comments`; 
            const headers = { 'Content-Type': 'application/json' };
            if (user.token) headers['Authorization'] = `Bearer ${user.token}`;

            fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify(payload) })
            .then(res => { if (!res.ok) return res.json().then(e => { throw new Error(e.msg || '未知错误') }); return res.json(); })
            .then(onSuccess)
            .catch(onError);
            return;
        } catch (e) { onError(e); }

        return;
    }

    // 有编辑器的话就简单了，填内容，提交！
    const originalContent = editor.getContent();
    const randomPhrases = ['很棒的文章！', 'Get！', '不错不错', '支持一下', '写得很好', 'Mark', '顶一下', 'Interesting', 'Cool', '👍'];
    const randomPhrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];
    const likeContent = `👍 已点赞 ${randomPhrase} <span style="display:none">[LIKE]</span>`;

    editor.setContent(likeContent);
    editor.submit();
}

/**
 * 格式化时间，搞成微信那种“刚刚”、“几分钟前”
 */
function formatWeChatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
        return '刚刚';
    } else if (diff < hour) {
        return Math.floor(diff / minute) + '分钟前';
    } else if (diff < day) {
        return Math.floor(diff / hour) + '小时前';
    } else if (diff < 2 * day) {
        return '昨天';
    } else {
        return (date.getMonth() + 1) + '月' + date.getDate() + '日';
    }
}

/**
 * 渲染微信朋友圈风格的评论列表
 * 把 Artalk 默认那套 DOM 藏起来，用我们自己生成的这套
 */
function renderWeChatFeed(artalkInstance, container, comments) {
    // 1. 藏起原生的列表和编辑器
    const originalList = container.querySelector('.atk-list');
    const originalEditor = container.querySelector('.atk-main-editor');
    if (originalList) originalList.style.display = 'none';
    if (originalEditor) originalEditor.style.display = 'none';

    // 2. 准备我们自己的容器
    let customContainer = container.querySelector('.wechat-custom-render');
    if (!customContainer) {
        customContainer = document.createElement('div');
        customContainer.className = 'wechat-custom-render';
        container.appendChild(customContainer);
    } else {
        customContainer.innerHTML = ''; // 清空旧的
    }

    // 3. 把点赞和普通评论分出来
    const likeNicks = [];
    const normalComments = [];
    const commentMap = new Map();

    comments.forEach(c => {
        commentMap.set(c.id, c.nick);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = c.content;
        const text = tempDiv.textContent.trim();
        const htmlContent = c.content || '';

        // 看看有没有点赞标记
        if (text === '[LIKE]' || text === '/like' || htmlContent.includes('[LIKE]')) {
            likeNicks.push(c.nick);
        } else {
            normalComments.push(c);
        }
    });

    // 4. 渲染“赞”那一部分
    let likesArea = container.querySelector('.moment-likes');
    
    if (!likesArea) {
        likesArea = document.createElement('div');
        likesArea.className = 'moment-likes';
        
        const icon = document.createElement('i');
        icon.className = 'ri-heart-line';
        likesArea.appendChild(icon);
        
        const listSpan = document.createElement('span');
        listSpan.className = 'moment-likes-list';
        likesArea.appendChild(listSpan);

        container.prepend(likesArea);
    }

    const likesListSpan = likesArea.querySelector('.moment-likes-list');

    const hasLikes = likeNicks.length > 0;
    const hasComments = normalComments.length > 0;
    const hasActivity = hasLikes || hasComments;

    if (hasLikes) {
        likesArea.style.display = 'flex'; 
        likesListSpan.textContent = likeNicks.join(', ');

        if (!hasComments) {
            likesArea.style.borderBottom = 'none';
            likesArea.style.marginBottom = '0';
            likesArea.style.paddingBottom = '0';
        } else {
            likesArea.style.borderBottom = '';
            likesArea.style.marginBottom = '';
            likesArea.style.paddingBottom = '';
        }
    } else {
        likesArea.style.display = 'none';
    }

    // 5. 渲染真正的评论
    if (normalComments.length > 0) {
        const listUl = document.createElement('div');
        listUl.className = 'wechat-comments-list';

        normalComments.forEach(c => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'wechat-comment-item';
            
            let replyTargetNick = null;
            const tempC = document.createElement('div');
            tempC.innerHTML = c.content;
            
            // 看看是不是回复某人的
            const replyAtNode = tempC.querySelector('.atk-reply-at');
            if (replyAtNode) {
                let rText = replyAtNode.textContent.trim();
                // Remove '@' if present
                if (rText.startsWith('@')) {
                    rText = rText.substring(1);
                }
                replyTargetNick = rText;
                
                // CRITICAL: Remove the node from content so it doesn't duplicate
                replyAtNode.remove();
            }

            // Priority 1: Direct field (Artalk standard)
            if (!replyTargetNick && c.reply_nick) {
                replyTargetNick = c.reply_nick;
            } 
            // Priority 2: Nested object (Artalk 2.x some versions)
            else if (!replyTargetNick && c.reply_user && c.reply_user.nick) {
                replyTargetNick = c.reply_user.nick;
            }
            // Priority 3: UA data (sometimes stored here)
            else if (!replyTargetNick && c.ua && c.ua.reply_nick) {
                replyTargetNick = c.ua.reply_nick;
            }
            // Priority 4: Look up by rid/pid
            else if (!replyTargetNick && c.rid && c.rid !== 0) {
                // Try to find the parent comment
                // If pid exists, use it (direct parent), otherwise use rid (root)
                const targetId = c.pid || c.rid;
                if (commentMap.has(targetId)) {
                    replyTargetNick = commentMap.get(targetId);
                }
            }

            // 主体部分（昵称 + 回复对象 + 内容）放在一块，方便右侧放时间
            const mainSpan = document.createElement('span');
            mainSpan.className = 'wechat-main';

            // Nickname
            const nickSpan = document.createElement('span');
            nickSpan.className = 'wechat-nick';
            nickSpan.textContent = c.nick;
            mainSpan.appendChild(nickSpan);

            // Reply Logic
            if (replyTargetNick) {
                const replyText = document.createTextNode('回复');
                const targetSpan = document.createElement('span');
                targetSpan.className = 'wechat-nick';
                targetSpan.textContent = replyTargetNick;
                
                mainSpan.appendChild(replyText);
                mainSpan.appendChild(targetSpan);
            }

            // Colon (Always present before content)
            const colonSpan = document.createElement('span');
            colonSpan.className = 'wechat-colon';
            colonSpan.textContent = ' : ';
            mainSpan.appendChild(colonSpan);

            // Content
            const contentSpan = document.createElement('span');
            contentSpan.className = 'wechat-content';
            
            // Unwrap <p>
            const ps = tempC.querySelectorAll('p');
            if (ps.length > 0) {
               ps.forEach(p => {
                   const s = document.createElement('span');
                   s.innerHTML = p.innerHTML;
                   p.replaceWith(s);
               });
            }
            contentSpan.innerHTML = tempC.innerHTML;
            mainSpan.appendChild(contentSpan);

            // 时间
            let timeSpan = null;
            if (c.date) {
                timeSpan = document.createElement('span');
                timeSpan.className = 'wechat-time';
                timeSpan.textContent = formatWeChatTime(c.date);
            }

            itemDiv.appendChild(mainSpan);
            if (timeSpan) itemDiv.appendChild(timeSpan);
            
            listUl.appendChild(itemDiv);
        });

        customContainer.appendChild(listUl);
    }

    // 6. Handle Container Visibility (Empty State)
    if (!hasLikes && !hasComments) {
        container.style.display = 'none';
    } else {
        // Show with animation (was display:none in CSS)
        container.style.display = 'block';
        container.style.animation = 'fadeIn 0.3s ease-out';
    }
}


/**
 * Process Artalk list to match WeChat Official Account style (Single Page)
 * Mainly filters out "Like" comments which shouldn't appear in the article comment list.
 */
function processWeChatStyle(container, isFeed) {
    if (isFeed) return; // Feed uses renderWeChatFeed instead

    // Wait for DOM to be ready (Artalk renders async)
    // We use a small timeout or assume this is called after list-loaded
    
    const items = container.querySelectorAll('.atk-item');
    
    items.forEach(item => {
        const contentEl = item.querySelector('.atk-content');
        if (!contentEl) return;

        const htmlContent = contentEl.innerHTML;
        const textContent = contentEl.textContent.trim();
        
        // Check for [LIKE] marker in text or hidden span
        const isLike = textContent === '[LIKE]' || 
                       textContent === '/like' || 
                       htmlContent.includes('[LIKE]');

        if (isLike) {
            item.style.display = 'none';
        }
    });
    
    // Also, we might want to change the "No Comments" text if empty
    const list = container.querySelector('.atk-list');
    if (list && list.children.length === 0) {
        // Artalk handles empty state, but if we hid everything, we might need to show something?
        // Usually Artalk shows "No comments" if data is empty. 
        // If data had only likes, Artalk thinks there are comments, but we hid them.
        // We should check visible items.
    }
}

// Old function replaced by processWeChatStyle
// function formatArtalkReplies(container, isFeed) { ... }

function initHeaderMedia() {
    var header = document.querySelector('.moments-header');
    if (!header || !window.amigoConfig) return;
    // 若已包含视频，跳过动态图逻辑
    if (header.querySelector('video.moments-header-video')) return;

    var list = (window.amigoConfig.headerMediaList || []).filter(function(src) {
        return typeof src === 'string' && /\.(avif|jpg|jpeg|png|gif|webp)$/i.test(src);
    });
    var single = window.amigoConfig.headerMedia || '';
    var isImage = /\.(avif|jpg|jpeg|png|gif|webp)$/i.test(single);
    var isVideo = /\.(mp4|webm|ogg)$/i.test(single);

    // 1) 多图轮播（参考：朴素实现）
    if (list.length >= 2 && !isVideo) {
        var dynamic = header.querySelector('.moments-header-dynamic');
        if (!dynamic) {
            dynamic = document.createElement('div');
            dynamic.className = 'moments-header-dynamic';
            header.appendChild(dynamic);
        } else {
            dynamic.innerHTML = '';
        }

        var slides = [];
        list.forEach(function(src, idx) {
            var img = document.createElement('img');
            img.className = 'slide' + (idx === 0 ? ' active' : '');
            img.src = src;
            img.alt = 'header slide';
            img.loading = 'eager';
            dynamic.appendChild(img);
            slides.push(img);
        });

        var i = 0;
        function next() {
            var cur = i;
            var nxt = (i + 1) % slides.length;
            slides[cur].classList.remove('active');
            slides[nxt].classList.add('active');
            i = nxt;
            setTimeout(next, 6000);
        }
        setTimeout(next, 6000);
        return;
    }

    // 2) 单图 Live Photo：同名视频触发播放（mouseenter / touch）
    if (isImage && !isVideo) {
        // 生成同名视频路径（.mp4）
        var videoSrc = single.replace(/\.(avif|jpg|jpeg|png|gif|webp)$/i, '.mp4');
        var video = document.createElement('video');
        video.className = 'moments-header-live';
        video.src = videoSrc;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.loop = true;
        video.preload = 'metadata';
        // 允许声音，因交互触发，不受自动播放限制；如需静音可改为 video.muted = true;
        video.muted = false;

        var available = true;
        video.addEventListener('error', function() {
            available = false;
            if (video && video.parentNode) video.parentNode.removeChild(video);
        }, { once: true });
        video.addEventListener('play', function() {
            video.classList.add('playing');
        });
        video.addEventListener('pause', function() {
            video.classList.remove('playing');
        });

        header.appendChild(video);

        function playLive() {
            if (!available) return;
            // 交互触发播放，带声音
            var p = video.play();
            if (p && typeof p.catch === 'function') {
                p.catch(function() {});
            }
        }
        function stopLive() {
            if (!available) return;
            video.pause();
            try { video.currentTime = 0; } catch(e) {}
        }

        header.addEventListener('mouseenter', playLive);
        header.addEventListener('mouseleave', stopLive);
        header.addEventListener('touchstart', function() {
            playLive();
        }, { passive: true });
        header.addEventListener('touchend', function() {
            stopLive();
        }, { passive: true });
        header.addEventListener('touchcancel', function() {
            stopLive();
        }, { passive: true });
        return;
    }
}

function initLivePhotoShortcodes() {
    document.querySelectorAll('.live-photo').forEach(function(livePhoto) {
        if (livePhoto.__liveBound) return;
        livePhoto.__liveBound = true;

        var video = livePhoto.querySelector('video.live-photo-video') || livePhoto.querySelector('video');
        var posterImg = livePhoto.querySelector('img.live-photo-poster') || livePhoto.querySelector('img');
        var toggleBtn = livePhoto.querySelector('.live-photo-toggle-btn');
        var muteBtn = livePhoto.querySelector('.live-photo-mute-btn');
        var warning = livePhoto.querySelector('.warning');

        if (!video || !toggleBtn || !muteBtn) return;

        var HOVER_DELAY = 500;
        var hoverTimer = null;
        var isManuallyControlled = toggleBtn.getAttribute('data-state') === 'live';
        var isLoaded = false;

        function setWarning(text) {
            if (!warning) return;
            warning.textContent = text || '';
            if (text) warning.classList.add('show');
            else warning.classList.remove('show');
        }

        function syncAspectFromPoster() {
            if (!posterImg) return;
            var w = posterImg.naturalWidth || 0;
            var h = posterImg.naturalHeight || 0;
            if (!w || !h) return;
            livePhoto.style.setProperty('--live-photo-aspect', w + ' / ' + h);
        }

        if (posterImg && posterImg.complete) {
            syncAspectFromPoster();
        } else if (posterImg) {
            posterImg.addEventListener('load', function() {
                syncAspectFromPoster();
            }, { once: true });
        }

        function ensureLoaded() {
            if (isLoaded) return;
            isLoaded = true;
            var src = (video.dataset && video.dataset.src) ? video.dataset.src : '';
            if (src && !video.getAttribute('src')) {
                video.setAttribute('src', src);
                video.src = src;
            }
            try { video.load(); } catch (e) {}
        }

        function setMuted(isMuted) {
            video.muted = !!isMuted;
            if (isMuted) video.setAttribute('muted', '');
            else video.removeAttribute('muted');
            muteBtn.setAttribute('data-muted', isMuted ? 'true' : 'false');
        }

        function getMuted() {
            return muteBtn.getAttribute('data-muted') !== 'false';
        }

        if (!video.hasAttribute('muted')) setMuted(true);
        else setMuted(getMuted());

        function stopVideo(force) {
            if (!force && isManuallyControlled) return;
            if (hoverTimer) {
                clearTimeout(hoverTimer);
                hoverTimer = null;
            }
            livePhoto.classList.remove('is-playing');
            setWarning('');
            try { video.pause(); } catch (e) {}
            try { video.currentTime = 0; } catch (e) {}
        }

        async function playVideo(opts) {
            ensureLoaded();
            setWarning('');

            var wantUnmute = opts && opts.unmute === true;
            if (wantUnmute) setMuted(false);
            else setMuted(getMuted());

            try { video.currentTime = 0; } catch (e) {}

            try {
                var p = video.play();
                if (p && typeof p.catch === 'function') await p;
                livePhoto.classList.add('is-playing');
                return;
            } catch (e) {
                if (!video.muted) {
                    setMuted(true);
                    try {
                        var p2 = video.play();
                        if (p2 && typeof p2.catch === 'function') await p2;
                        livePhoto.classList.add('is-playing');
                        return;
                    } catch (e2) {}
                }

                if (e && e.name === 'AbortError') return;
                if (e && e.name === 'NotAllowedError') {
                    setWarning('浏览器未允许视频自动播放权限，无法播放实况照片。');
                } else if (e && e.name === 'NotSupportedError') {
                    setWarning('视频未加载完成或浏览器不支持播放此视频格式。');
                } else {
                    setWarning('其它错误：' + e);
                }
            }
        }

        function scheduleHoverPlay() {
            if (isManuallyControlled) return;
            if (hoverTimer) clearTimeout(hoverTimer);
            hoverTimer = setTimeout(function() {
                playVideo({ unmute: false });
            }, HOVER_DELAY);
        }

        livePhoto.addEventListener('mouseenter', function() {
            scheduleHoverPlay();
        });
        livePhoto.addEventListener('mouseleave', function() {
            stopVideo(false);
        });

        livePhoto.addEventListener('touchstart', function() {
            scheduleHoverPlay();
        }, { passive: true });
        livePhoto.addEventListener('touchend', function() {
            stopVideo(false);
        }, { passive: true });
        livePhoto.addEventListener('touchcancel', function() {
            stopVideo(false);
        }, { passive: true });

        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();

            isManuallyControlled = !isManuallyControlled;
            toggleBtn.setAttribute('data-state', isManuallyControlled ? 'live' : 'static');

            if (isManuallyControlled) {
                playVideo({ unmute: false });
            } else {
                stopVideo(true);
            }
        });

        muteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();

            var nextMuted = !getMuted();
            setMuted(nextMuted);

            if (!nextMuted && (isManuallyControlled || livePhoto.classList.contains('is-playing'))) {
                playVideo({ unmute: true });
            }
        });

        video.addEventListener('pause', function() {
            if (!isManuallyControlled) {
                livePhoto.classList.remove('is-playing');
            }
        });
        video.addEventListener('ended', function() {
            if (!isManuallyControlled) {
                stopVideo(true);
            }
        });
    });
}

function initDanmaku() {
    const root = document.getElementById('danmaku-root');
    if (!root || !window.amigoConfig) return;
    if (window.__amigoDanmakuInit) return;

    const cfg = window.amigoConfig;
    if (cfg.commentMode !== 'artalk' || cfg.enableDanmaku === false) return;

    window.__amigoDanmakuInit = true;

    const trackCount = 6;
    const tracks = [];
    for (let i = 0; i < trackCount; i++) {
        const trackEl = document.createElement('div');
        trackEl.className = 'danmaku-track';
        root.appendChild(trackEl);
        tracks.push({ el: trackEl, busy: false });
    }

    let queue = [];
    let lastFire = 0;
    let gapMs = 1000;

    function cleanContent(html) {
        if (!html) return '';
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const replyEls = temp.querySelectorAll('.atk-reply-at');
        replyEls.forEach(function(node) {
            node.remove();
        });
        let text = temp.textContent || '';
        text = text.replace(/\[LIKE\]/gi, '').replace(/\/like/gi, '');
        text = text.replace(/\s+/g, ' ');
        return text.trim();
    }

    function normalizeItem(raw) {
        if (!raw) return null;
        const html = raw.content || raw.content_html || raw.comment || '';
        const text = cleanContent(html);
        if (!text) return null;
        const nick = raw.nick || raw.name || '游客';
        const date = raw.date || raw.created_at || raw.createdAt || '';
        return { nick: nick, text: text, date: date };
    }

    window.__amigoDanmakuPush = function(list) {
        if (!Array.isArray(list)) return;
        list.forEach(function(raw) {
            const item = normalizeItem(raw);
            if (!item) return;
            queue.push(item);
            if (queue.length > 200) {
                queue.splice(0, queue.length - 200);
            }
        });
    };

    function pushToTrack(track, item) {
        const el = document.createElement('div');
        el.className = 'danmaku-item';

        const nickSpan = document.createElement('span');
        nickSpan.className = 'danmaku-nick';
        nickSpan.textContent = item.nick;

        const sepSpan = document.createElement('span');
        sepSpan.className = 'danmaku-sep';
        sepSpan.textContent = ':';

        const textSpan = document.createElement('span');
        textSpan.className = 'danmaku-text';
        textSpan.textContent = item.text;

        el.appendChild(nickSpan);
        el.appendChild(sepSpan);
        el.appendChild(textSpan);

        track.el.appendChild(el);

        const duration = 12 + Math.random() * 6;
        el.style.animation = 'danmaku-move ' + duration + 's linear forwards';

        setTimeout(function() {
            if (track.el.contains(el)) {
                track.el.removeChild(el);
            }
            track.busy = false;
        }, duration * 1000 + 200);
    }

    function loop() {
        if (document.hidden) {
            setTimeout(loop, 2000);
            return;
        }

        if (queue.length) {
            const now = Date.now();
            if (now - lastFire >= gapMs) {
                const available = tracks.find(t => !t.busy);
                if (available) {
                    const rootHeight = root.clientHeight || 200;
                    const maxTop = Math.max(0, rootHeight - 28);
                    const top = Math.random() * maxTop;
                    available.el.style.top = top + 'px';
                    const item = queue.shift();
                    available.busy = true;
                    pushToTrack(available, item);
                    lastFire = now;
                    gapMs = 900 + Math.floor(Math.random() * 600);
                }
            }
        }

        setTimeout(loop, 300);
    }

    setTimeout(loop, 1000);
}

function initMoments() {
    // 1. Handle Text Expand/Collapse
    const posts = document.querySelectorAll('.moment-card');
    
    posts.forEach(card => {
        const textWrapper = card.querySelector('.moment-text-wrapper');
        if (!textWrapper) return;

        const textDiv = textWrapper.querySelector('.moment-text');
        const toggleBtn = textWrapper.querySelector('.text-toggle');

        if (textDiv && toggleBtn) {
            const livePhotos = Array.prototype.slice.call(textDiv.querySelectorAll('.live-photo'));
            if (livePhotos.length) {
                let liveWrap = card.querySelector('.moment-livephotos');
                if (!liveWrap) {
                    liveWrap = document.createElement('div');
                    liveWrap.className = 'moment-livephotos moment-gallery';
                } else {
                    liveWrap.className = 'moment-livephotos moment-gallery';
                    liveWrap.innerHTML = '';
                }

                if (livePhotos.length === 1) {
                    const single = document.createElement('div');
                    single.className = 'gallery-single';
                    single.appendChild(livePhotos[0]);
                    liveWrap.appendChild(single);
                } else {
                    const grid = document.createElement('div');
                    const len = livePhotos.length;
                    grid.className = 'gallery-grid ' + ((len === 2 || len === 4) ? 'cols-2' : 'cols-3');

                    livePhotos.forEach(function(node) {
                        const item = document.createElement('div');
                        item.className = 'gallery-item';
                        item.appendChild(node);
                        grid.appendChild(item);
                    });

                    liveWrap.appendChild(grid);
                }

                textWrapper.insertAdjacentElement('afterend', liveWrap);
            }

            // Reset state for re-init
            textDiv.classList.add('is-collapsed');
            toggleBtn.style.display = 'none';
            toggleBtn.innerText = '全文';

            // Check overflow after a small delay to ensure rendering
            setTimeout(() => {
                const isOverflowing = textDiv.scrollHeight > textDiv.clientHeight;
                if (isOverflowing) {
                    toggleBtn.style.display = 'inline-block';
                }
            }, 100);

            // Toggle Click Handler
            toggleBtn.onclick = function() {
                const isCollapsed = textDiv.classList.contains('is-collapsed');
                if (isCollapsed) {
                    textDiv.classList.remove('is-collapsed');
                    toggleBtn.innerText = '收起';
                } else {
                    textDiv.classList.add('is-collapsed');
                    toggleBtn.innerText = '全文';
                    // Scroll back to card top if user collapsed a long text
                    const cardTop = card.getBoundingClientRect().top + window.scrollY - 80;
                    if (window.scrollY > cardTop) {
                        window.scrollTo({ top: cardTop, behavior: 'smooth' });
                    }
                }
            };
        }
    });

    // 2. Handle Action Menu (Popover)
    // Close all popovers when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.action-wrapper')) {
            document.querySelectorAll('.action-popover').forEach(el => {
                el.classList.remove('is-visible');
            });
        }
    });

    const actionWrappers = document.querySelectorAll('.action-wrapper');
    actionWrappers.forEach(wrapper => {
        const toggleBtn = wrapper.querySelector('.action-toggle');
        const popover = wrapper.querySelector('.action-popover');

        if (toggleBtn && popover) {
            toggleBtn.onclick = function(e) {
                e.stopPropagation(); // Prevent document click
                
                // Close others first
                document.querySelectorAll('.action-popover').forEach(el => {
                    if (el !== popover) el.classList.remove('is-visible');
                });

                // Toggle current
                popover.classList.toggle('is-visible');
            };
        }
    });
}

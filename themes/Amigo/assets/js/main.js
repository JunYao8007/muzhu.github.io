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
    initDanmaku();
    initVoiceMessages();
    initInfiniteFeed();
    initProfileCard();
    initShuoshuoFeed();
    if (typeof window.initTravelMap === 'function') window.initTravelMap();
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
    initDanmaku();
    initVoiceMessages();
    initInfiniteFeed();
    initProfileCard();
    initShuoshuoFeed();
});

/* ========== 双击头像弹出个人资料卡片（含卡片内搜索） ========== */
function initProfileCard() {
    var avatar = document.querySelector('.moments-header .header-avatar');
    var overlay = document.getElementById('profile-overlay');
    var card = document.getElementById('profile-card');
    if (!avatar || !overlay || !card || avatar.dataset.profileInit) return;
    avatar.dataset.profileInit = '1';

    var searchIndex = null;
    var searchTimer = null;

    /* ---------- 弹窗开关 ---------- */
    function open() {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function close() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(exitSearch, 300);
    }

    /* ---------- 双击检测 ----------
       桌面用原生 dblclick；移动端用两次 touchstart（间隔 ≤400ms，
       移动距离 ≤20px）模拟，避免单 click 双击检测被浏览器的 300ms
       点击延迟吞掉。*/
    var TAP_MAX = 400;   // 两次触摸最大间隔（毫秒）
    var TAP_MOVE = 20;   // 触摸期间允许的最大移动（像素）
    var lastTap = 0;
    var touchStartX = 0;
    var touchStartY = 0;

    avatar.addEventListener('dblclick', open);

    avatar.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        var now = Date.now();
        if (now - lastTap < TAP_MAX) {
            e.preventDefault();   // 阻止浏览器双击放大
            open();
            lastTap = 0;
        } else {
            lastTap = now;
        }
    }, { passive: false });

    // 移动距离过大则取消双击判定
    avatar.addEventListener('touchmove', function (e) {
        var t = e.changedTouches[0];
        if (Math.abs(t.clientX - touchStartX) > TAP_MOVE ||
            Math.abs(t.clientY - touchStartY) > TAP_MOVE) {
            lastTap = 0;
        }
    }, { passive: true });

    var closeBtn = document.getElementById('profile-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) close();
    });
    if (!window.__amigoProfileEsc) {
        window.__amigoProfileEsc = true;
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                // 搜索视图里先退搜索，再按才关卡片
                if (card.classList.contains('is-searching')) {
                    exitSearch();
                } else {
                    close();
                }
            }
        });
    }

    /* ---------- 卡片内搜索 ---------- */
    var searchBtn = document.getElementById('profile-search-btn');
    var searchView = document.getElementById('profile-search-view');
    var searchInput = document.getElementById('profile-search-input');
    var searchClear = document.getElementById('profile-search-clear');
    var searchBack = document.getElementById('profile-search-back');
    var searchResults = document.getElementById('profile-search-results');
    if (!searchBtn || !searchView || !searchInput || !searchResults) return;

    // 从页面 DOM 构建搜索索引（无限滚动只是隐藏，卡片都在 DOM 里）
    function buildIndex() {
        var cards = document.querySelectorAll('.moments-feed .moment-card');
        var list = [];
        Array.prototype.forEach.call(cards, function(el) {
            var textEl = el.querySelector('.moment-text');
            var timeEl = el.querySelector('.moment-time');
            var authorEl = el.querySelector('.moment-author');
            var locEl = el.querySelector('.moment-location');
            var tagsEl = el.querySelector('.moment-tags');
            var linkEl = el.querySelector('.action-wrapper a[href]');
            list.push({
                el: el,
                text: textEl ? textEl.textContent.replace(/\s+/g, ' ').trim() : '',
                time: timeEl ? timeEl.textContent.trim() : '',
                author: authorEl ? authorEl.textContent.trim() : '',
                location: locEl ? locEl.textContent.trim() : '',
                tags: tagsEl ? tagsEl.textContent.trim() : '',
                url: linkEl ? linkEl.getAttribute('href') : ('#' + el.id)
            });
        });
        return list;
    }

    function enterSearch(prefill) {
        searchIndex = searchIndex || buildIndex();
        // 关键：先把搜索视图锁成资料视图同样的高度，卡片就不会跳动、重新居中
        var cardH = card.offsetHeight;
        var maxH = Math.round(window.innerHeight * 0.8);
        searchView.style.height = Math.min(cardH, maxH) + 'px';
        card.classList.add('is-searching');
        searchInput.value = prefill || '';
        setTab('all');
        runSearch();
        setTimeout(function() { searchInput.focus(); }, 120);
    }
    function exitSearch() {
        card.classList.remove('is-searching');
        searchView.style.height = '';
        searchInput.value = '';
        searchClear.style.display = 'none';
        searchResults.innerHTML = '';
    }

    // 点击"友情链接 / RSS"等链接行时，自动关闭卡片（PJAX 跳转不会关遮罩）
    var linkRows = card.querySelectorAll('.profile-row[href]');
    Array.prototype.forEach.call(linkRows, function(a) {
        a.addEventListener('click', function() { close(); });
    });

    // 生成高亮片段：截取关键词前后各约 28 个字符
    function snippet(text, query) {
        var idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return escapeHtml(text.slice(0, 60)) + (text.length > 60 ? '…' : '');
        var start = Math.max(0, idx - 28);
        var end = Math.min(text.length, idx + query.length + 32);
        var prefix = start > 0 ? '…' : '';
        var suffix = end < text.length ? '…' : '';
        var raw = text.slice(start, idx) + '\x01' + text.slice(idx, idx + query.length) + '\x02' + text.slice(idx + query.length, end);
        return escapeHtml(prefix + raw + suffix)
            .replace('\x01', '<mark>').replace('\x02', '</mark>');
    }
    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function runSearch() {
        var query = searchInput.value.trim().toLowerCase();
        searchClear.style.display = query ? 'flex' : 'none';
        if (!query) {
            renderDiscover();
            return;
        }
        var hits = [];
        searchIndex.forEach(function(item) {
            var inText = item.text.toLowerCase().indexOf(query) !== -1 || item.author.toLowerCase().indexOf(query) !== -1;
            var inTags = item.tags.toLowerCase().indexOf(query) !== -1;
            var inLoc = item.location.toLowerCase().indexOf(query) !== -1;
            var inMeta = item.time.toLowerCase().indexOf(query) !== -1;
            // 按分类 tab 过滤：全部命中任意字段即可，其余只认对应字段
            var ok = currentTab === 'all' ? (inText || inTags || inLoc || inMeta)
                : currentTab === 'text' ? inText
                : currentTab === 'tags' ? inTags
                : inLoc;
            if (ok) hits.push(item);
        });
        if (!hits.length) {
            searchResults.innerHTML = '<div class="profile-search-tip"><i class="ri-emotion-sad-line"></i>未找到相关内容</div>';
            return;
        }
        var html = '<div class="profile-search-count">找到 ' + hits.length + ' 条动态</div>';
        hits.slice(0, 20).forEach(function(item) {
            var where = item.location ? '<span class="sr-loc"><i class="ri-map-pin-line"></i>' + escapeHtml(item.location) + '</span>' : '';
            html += '<button class="profile-search-item" type="button" data-target="' + item.el.id + '">' +
                '<span class="sr-time">' + escapeHtml(item.time) + where + '</span>' +
                '<span class="sr-text">' + snippet(item.text, query) + '</span>' +
                '</button>';
        });
        searchResults.innerHTML = html;
    }

    /* ---------- 搜索发现：随机动态标题 ---------- */
    function renderDiscover() {
        if (!searchIndex || !searchIndex.length) {
            searchResults.innerHTML = '';
            return;
        }
        // 洗牌取 8 条
        var pool = searchIndex.slice();
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }
        var picks = pool.slice(0, 4);
        var html = '<div class="ss-discover-title"><span>搜索发现</span></div><div class="ss-discover-list">';
        picks.forEach(function(item) {
            var title = item.text.replace(/\s+/g, ' ').trim();
            if (!title) title = item.time || '（无文字动态）';
            html += '<button class="ss-discover-item" type="button" data-target="' + item.el.id + '"><span class="ss-discover-text">' + escapeHtml(title) + '</span></button>';
        });
        html += '</div>';
        searchResults.innerHTML = html;
    }

    /* ---------- 搜一搜分类 tab ---------- */
    var currentTab = 'all';
    var tabsEl = document.getElementById('ss-tabs');
    function setTab(tab) {
        currentTab = tab;
        if (!tabsEl) return;
        Array.prototype.forEach.call(tabsEl.querySelectorAll('.ss-tab'), function(t) {
            t.classList.toggle('active', t.getAttribute('data-tab') === tab);
        });
    }
    if (tabsEl) {
        tabsEl.addEventListener('click', function(e) {
            var t = e.target.closest ? e.target.closest('.ss-tab') : null;
            if (!t) return;
            setTab(t.getAttribute('data-tab'));
            runSearch();
        });
    }

    // 点击结果：关卡片 → 展开到目标动态 → 平滑滚动 + 闪烁高亮
    searchResults.addEventListener('click', function(e) {
        var item = e.target.closest ? e.target.closest('.profile-search-item, .ss-discover-item') : null;
        if (!item) return;
        var targetId = item.getAttribute('data-target');
        var target = document.getElementById(targetId);
        close();
        if (!target) return;
        // 无限滚动隐藏的卡片，展开到它所在批次
        var feed = document.querySelector('.moments-feed.feed-infinite');
        if (feed && feed.__amigoInfinite) {
            var st = feed.__amigoInfinite;
            var all = Array.prototype.slice.call(feed.querySelectorAll('.moment-card'));
            var idx = all.indexOf(target);
            if (idx !== -1 && idx >= st.shown) {
                st.shown = Math.min(idx + 1, all.length);
                st.hide();
            }
        }
        setTimeout(function() {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('moment-flash');
            setTimeout(function() { target.classList.remove('moment-flash'); }, 2400);
        }, 150);
    });

    searchBtn.addEventListener('click', function() { enterSearch(''); });
    searchBack.addEventListener('click', exitSearch);
    var searchGo = document.getElementById('profile-search-go');
    if (searchGo) searchGo.addEventListener('click', function() {
        runSearch();
        searchInput.blur();
    });
    if (searchClear) searchClear.addEventListener('click', function() {
        searchInput.value = '';
        runSearch();
        searchInput.focus();
    });
    searchInput.addEventListener('input', function() {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(runSearch, 120);
    });
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') e.preventDefault();
    });

    // 点击首页动态里的标签 → 打开卡片搜索（地点是链接，跳转旅行地图）
    var feed = document.querySelector('.moments-feed');
    if (feed) {
        feed.addEventListener('click', function(e) {
            var isTag = e.target.classList.contains('moment-tag');
            if (!isTag) return;
            e.preventDefault();
            e.stopPropagation();
            var word = e.target.textContent.replace('#', '').trim();
            open();
            setTimeout(function() { enterSearch(word); }, 200);
        });
    }
}

/* ========== 首页无限滚动加载 ========== */
function initInfiniteFeed() {
    var feed = document.querySelector('.moments-feed.feed-infinite');
    if (!feed || feed.dataset.infiniteInit) return;
    feed.dataset.infiniteInit = '1';

    var cards = Array.prototype.slice.call(feed.querySelectorAll('.moment-card'));
    var pageSize = parseInt(feed.dataset.feedPageSize, 10) || 10;
    if (cards.length <= pageSize) return;

    var state = {
        shown: pageSize,
        observer: null,
        timer: null
    };

    // 底部哨兵：滑到附近显示"正在加载中"，然后展示下一批
    var sentinel = document.createElement('div');
    sentinel.className = 'feed-sentinel';
    sentinel.innerHTML = '<i class="ri-loader-4-line"></i><span>正在加载中</span>';

    function hideRest() {
        cards.forEach(function(card, i) {
            card.style.display = i < state.shown ? '' : 'none';
        });
    }

    function finish() {
        if (state.observer) state.observer.disconnect();
        if (sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
        var end = document.createElement('div');
        end.className = 'feed-end';
        end.innerHTML = '<span>— 已经到底啦 —</span>';
        feed.appendChild(end);
    }

    function update() {
        // 无论哪个分支，都先把该显示的文章显示出来
        hideRest();
        if (state.shown >= cards.length) {
            finish();
        } else {
            feed.appendChild(sentinel);
        }
    }

    state.observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting || state.timer) return;
            sentinel.classList.add('is-loading');
            state.timer = setTimeout(function() {
                state.timer = null;
                sentinel.classList.remove('is-loading');
                // 最后一批只加载到实际数量，不会超出
                state.shown = Math.min(state.shown + pageSize, cards.length);
                update();
            }, 500);
        });
    }, { rootMargin: '0px 0px 300px 0px' });

    state.hide = hideRest;
    state.sentinel = sentinel;
    feed.__amigoInfinite = state;
    update();
    // 关键：把哨兵元素挂到观察器上，滑到附近才会触发加载
    state.observer.observe(sentinel);
}

// 搜索清空后，恢复"只显示已加载批次"的状态
function restoreFeedLazy() {
    var feeds = document.querySelectorAll('.moments-feed.feed-infinite');
    Array.prototype.forEach.call(feeds, function(feed) {
        var st = feed.__amigoInfinite;
        if (!st) return;
        if (st.sentinel && st.sentinel.parentNode) st.sentinel.style.display = '';
        st.hide();
    });
}

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
        if (typeof Qmsg !== 'undefined') Qmsg.info('切到亮色模式');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (typeof Qmsg !== 'undefined') Qmsg.success('切到深色模式');
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

    // 2) 单图 Live Photo 功能已禁用，避免无视频时产生 404 错误
    // 如需启用，请确保 /images/header.mp4 存在，并恢复以下代码：
    // if (isImage && !isVideo) { ... }
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

            // 检查是否有语音消息：取消折叠
            const voiceMsgs = textDiv.querySelectorAll('.amigo-voice-bubble');
            if (voiceMsgs.length) {
                textDiv.classList.add('has-voice');
                textWrapper.classList.add('has-voice');
            }

            // Reset state for re-init
            textDiv.classList.add('is-collapsed');
            toggleBtn.style.display = 'none';
            toggleBtn.innerText = '全文';

            // 如果有语音消息或音乐卡片，不需要折叠
            const hasSpecialContent = voiceMsgs.length > 0 || textDiv.querySelectorAll('.ncm-card').length > 0;

            // Check overflow after a small delay to ensure rendering
            setTimeout(() => {
                if (hasSpecialContent) {
                    // 不折叠，直接展开
                    textDiv.classList.remove('is-collapsed');
                    toggleBtn.style.display = 'none';
                    return;
                }
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

/* ==========================================================================
   微信语音消息功能 (voice shortcode)
   ========================================================================== */

function initVoiceMessages() {
    document.querySelectorAll('.amigo-voice-bubble').forEach(el => {
        if (el.dataset.voiceInit) return;
        el.dataset.voiceInit = 'true';

        const src = el.dataset.src;
        if (!src) return;

        const durationEl = el.querySelector('.amigo-voice-duration');
        let audio = null;
        let isPlaying = false;
        let totalSeconds = null;

        // 更新倒计时显示
        const updateCountdown = () => {
            if (!audio || !totalSeconds) return;
            const remaining = Math.max(0, totalSeconds - Math.floor(audio.currentTime));
            durationEl.textContent = remaining + '\u2033';
        };

        // 立即加载音频获取真实时长
        const probe = new Audio();
        probe.preload = 'metadata';
        probe.addEventListener('loadedmetadata', () => {
            if (probe.duration && !isNaN(probe.duration)) {
                totalSeconds = Math.round(probe.duration);
                durationEl.textContent = totalSeconds + '\u2033';
            }
        });
        probe.src = src;

        const stop = () => {
            if (el._voiceTimer) {
                clearInterval(el._voiceTimer);
                el._voiceTimer = null;
            }
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            isPlaying = false;
            el.classList.remove('is-playing');
            // 恢复显示总时长
            if (totalSeconds) {
                durationEl.textContent = totalSeconds + '\u2033';
            }
        };

        el.addEventListener('click', () => {
            if (!audio) {
                audio = new Audio(src);
                audio.addEventListener('ended', stop);
            }

            if (isPlaying) {
                stop();
            } else {
                document.querySelectorAll('.amigo-voice-bubble.is-playing').forEach(other => {
                    if (other !== el) {
                        if (other._voiceTimer) {
                            clearInterval(other._voiceTimer);
                            other._voiceTimer = null;
                        }
                        other.classList.remove('is-playing');
                        if (other._voiceAudio) {
                            other._voiceAudio.pause();
                            other._voiceAudio.currentTime = 0;
                        }
                    }
                });
                audio.play().catch(() => {});
                isPlaying = true;
                el.classList.add('is-playing');
                el._voiceAudio = audio;
                // 启动倒计时更新
                updateCountdown();
                el._voiceTimer = setInterval(updateCountdown, 200);
            }
        });
    });
}

/* ========== 说说页无限滚动 ========== */
function initShuoshuoFeed() {
    var chat = document.querySelector('.shuoshuo-chat');
    if (!chat || chat.dataset.shuoshuoInit) return;
    chat.dataset.shuoshuoInit = '1';

    var total = parseInt(chat.dataset.shuoshuoTotal, 10) || 0;
    var pageSize = parseInt(chat.dataset.shuoshuoPageSize, 10) || 10;
    var msgs = Array.prototype.slice.call(chat.querySelectorAll('.shuoshuo-msg'));
    var shown = Math.min(pageSize, msgs.length);
    var sentinel = chat.querySelector('.shuoshuo-sentinel');

    if (msgs.length <= pageSize || !sentinel) return;

    function reveal() {
        var next = Math.min(shown + pageSize, msgs.length);
        for (var i = shown; i < next; i++) msgs[i].classList.remove('shuoshuo-hidden');
        shown = next;
        if (shown >= msgs.length) {
            var end = document.createElement('div');
            end.className = 'shuoshuo-end';
            end.textContent = '— 到底啦 —';
            chat.replaceChild(end, sentinel);
        }
    }

    var timer = null;
    var observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(reveal, 250);
        }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
}

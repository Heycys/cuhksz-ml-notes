// 全局常量 - 响应式断点
const MOBILE_BREAKPOINT = 760;           // 移动端断点（侧边栏隐藏、目录关闭）
const SIDEBAR_COLLAPSE_BREAKPOINT = 1200; // 侧边栏自动折叠断点

// 侧栏交互功能实现
class SidebarController {
    constructor() {
        // DOM 元素（需要先获取，用于读取 CSS 变量）
        this.appLayout = document.getElementById('appLayout');
        this.sidebarContainer = document.getElementById('sidebarContainer');
        this.sidebarClipper = document.getElementById('sidebarClipper');
        this.resizeHandle = document.getElementById('resizeHandle');
        this.mainContent = document.getElementById('mainContent');
        
        // 从 CSS 变量读取默认宽度
        const rootStyles = getComputedStyle(document.documentElement);
        const defaultWidth = parseInt(rootStyles.getPropertyValue('--sidebar-width')) || 280;
        
        // 状态变量
        this.sidebarWidth = defaultWidth;
        this.isResizing = false;
        this.isCollapsed = false;
        this.isAnimating = false;
        this.inAnimation = false;
        this.isExpanding = false;
        this.inExpansion = false;
        this.isFloating = false;
        this.showSidebar = false;
        
        // 定时器引用
        this.hideTimeout = null;
        this.checkPositionTimeout = null;
        this.hoverTimeout = null; // 识别区域停留定时器
        this.lastPointer = { x: 0, y: 0 };
        
        // 初始化
        this.init();
    }
    
    init() {
        this.updateCSSVariable();
        this.bindEvents();
        this.updateResizeHandleVisibility();
        
        // 初始化全局指针移动监听
        document.addEventListener('pointermove', (e) => {
            this.lastPointer = { x: e.clientX, y: e.clientY };
        }, { passive: true });
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
        
        // 初始化时检查窗口大小
        this.handleWindowResize();
    }
    
    // 处理窗口大小变化
    handleWindowResize() {
        const width = window.innerWidth;
        
        // 更新拖拽把手可见性
        this.updateResizeHandleVisibility();
        
        // 小于侧边栏折叠断点时，自动折叠侧边栏（模拟点击折叠按钮）
        if (width < SIDEBAR_COLLAPSE_BREAKPOINT && !this.isCollapsed) {
            console.log(`窗口宽度 < ${SIDEBAR_COLLAPSE_BREAKPOINT}px，自动折叠侧边栏`);
            this.handleCollapse();
        }
        // 大于等于侧边栏折叠断点时，不自动展开，允许用户手动控制
    }
    
    // 更新CSS变量
    updateCSSVariable() {
        this.appLayout.style.setProperty('--sidebar-width', `${this.sidebarWidth}px`);
    }
    
    // 绑定事件
    bindEvents() {
        // 拖拽调整大小事件
        this.resizeHandle.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });
        
        // 侧栏鼠标进入/离开事件
        this.sidebarClipper.addEventListener('mouseenter', () => {
            this.handleMouseEnter();
        });
        
        this.sidebarClipper.addEventListener('mouseleave', () => {
            this.handleMouseLeave();
        });
        
        // 监听过渡动画结束事件
        this.sidebarClipper.addEventListener('transitionend', () => {
            this.checkMousePosition();
        });
        
        // 监听鼠标离开窗口，清理识别区域的停留定时器
        document.addEventListener('mouseleave', () => {
            this.clearHoverTimeout();
        });
    }
    
    // 清理停留定时器
    clearHoverTimeout() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
    }
    
    // 检查鼠标位置
    checkMousePosition() {
        if (!this.isCollapsed || !this.showSidebar) return;
        
        const rect = this.sidebarClipper.getBoundingClientRect();
        const p = this.lastPointer;
        
        const isInSidebar = p.x >= rect.left && p.x <= rect.right && 
                           p.y >= rect.top && p.y <= rect.bottom;
        
        if (!isInSidebar) {
            if (this.hideTimeout) clearTimeout(this.hideTimeout);
            // 【延迟时间1】动画结束后，鼠标不在侧栏区域，等待多久自动隐藏侧栏
            this.hideTimeout = setTimeout(() => {
                this.setShowSidebar(false);
                this.hideTimeout = null;
            }, 500); // 500ms
        } else {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        }
    }
    
    // 全局鼠标移动处理
    handleGlobalMouseMove(e) {
        if (!this.isCollapsed) return;
        
        const triggerZoneWidth = 20; // 识别区域宽度（从 10px 增加到 20px）
        const isInTriggerZone = e.clientX <= triggerZoneWidth && e.clientX >= 0;
        
        // 如果侧栏当前隐藏，检查是否在识别区域内
        if (!this.showSidebar && !this.isAnimating && !this.isExpanding) {
            if (isInTriggerZone) {
                // 鼠标进入识别区域，启动停留定时器
                if (!this.hoverTimeout) {
                    // 【延迟时间2】鼠标在识别区域（左侧20px）停留多久后显示侧栏
                    this.hoverTimeout = setTimeout(() => {
                        // 停留超过设定时间，显示侧栏
            this.setShowSidebar(true);
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
                        }
                        this.hoverTimeout = null;
                    }, 300); // 300ms (0.3秒)
                }
            } else {
                // 鼠标离开识别区域，取消停留定时器
                this.clearHoverTimeout();
            }
            return;
        }
        
        // 如果侧栏当前显示，检查鼠标是否真的在侧栏区域内
        if (this.showSidebar) {
            const rect = this.sidebarClipper.getBoundingClientRect();
            const isInSidebar = e.clientX >= rect.left && e.clientX <= rect.right && 
                               e.clientY >= rect.top && e.clientY <= rect.bottom;
            
            if (!isInSidebar && !this.hideTimeout) {
                // 鼠标不在侧栏区域内，启动自动隐藏定时器
                // 【延迟时间3】鼠标离开侧栏后，等待多久自动隐藏
                this.hideTimeout = setTimeout(() => {
                    this.setShowSidebar(false);
                    this.hideTimeout = null;
                }, 200); // 200ms (0.2秒)
            } else if (isInSidebar && this.hideTimeout) {
                // 鼠标回到侧栏区域内，取消自动隐藏定时器
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        }
    }
    
    // 折叠/展开处理
    handleCollapse() {
        // 清除可能存在的自动隐藏定时器
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        if (this.isCollapsed) {
            // 展开：立刻通知右侧编辑区移动，然后开始展开动画
            this.setCollapsedState(false);
            this.setExpandingState(true);
            this.setFloatingState(false);
            this.setShowSidebar(true);
            
            // 【延迟时间4】展开动画启动延迟（让CSS样式先生效）
            setTimeout(() => {
                this.setInExpansion(true);
            }, 10); // 10ms
            
            // 【延迟时间5】展开动画总时长（需与CSS的transition时间一致）
            setTimeout(() => {
                this.setCollapsedState(false);
                this.setExpandingState(false);
                this.setInExpansion(false);
                this.setShowSidebar(false);
                this.setAnimatingState(false);
                
                // 通知页面菜单控制器更新图标
                this.notifyCollapseStateChange();
            }, 200); // 200ms (0.2秒)
        } else {
            // 防止重复点击
            if (this.isAnimating || this.isExpanding) {
                return;
            }
            
            // 折叠：立即设置折叠状态，然后开始动画
            this.setCollapsedState(true);
            this.setAnimatingState(true);
            this.setShowSidebar(true);
            
            // 【延迟时间6】折叠动画启动延迟（让CSS样式先生效）
            setTimeout(() => {
                this.setInAnimation(true);
            }, 10); // 10ms
            
            // 【延迟时间7】折叠动画总时长（需与CSS的transition时间一致）
            setTimeout(() => {
                this.setFloatingState(true);
                this.setAnimatingState(false);
                this.setInAnimation(false);
                
                // 等一帧、等布局稳定后再判定一次
                requestAnimationFrame(() => {
                    this.checkMousePosition();
                });
                
                // 通知页面菜单控制器更新图标
                this.notifyCollapseStateChange();
            }, 200); // 200ms (0.2秒)
        }
    }
    
    // 通知其他控制器侧边栏状态变化
    notifyCollapseStateChange() {
        if (window.pageMenuController) {
            window.pageMenuController.updateCollapseIcon();
        }
    }
    
    // 鼠标进入侧栏
    handleMouseEnter() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
    
    // 鼠标离开侧栏
    handleMouseLeave() {
        if (this.isCollapsed && this.showSidebar && !this.isAnimating && !this.isExpanding) {
            // 清除之前的定时器
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
            }
            
            // 【延迟时间3-B】鼠标离开侧栏触发的隐藏延迟（与延迟时间3保持一致）
            // 注意：这里会先于 handleGlobalMouseMove 触发
            this.hideTimeout = setTimeout(() => {
                this.setShowSidebar(false);
                this.hideTimeout = null;
            }, 200); // 200ms (0.2秒) - 已同步更新
        }
    }
    
    // 拖拽开始处理
    handleMouseDown(e) {
        if (this.isCollapsed) return; // 折叠状态下不允许调整大小
        
        e.preventDefault();
        this.setResizingState(true);
        
        const handleMouseMoveResize = (e) => {
            const newWidth = e.clientX;
            const minWidth = 200;
            const maxWidth = window.innerWidth * 0.6;
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            this.setSidebarWidth(clampedWidth);
        };
        
        const handleMouseUp = () => {
            this.setResizingState(false);
            document.removeEventListener('mousemove', handleMouseMoveResize);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', handleMouseMoveResize);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    // 状态设置方法
    setCollapsedState(collapsed) {
        this.isCollapsed = collapsed;
        this.updateCollapsedClasses();
        this.updateCollapseButton();
        this.updateResizeHandleVisibility();
        
        // 更新主内容区的布局
        if (collapsed) {
            this.appLayout.classList.add('sidebar-collapsed');
            // 折叠状态下启动全局鼠标移动监听
            document.addEventListener('mousemove', this.globalMouseMoveHandler);
        } else {
            this.appLayout.classList.remove('sidebar-collapsed');
            // 展开状态下移除全局鼠标移动监听
            document.removeEventListener('mousemove', this.globalMouseMoveHandler);
        }
    }
    
    setAnimatingState(animating) {
        this.isAnimating = animating;
        this.updateAnimatingClasses();
        this.updateResizeHandleVisibility();
        
        if (animating) {
            this.appLayout.classList.add('sidebar-animating');
        } else {
            this.appLayout.classList.remove('sidebar-animating');
        }
    }
    
    setExpandingState(expanding) {
        this.isExpanding = expanding;
        this.updateExpandingClasses();
        this.updateResizeHandleVisibility();
    }
    
    setInAnimation(inAnimation) {
        this.inAnimation = inAnimation;
        this.updateAnimatingClasses();
    }
    
    setInExpansion(inExpansion) {
        this.inExpansion = inExpansion;
        this.updateExpandingClasses();
    }
    
    setFloatingState(floating) {
        this.isFloating = floating;
        this.updateClipperClasses();
    }
    
    setShowSidebar(show) {
        this.showSidebar = show;
        this.updateClipperClasses();
    }
    
    setResizingState(resizing) {
        this.isResizing = resizing;
        this.updateResizingClasses();
    }
    
    setSidebarWidth(width) {
        this.sidebarWidth = width;
        this.updateCSSVariable();
        
        // 更新拖拽把手位置
        this.resizeHandle.style.left = `${width}px`;
    }
    
    // 更新拖拽把手的可见性
    updateResizeHandleVisibility() {
        // 只在侧边栏完全展开（非折叠、非动画、非展开过程中）时显示拖拽把手
        if (!this.isCollapsed && !this.isAnimating && !this.isExpanding) {
            this.resizeHandle.style.display = 'block';
            this.resizeHandle.style.left = `${this.sidebarWidth}px`;
        } else {
            this.resizeHandle.style.display = 'none';
        }
    }
    
    // 类名更新方法
    updateCollapsedClasses() {
        if (this.isCollapsed) {
            this.sidebarContainer.classList.add('collapsed');
        } else {
            this.sidebarContainer.classList.remove('collapsed');
        }
    }
    
    updateAnimatingClasses() {
        if (this.isAnimating) {
            this.sidebarContainer.classList.add('animating');
        } else {
            this.sidebarContainer.classList.remove('animating');
        }
        
        if (this.inAnimation) {
            this.sidebarContainer.classList.add('in-animation');
        } else {
            this.sidebarContainer.classList.remove('in-animation');
        }
    }
    
    updateExpandingClasses() {
        if (this.isExpanding) {
            this.sidebarContainer.classList.add('expanding');
        } else {
            this.sidebarContainer.classList.remove('expanding');
        }
        
        if (this.inExpansion) {
            this.sidebarContainer.classList.add('in-expansion');
        } else {
            this.sidebarContainer.classList.remove('in-expansion');
        }
    }
    
    updateResizingClasses() {
        if (this.isResizing) {
            this.sidebarContainer.classList.add('resizing');
            this.resizeHandle.classList.add('resizing');
        } else {
            this.sidebarContainer.classList.remove('resizing');
            this.resizeHandle.classList.remove('resizing');
        }
    }
    
    updateClipperClasses() {
        // 清除所有状态类
        this.sidebarClipper.classList.remove('floating', 'collapsed', 'visible', 'peek');
        
        // 添加当前状态类
        const classes = [];
        
        if (this.isFloating) {
            classes.push('floating');
        }
        
        if (this.isCollapsed) {
            if (this.showSidebar) {
                classes.push('visible');
            } else {
                classes.push('collapsed');
            }
        }
        
        classes.forEach(cls => this.sidebarClipper.classList.add(cls));
    }
    
    updateCollapseButton() {
        // 折叠按钮已移除，不需要更新
        // 图标状态由 PageMenuController 负责更新
    }
    
    // 初始化全局鼠标移动处理器（需要绑定this）
    globalMouseMoveHandler = (e) => {
        this.handleGlobalMouseMove(e);
    }
    
    // 清理方法
    destroy() {
        // 清理定时器
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        if (this.checkPositionTimeout) {
            clearTimeout(this.checkPositionTimeout);
        }
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
        }
        
        // 移除事件监听
        document.removeEventListener('mousemove', this.globalMouseMoveHandler);
    }
}

// 笔记加载器类 (最终修正版)
class NotebookLoader {
    constructor(tocController) {
        // 从HTML中读取笔记配置
        this.notebooks = window.NOTEBOOK_CONFIG || [];
        
        this.currentNotebook = null;
        this.contentContainer = document.querySelector('#mainContent .content-wrapper');
        
        // 面包屑元素
        this.breadcrumbIcon = document.getElementById('breadcrumbIcon');
        this.breadcrumbTitle = document.getElementById('breadcrumbTitle');
        
        // 缓存图标，用于面包屑显示
        this.notebookIcons = new Map();
        
        // 目录控制器
        this.tocController = tocController;
        
        // 初始化图片查看器
        this.initImageViewer();
        
        // 初始化
        this.init();
    }
    
    async init() {
        await this.generateNavigationItems();
        this.bindNavigationEvents();
        
        // 初始化浏览器后退/前进按钮支持
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.notebook) {
                const notebook = this.notebooks.find(nb => nb.name === event.state.notebook);
                if (notebook) {
                    this.updateBreadcrumb(notebook.name);
                    this.loadNotebook(notebook.name, notebook.path, false);
                    
                    // 更新侧边栏激活状态
                    document.querySelectorAll('.page-title.active').forEach(item => {
                        item.classList.remove('active');
                    });
                    const pageTitle = document.querySelector(`[data-notebook="${notebook.name}"]`);
                    if (pageTitle) {
                        pageTitle.classList.add('active');
                    }
                }
            }
        });
        
        // 根据URL加载笔记，如果URL为空则加载默认内容
        this.loadFromURL();
    }
    
    // 动态生成导航列表
    async generateNavigationItems() {
        const pageTree = document.querySelector('.page-tree');
        if (!pageTree) return;
        
        // 清空现有内容
        pageTree.innerHTML = '';
        
        // 生成所有导航项（包括首页）
        for (const notebook of this.notebooks) {
            let displayIcon = notebook.icon;
            
            // 如果图标设置为auto，自动获取HTML中的shortcut icon
            if (notebook.icon === 'auto') {
                displayIcon = await this.getAutoIcon(notebook.path);
            }
            // 如果是 Font Awesome 图标名称
            else if (this.isFontAwesomeIcon(notebook.icon)) {
                displayIcon = this.createFontAwesomeIcon(notebook.icon, notebook.color);
            }
            
            // 缓存图标，用于面包屑显示
            this.notebookIcons.set(notebook.name, displayIcon);
            
            const pageItem = document.createElement('div');
            pageItem.className = 'page-item';
            
            // 包装图标到统一容器
            let iconHTML;
            if (displayIcon.includes('<')) {
                // HTML图标（SVG、Font Awesome等）直接使用
                iconHTML = displayIcon;
            } else {
                // Emoji或文本图标，包装到容器中
                iconHTML = `<span class="icon-container">${displayIcon}</span>`;
            }
            
            pageItem.innerHTML = `
                <div class="page-title" data-notebook="${notebook.name}" data-path="${notebook.path}">
                    <span class="page-name">${iconHTML}${notebook.name}</span>
                </div>
            `;
            pageTree.appendChild(pageItem);
        }
    }
    
    // 判断是否是有效的 Font Awesome 图标名称
    isFontAwesomeIcon(icon) {
        if (typeof icon !== 'string' || icon === 'auto') return false;
        // Font Awesome 图标名称只包含小写字母、数字和连字符
        return /^[a-z0-9\-]+$/.test(icon);
    }
    
    // 创建 Font Awesome 图标
    createFontAwesomeIcon(iconName, color) {
        const colorStyle = color ? ` style="color: ${color};"` : '';
        return `<span class="icon-container"><i class="fa-solid fa-${iconName}"${colorStyle}></i></span>`;
    }
    
    // 绑定导航点击事件
    bindNavigationEvents() {
        const pageTree = document.querySelector('.page-tree');
        if (!pageTree) return;
        
        pageTree.addEventListener('click', async (e) => {
            const pageTitle = e.target.closest('.page-title');
            if (!pageTitle) return;
            
            // 移除所有活跃状态
            document.querySelectorAll('.page-title.active').forEach(item => {
                item.classList.remove('active');
            });
            
            // 设置当前项为活跃状态
            pageTitle.classList.add('active');
            
            const notebookName = pageTitle.dataset.notebook;
            const notebookPath = pageTitle.dataset.path;
            
            // 立即更新面包屑（从缓存中获取图标信息）
            this.updateBreadcrumb(notebookName);
            
            // 然后加载内容
            await this.loadNotebook(notebookName, notebookPath);
        });
    }
    
    // 加载内容（包括首页和笔记）
    async loadNotebook(notebookName, notebookPath, updateURL = true) {
        try {
            // 显示加载状态
            this.showLoadingState();
            console.log(`正在加载内容: ${notebookName}`);
            
            // 使用fetch加载HTML文件
            const response = await fetch(notebookPath);
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            console.log('HTML内容加载成功');
            
            // 解析HTML内容
            const processedContent = this.parseAndProcessHTML(htmlContent, notebookName);
            
            // 先更新当前笔记名称（在插入内容之前）
            this.currentNotebook = notebookName;
            
            // 将内容插入到主内容区
            this.insertContent(processedContent);
            
            // 更新编辑信息
            this.updateNotebookInfo(notebookName);
            
            // 更新URL（如果需要）
            if (updateURL) {
                this.updateURL(notebookName);
            }
            
            console.log(`内容 ${notebookName} 加载完成`);
        } catch (error) {
            console.error('加载内容失败:', error);
            this.showErrorState(error.message);
        }
    }
    
    // 更新浏览器URL
    updateURL(notebookName) {
        const newURL = `?page=${encodeURIComponent(notebookName)}`;
        const currentSearch = window.location.search;
        
        // 只有参数不同时才更新
        if (currentSearch !== newURL) {
            window.history.pushState({ notebook: notebookName }, '', newURL);
            console.log('URL已更新:', newURL);
        }
    }
    
    // 从URL加载笔记
    loadFromURL() {
        // 从URL参数中获取笔记名
        const urlParams = new URLSearchParams(window.location.search);
        const notebookName = urlParams.get('page');
        
        // 如果没有page参数，加载默认笔记
        if (!notebookName) {
            this.loadDefaultContent();
            return;
        }
        
        // 查找对应的笔记配置
        const notebook = this.notebooks.find(nb => nb.name === notebookName);
        
        if (notebook) {
            console.log('从URL加载笔记:', notebookName);
            
            // 立即更新面包屑
            this.updateBreadcrumb(notebook.name);
            
            // 加载笔记（不更新URL，避免重复）
            this.loadNotebook(notebook.name, notebook.path, false);
            
            // 设置侧边栏激活状态
            setTimeout(() => {
                const pageTitle = document.querySelector(`[data-notebook="${notebook.name}"]`);
                if (pageTitle) {
                    document.querySelectorAll('.page-title.active').forEach(item => {
                        item.classList.remove('active');
                    });
                    pageTitle.classList.add('active');
                }
            }, 100);
        } else {
            console.warn('URL中的笔记未找到:', notebookName, '加载默认内容');
            this.loadDefaultContent();
        }
    }
    
    // 更新笔记信息（编辑者和编辑时间）
    updateNotebookInfo(notebookName) {
        // 从配置中查找当前笔记的信息
        const notebook = this.notebooks.find(nb => nb.name === notebookName);
        
        if (notebook && window.moreMenuController) {
            const author = notebook.author || '未知';
            const editTime = notebook.lastEditTime || '未知时间';
            
            window.moreMenuController.updateEditInfo(author, editTime);
            console.log('编辑信息已更新:', author, editTime);
        }
    }
    
    // 解析和处理HTML内容
    parseAndProcessHTML(htmlContent, notebookName) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // 提取笔记的 <body> 元素
        const noteBody = doc.querySelector('body');
        if (!noteBody) {
            throw new Error('无法在笔记文件中找到 <body> 标签');
        }
        
        // 修正 <body> 内部所有元素的资源路径
        this.fixResourcePaths(noteBody, notebookName);
        
        // 返回 body 的完整 innerHTML
        return noteBody.innerHTML;
    }
    
    // 修正资源路径
    fixResourcePaths(element, notebookName) {
        // 修正图片路径
        const images = element.querySelectorAll('img');
        images.forEach(img => {
            const originalSrc = img.getAttribute('src');
            if (originalSrc && originalSrc.startsWith('media/')) {
                const newSrc = `pages/${notebookName}/${originalSrc}`;
                img.setAttribute('src', newSrc);
                console.log(`图片路径修正: ${originalSrc} -> ${newSrc}`);
            }
        });
        
        // 修正其他可能的媒体资源
        const mediaElements = element.querySelectorAll('[src], [href]');
        mediaElements.forEach(el => {
            ['src', 'href'].forEach(attr => {
                const originalPath = el.getAttribute(attr);
                if (originalPath && originalPath.startsWith('media/')) {
                    const newPath = `pages/${notebookName}/${originalPath}`;
                    el.setAttribute(attr, newPath);
                    console.log(`${attr}路径修正: ${originalPath} -> ${newPath}`);
                }
            });
        });
        
        // 修正CSS背景图片路径
        const elementsWithBgImage = element.querySelectorAll('*');
        elementsWithBgImage.forEach(el => {
            const style = el.getAttribute('style');
            if (style && style.includes('media/')) {
                const newStyle = style.replace(/media\//g, `pages/${notebookName}/media/`);
                el.setAttribute('style', newStyle);
                console.log(`背景图片路径修正: ${style} -> ${newStyle}`);
            }
        });
    }
    
    // 将处理后的内容插入主内容区
    insertContent(content) {
        if (!this.contentContainer) return;
        this.contentContainer.innerHTML = content;

        // 为新加载的图片添加点击事件
        this.bindImageClickEvents();

        // 更新笔记中的图标（如果配置了 Font Awesome 图标）
        this.updateNoteIcon();

        // 更新浏览器标签页图标
        this.updateFavicon();

        // 生成目录
        if (this.tocController) {
            this.tocController.generateTOC(this.contentContainer);
        }

        // 统计字数并更新显示
        this.updateWordCount();

        // 滚动到顶部
        const contentWithToc = document.querySelector('.content-with-toc');
        if (contentWithToc) {
            contentWithToc.scrollTop = 0;
        }
    }
    
    // 更新浏览器标签页图标
    updateFavicon() {
        if (!this.currentNotebook) return;
        
        // 获取当前笔记的图标
        const displayIcon = this.notebookIcons.get(this.currentNotebook);
        if (!displayIcon) return;
        
        // 查找或创建 favicon link 元素
        let faviconLink = document.querySelector('link[rel="icon"]');
        if (!faviconLink) {
            faviconLink = document.createElement('link');
            faviconLink.rel = 'icon';
            document.head.appendChild(faviconLink);
        }
        
        console.log('更新Favicon - 当前笔记:', this.currentNotebook);
        console.log('图标内容:', displayIcon);
        
        // 根据图标类型设置 favicon（优先级：FA > SVG > img > emoji）
        if (displayIcon.includes('<i class="fa-solid')) {
            // Font Awesome 图标：渲染到 canvas
            console.log('检测到Font Awesome图标');
            this.setFaviconFromFontAwesome(faviconLink, displayIcon);
        } else if (displayIcon.includes('<svg')) {
            // SVG 图标：提取并转换为 data URI
            console.log('检测到SVG图标');
            this.setFaviconFromSVG(faviconLink, displayIcon);
        } else if (displayIcon.includes('<img')) {
            // img 标签：提取 src
            console.log('检测到img图标');
            const srcMatch = displayIcon.match(/src="([^"]+)"/);
            if (srcMatch) {
                faviconLink.href = srcMatch[1];
            }
        } else {
            // Emoji 或纯文本：转换为 data URI
            console.log('检测到Emoji/文本图标:', displayIcon);
            this.setFaviconFromEmoji(faviconLink, displayIcon);
        }
        
        console.log('Favicon已更新:', this.currentNotebook);
    }
    
    // 从 SVG 设置 favicon
    setFaviconFromSVG(faviconLink, svgString) {
        // 提取 SVG 内容
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'text/html');
        const svgElement = doc.querySelector('svg');
        
        if (svgElement) {
            // 将 SVG 转换为 data URI
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
            faviconLink.href = `data:image/svg+xml;base64,${svgBase64}`;
        }
    }
    
    // 从 Emoji 设置 favicon
    setFaviconFromEmoji(faviconLink, emoji) {
        // 创建一个 canvas 来绘制 emoji
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // 绘制 emoji
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 32, 32);
        
        // 转换为 data URI
        faviconLink.href = canvas.toDataURL('image/png');
    }
    
    // 从 Font Awesome 图标设置 favicon
    setFaviconFromFontAwesome(faviconLink, iconHTML) {
        // 专门匹配 <i> 标签的类名（而不是外层 span）
        const iTagMatch = iconHTML.match(/<i\s+class="([^"]+)"/);
        const colorMatch = iconHTML.match(/color:\s*([^;"]+)/);
        
        if (!iTagMatch) {
            console.error('无法提取Font Awesome图标类名');
            return;
        }
        
        const iconClass = iTagMatch[1];
        const color = colorMatch ? colorMatch[1] : '#000000';
        
        console.log('提取的图标类名:', iconClass);
        console.log('提取的颜色:', color);
        
        // 创建临时元素来渲染图标
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.innerHTML = `<i class="${iconClass}" style="font-size: 48px; color: ${color};"></i>`;
        document.body.appendChild(tempDiv);
        
        // 等待字体加载
        setTimeout(() => {
            const iconElement = tempDiv.querySelector('i');
            
            // 获取图标的 Unicode 字符
            const computedStyle = window.getComputedStyle(iconElement, '::before');
            const content = computedStyle.getPropertyValue('content');
            
            console.log('Font Awesome content值:', content);
            
            if (content && content !== 'none' && content !== '""') {
                // 创建 canvas
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                
                // 设置字体和样式
                ctx.font = '900 48px "Font Awesome 6 Free"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = color;
                
                // 移除引号并绘制
                const iconChar = content.replace(/["']/g, '');
                console.log('绘制的字符:', iconChar, '字符码:', iconChar.charCodeAt(0));
                ctx.fillText(iconChar, 32, 32);
                
                // 转换为 data URI
                const dataURL = canvas.toDataURL('image/png');
                faviconLink.href = dataURL;
                console.log('Canvas已生成favicon');
            } else {
                console.warn('Font Awesome图标content为空，使用默认图标');
                this.setFaviconFromEmoji(faviconLink, '📄');
            }
            
            // 清理临时元素
            document.body.removeChild(tempDiv);
        }, 200); // 增加到200ms，确保字体加载
    }
    
    // 更新笔记中的图标
    updateNoteIcon() {
        if (!this.currentNotebook) return;
        
        // 查找当前笔记的配置
        const notebook = this.notebooks.find(nb => nb.name === this.currentNotebook);
        if (!notebook) return;
        
        // 只处理 Font Awesome 图标
        if (this.isFontAwesomeIcon(notebook.icon)) {
            // 查找笔记中的图标元素
            const iconElement = this.contentContainer.querySelector('.icon');
            if (iconElement) {
                // 创建 Font Awesome 图标
                const faIcon = document.createElement('i');
                faIcon.className = `fa-solid fa-${notebook.icon}`;
                faIcon.style.fontSize = '66px'; // 匹配 wolai.css 中的图标大小
                if (notebook.color) {
                    faIcon.style.color = notebook.color;
                }
                
                // 清空原有内容并插入新图标
                iconElement.innerHTML = '';
                iconElement.appendChild(faIcon);
                
                console.log(`已更新笔记图标: ${notebook.icon}`);
            }
        }
    }
    
    // 统计字数
    updateWordCount() {
        if (!this.contentContainer) return;
        
        // 获取纯文本内容
        const textContent = this.contentContainer.innerText || this.contentContainer.textContent || '';
        
        // 统计中文字符、英文单词和数字
        // 移除多余的空白字符
        const cleanText = textContent.replace(/\s+/g, ' ').trim();
        
        // 统计中文字符（包括中文标点）
        const chineseChars = cleanText.match(/[\u4e00-\u9fa5]/g) || [];
        
        // 统计英文单词和数字（连续的字母或数字算一个单词）
        const westernWords = cleanText.match(/[a-zA-Z0-9]+/g) || [];
        
        // 总字数 = 中文字符数 + 英文单词数
        const totalCount = chineseChars.length + westernWords.length;
        
        // 更新菜单中的字数显示
        if (window.moreMenuController) {
            window.moreMenuController.updateWordCount(totalCount);
        }
        
        console.log('字数统计:', totalCount, '(中文:', chineseChars.length, '+ 英文单词:', westernWords.length, ')');
    }
    
    // 显示加载状态
    showLoadingState() {
        if (!this.contentContainer) return;
        
        this.contentContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px);">
                <div style="text-align: center; color: #5F5E5B;">
                <div style="font-size: 48px; margin-bottom: 20px;">📖</div>
                <h2 style="color: #32302C; margin-bottom: 10px;">正在加载内容...</h2>
                <p>请稍等片刻</p>
                </div>
            </div>
        `;
    }
    
    // 显示错误状态
    showErrorState(message) {
        if (!this.contentContainer) return;
        
        this.contentContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px);">
                <div style="text-align: center; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h2 style="color: #dc3545; margin-bottom: 10px;">加载失败</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 20px; 
                    padding: 10px 20px; 
                    background: #32302C; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    cursor: pointer;
                ">重新加载页面</button>
                </div>
            </div>
        `;
    }
    
    // 加载默认内容（配置中的第一个项目）
    async loadDefaultContent() {
        // 加载第一个笔记作为默认内容
        if (this.notebooks.length > 0) {
            const defaultNotebook = this.notebooks[0];
            
            // 立即更新面包屑
            this.updateBreadcrumb(defaultNotebook.name);
            
            await this.loadNotebook(defaultNotebook.name, defaultNotebook.path);
            
            // 设置第一个项目为活跃状态
            const defaultTitle = document.querySelector(`[data-notebook="${defaultNotebook.name}"]`);
            if (defaultTitle) {
                defaultTitle.classList.add('active');
            }
        }
    }
    
    // 获取当前加载的笔记
    getCurrentNotebook() {
        return this.currentNotebook;
    }
    
    // 更新面包屑导航
    updateBreadcrumb(notebookName) {
        if (!this.breadcrumbIcon || !this.breadcrumbTitle) return;
        
        const displayIcon = this.notebookIcons.get(notebookName) || '📄';
        
        // 更新标题
        this.breadcrumbTitle.textContent = notebookName;
        
        // 更新图标
        if (displayIcon.includes('<')) {
            // HTML图标（SVG或img）
            this.breadcrumbIcon.innerHTML = displayIcon;
        } else {
            // emoji或文本图标
            this.breadcrumbIcon.textContent = displayIcon;
        }
        
        console.log('面包屑已更新:', notebookName);
    }
    
    // 自动获取HTML文件中的shortcut icon作为图标
    async getAutoIcon(notebookPath) {
        try {
            // 获取笔记名称，用于路径修正
            const notebookName = notebookPath.split('/')[1]; // 从 pages/笔记名/文件.html 中提取笔记名
            
            const response = await fetch(notebookPath);
            if (!response.ok) {
                console.warn('无法获取HTML文件:', notebookPath);
                return '📄'; // 默认图标
            }
            
            const htmlContent = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // 查找shortcut icon链接
            const iconLink = doc.querySelector('link[rel="shortcut icon"]');
            if (iconLink && iconLink.href) {
                let iconPath = iconLink.getAttribute('href');
                
                // 修正路径：将相对路径转换为相对于主页面的路径
                if (iconPath.startsWith('media/')) {
                    iconPath = `pages/${notebookName}/${iconPath}`;
                }
                
                // 如果是SVG文件，尝试内联显示
                if (iconPath.endsWith('.svg')) {
                    try {
                        const svgResponse = await fetch(iconPath);
                        if (svgResponse.ok) {
                            const svgContent = await svgResponse.text();
                            // 返回内联SVG，设置合适的大小和对齐方式
                            const svgWithSize = svgContent.replace(
                                '<svg',
                                '<svg width="18" height="18" style="display: block;"'
                            );
                            return svgWithSize;
                        }
                    } catch (svgError) {
                        console.warn('无法获取SVG内容:', iconPath, svgError);
                    }
                    
                    // 如果内联失败，使用img标签
                    return `<img src="${iconPath}" width="18" height="18" style="display: block;" alt="图标">`;
                } else {
                    // 非SVG文件使用img标签
                    return `<img src="${iconPath}" width="18" height="18" style="display: block;" alt="图标">`;
                }
            }
            
            console.warn('未找到shortcut icon:', notebookPath);
            return '📄'; // 默认图标
            
        } catch (error) {
            console.error('获取auto图标失败:', notebookPath, error);
            return '📄'; // 默认图标
        }
    }
    
    // 初始化图片查看器
    initImageViewer() {
        this.imageViewerModal = document.getElementById('imageViewerModal');
        this.imageViewerContainer = document.getElementById('imageViewerContainer');
        this.imageViewerImg = document.getElementById('imageViewerImg');
        
        // 缩放相关
        this.currentScale = 1;
        this.minScale = 0.1;
        this.maxScale = 5;
        
        // 触摸缩放相关
        this.initialDistance = 0;
        this.initialScale = 1;
        
        // 点击背景关闭
        this.imageViewerModal.addEventListener('click', (e) => {
            if (e.target === this.imageViewerModal || e.target === this.imageViewerContainer) {
                this.hideImageViewer();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.imageViewerModal.classList.contains('show')) {
                this.hideImageViewer();
            }
        });
        
        // 滚轮缩放 - 绑定到整个模态窗口（桌面端）
        this.imageViewerModal.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleImageZoom(e);
        });
        
        // 触摸缩放 - 移动端双指缩放
        this.imageViewerModal.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                this.handleTouchStart(e);
            }
        });
        
        this.imageViewerModal.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                this.handleTouchMove(e);
            }
        });
        
        this.imageViewerModal.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                this.handleTouchEnd();
            }
        });
    }
    
    // 为图片绑定点击事件
    bindImageClickEvents() {
        if (!this.contentContainer) return;
        
        const images = this.contentContainer.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('click', (e) => {
                e.preventDefault();
                this.showImageViewer(img.src, img.alt || '图片');
            });
        });
    }
    
    // 显示图片查看器
    showImageViewer(imageSrc, imageAlt) {
        if (!this.imageViewerModal || !this.imageViewerImg) return;
        
        // 重置缩放，确保变换原点固定在中心
        this.currentScale = 1;
        this.imageViewerImg.style.transform = 'scale(1)';
        
        this.imageViewerImg.src = imageSrc;
        this.imageViewerImg.alt = imageAlt;
        
        // 等待图片加载完成后再显示，确保以原始尺寸显示
        this.imageViewerImg.onload = () => {
            this.imageViewerModal.classList.add('show');
            // 防止页面滚动
            document.body.style.overflow = 'hidden';
            console.log('显示图片查看器:', imageSrc, '原始尺寸:', this.imageViewerImg.naturalWidth + 'x' + this.imageViewerImg.naturalHeight);
        };
    }
    
    // 隐藏图片查看器
    hideImageViewer() {
        if (!this.imageViewerModal) return;
        
        this.imageViewerModal.classList.remove('show');
        
        // 恢复页面滚动
        document.body.style.overflow = '';
        
        // 重置缩放
        this.currentScale = 1;
        
        // 清空图片源以释放内存
        setTimeout(() => {
            if (this.imageViewerImg) {
                this.imageViewerImg.src = '';
                this.imageViewerImg.style.transform = 'scale(1)';
            }
        }, 300);
        
        console.log('隐藏图片查看器');
    }
    
    // 处理图片缩放（滚轮）
    handleImageZoom(e) {
        const zoomSpeed = 0.1;
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        
        this.currentScale = Math.max(this.minScale, Math.min(this.maxScale, this.currentScale + delta));
        
        // 固定在中心位置缩放
        this.imageViewerImg.style.transform = `scale(${this.currentScale})`;
        
        console.log('图片缩放:', this.currentScale);
    }
    
    // 计算两指之间的距离
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 处理触摸开始
    handleTouchStart(e) {
        if (e.touches.length === 2) {
            this.initialDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
            this.initialScale = this.currentScale;
            console.log('双指缩放开始 - 初始距离:', this.initialDistance, '初始缩放:', this.initialScale);
        }
    }
    
    // 处理触摸移动
    handleTouchMove(e) {
        if (e.touches.length === 2 && this.initialDistance > 0) {
            const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
            const scale = (currentDistance / this.initialDistance) * this.initialScale;
            
            // 限制缩放范围
            this.currentScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
            
            // 应用缩放
            this.imageViewerImg.style.transform = `scale(${this.currentScale})`;
        }
    }
    
    // 处理触摸结束
    handleTouchEnd() {
        this.initialDistance = 0;
        console.log('双指缩放结束 - 最终缩放:', this.currentScale);
    }
    
    // 清理资源
    destroy() {
        // 清理事件监听器等
        if (this.imageViewerModal) {
            this.imageViewerModal.remove();
        }
        console.log('NotebookLoader已清理');
    }
}

// 目录控制器类
class TOCController {
    constructor() {
        this.tocSidebar = document.getElementById('tocSidebar');
        this.tocBody = document.getElementById('tocBody');
        this.contentWithToc = document.querySelector('.content-with-toc');
        this.mobileTocButton = document.getElementById('mobileTocButton');
        this.isVisible = true; // 默认显示目录
        this.lastWidth = undefined; // 记录上次宽度，用于判断移动端/桌面端切换
        
        this.init();
    }
    
    init() {
        // 根据窗口大小决定是否显示目录
        const width = window.innerWidth;
        if (width < MOBILE_BREAKPOINT) {
            // 移动端：关闭目录，显示悬浮按钮
            this.isVisible = false;
            this.hide();
            if (this.contentWithToc) {
                this.contentWithToc.classList.remove('toc-visible');
            }
            // 确保悬浮按钮显示（移除hidden类）
            if (this.mobileTocButton) {
                this.mobileTocButton.classList.remove('hidden');
            }
            // 菜单开关默认开启（表示悬浮按钮是显示的）
            setTimeout(() => {
                this.updateMenuSwitch(true);
            }, 100);
        } else {
            // 桌面端默认显示目录
            this.show();
            setTimeout(() => {
                this.updateMenuSwitch(true);
            }, 100);
        }
        
        // 绑定移动端悬浮按钮事件
        this.bindMobileButton();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }
    
    // 绑定移动端悬浮按钮事件
    bindMobileButton() {
        if (this.mobileTocButton) {
            this.mobileTocButton.addEventListener('click', () => {
                // 悬浮按钮点击：切换目录的显示/隐藏（不是切换按钮自己）
                this.toggleTOC();
            });
        }
        
        // 点击目录外部区域关闭目录（仅移动端）
        document.addEventListener('click', (e) => {
            const width = window.innerWidth;
            if (width < MOBILE_BREAKPOINT && this.isVisible) {
                // 检查点击是否在目录外部
                if (this.tocSidebar && 
                    !this.tocSidebar.contains(e.target) && 
                    !this.mobileTocButton.contains(e.target)) {
                    this.hide();
                }
            }
        });
    }
    
    // 切换目录显示/隐藏（不影响悬浮按钮）
    toggleTOC() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    // 处理窗口大小变化
    handleWindowResize() {
        const width = window.innerWidth;
        const wasMobile = this.lastWidth !== undefined && this.lastWidth < MOBILE_BREAKPOINT;
        const isMobile = width < MOBILE_BREAKPOINT;
        
        // 从桌面端变成移动端时
        if (!wasMobile && isMobile) {
            console.log(`窗口宽度 < ${MOBILE_BREAKPOINT}px，切换到移动端模式`);
            // 关闭目录
            this.hide();
            
            // 根据菜单开关状态决定是否显示悬浮按钮
            const switchState = this.getMenuSwitchState();
            if (this.mobileTocButton) {
                if (switchState) {
                    // 开关开启，显示悬浮按钮
                    this.mobileTocButton.classList.remove('hidden');
                } else {
                    // 开关关闭，隐藏悬浮按钮
                    this.mobileTocButton.classList.add('hidden');
                }
            }
        }
        // 从移动端变成桌面端时，根据菜单开关状态决定是否显示目录
        else if (wasMobile && !isMobile) {
            console.log(`窗口宽度 >= ${MOBILE_BREAKPOINT}px，切换到桌面端模式`);
            // 检查菜单开关状态
            const switchState = this.getMenuSwitchState();
            if (switchState) {
                // 开关是开启的，显示目录
                this.show();
            } else {
                // 开关是关闭的，保持隐藏
                this.hide();
            }
        }
        
        // 记录当前宽度，用于下次判断
        this.lastWidth = width;
    }
    
    // 获取菜单中目录开关的状态
    getMenuSwitchState() {
        const moreMenu = document.getElementById('moreMenu');
        if (!moreMenu) return true; // 默认开启
        
        const menuItems = moreMenu.querySelectorAll('.menu-item');
        for (const item of menuItems) {
            const label = item.querySelector('.label');
            if (label && label.textContent.trim() === '目录') {
                const switchEl = item.querySelector('.switch-container');
                return switchEl ? switchEl.classList.contains('on') : true;
            }
        }
        return true; // 默认开启
    }
    
    // 更新菜单中的目录开关状态
    updateMenuSwitch(isOn) {
        const moreMenu = document.getElementById('moreMenu');
        if (!moreMenu) return;
        
        const menuItems = moreMenu.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            const label = item.querySelector('.label');
            if (label && label.textContent.trim() === '目录') {
                const switchEl = item.querySelector('.switch-container');
                if (switchEl) {
                    if (isOn) {
                        switchEl.classList.add('on');
                    } else {
                        switchEl.classList.remove('on');
                    }
                }
            }
        });
    }
    
    // 显示目录
    show() {
        if (this.tocSidebar) {
            this.tocSidebar.classList.add('show');
            this.isVisible = true;
        }
        if (this.contentWithToc) {
            this.contentWithToc.classList.add('toc-visible');
        }
    }
    
    // 隐藏目录
    hide() {
        if (this.tocSidebar) {
            this.tocSidebar.classList.remove('show');
            this.isVisible = false;
        }
        if (this.contentWithToc) {
            this.contentWithToc.classList.remove('toc-visible');
        }
    }
    
    // 切换显示/隐藏（菜单开关调用）
    toggle() {
        const width = window.innerWidth;
        
        if (width < MOBILE_BREAKPOINT) {
            // 移动端：菜单开关控制悬浮按钮的显示/隐藏
            if (this.mobileTocButton) {
                if (this.mobileTocButton.classList.contains('hidden')) {
                    this.mobileTocButton.classList.remove('hidden');
                } else {
                    this.mobileTocButton.classList.add('hidden');
                    // 隐藏悬浮按钮的同时，也关闭目录
                    this.hide();
                }
            }
        } else {
            // 桌面端：菜单开关控制目录的显示/隐藏
            if (this.isVisible) {
                this.hide();
            } else {
                this.show();
            }
        }
    }
    
    // 生成目录
    generateTOC(contentContainer) {
        if (!this.tocBody || !contentContainer) return;
        
        // 清空现有目录
        this.tocBody.innerHTML = '';
        
        // 查找所有标题元素（h1-h6）
        const headings = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        if (headings.length === 0) {
            this.tocBody.innerHTML = '<div style="padding: 20px; text-align: center; color: #8E8E8E;">当前页面没有标题</div>';
            return;
        }
        
        // 为每个标题添加ID（如果没有）
        headings.forEach((heading, index) => {
            if (!heading.id) {
                heading.id = `heading-${index}`;
            }
        });
        
        // 构建目录结构
        const tocItems = [];
        let minLevel = 6; // 初始化为最大级别
        
        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.
            const text = heading.textContent.trim();
            const id = heading.id;
            
            // 记录最小级别
            if (level < minLevel) {
                minLevel = level;
            }
            
            tocItems.push({
                level: level,
                text: text,
                id: id,
                element: heading
            });
        });
        
        // 保存标题元素数组，用于滚动高亮
        this.headings = Array.from(headings);
        
        // 生成目录HTML，传入最小级别
        this.renderTOCItems(tocItems, minLevel);
        
        // 绑定目录项点击事件
        this.bindTOCItemEvents();
        
        // 绑定折叠图标点击事件
        this.bindToggleIconEvents();
        
        // 绑定滚动事件，实现自动高亮
        this.bindScrollHighlight();
    }
    
    // 绑定滚动事件，实现自动高亮当前位置
    bindScrollHighlight() {
        const contentWithToc = document.querySelector('.content-with-toc');
        if (!contentWithToc) return;
        
        // 节流函数，避免频繁触发
        let scrollTimeout;
        contentWithToc.addEventListener('scroll', () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            scrollTimeout = setTimeout(() => {
                this.updateActiveHeading();
            }, 50); // 50ms延迟
        });
        
        // 初始化时也执行一次
        setTimeout(() => {
            this.updateActiveHeading();
        }, 100);
    }
    
    // 更新当前激活的标题
    updateActiveHeading() {
        if (!this.headings || this.headings.length === 0) return;
        
        const contentWithToc = document.querySelector('.content-with-toc');
        if (!contentWithToc) return;
        
        const scrollTop = contentWithToc.scrollTop;
        const offset = 200; // 偏移量，提前高亮
        
        // 找到当前可视区域的标题
        let currentHeading = null;
        
        for (let i = this.headings.length - 1; i >= 0; i--) {
            const heading = this.headings[i];
            const headingTop = heading.offsetTop;
            
            if (scrollTop + offset >= headingTop) {
                currentHeading = heading;
                break;
            }
        }
        
        // 如果没有找到，使用第一个标题
        if (!currentHeading && this.headings.length > 0) {
            currentHeading = this.headings[0];
        }
        
        // 移除所有active类
        const allTocItems = this.tocBody.querySelectorAll('.toc-item');
        allTocItems.forEach(item => item.classList.remove('active'));
        
        // 给当前标题对应的目录项添加active类
        if (currentHeading) {
            const targetId = currentHeading.id;
            const activeTocItem = this.tocBody.querySelector(`[data-target-id="${targetId}"]`);
            if (activeTocItem) {
                activeTocItem.classList.add('active');
            }
        }
    }
    
    // 渲染目录项
    renderTOCItems(items, minLevel) {
        const fragment = document.createDocumentFragment();
        
        items.forEach((item, index) => {
            const tocItem = document.createElement('div');
            // 使用相对级别计算缩进
            const relativeLevel = item.level - minLevel + 1;
            tocItem.className = `toc-item h${item.level}`;
            tocItem.dataset.targetId = item.id;
            tocItem.dataset.level = item.level;
            
            // 判断是否有子项
            const hasChildren = this.hasChildItems(items, index);
            
            // 根据相对级别计算缩进
            const indent = (relativeLevel - 1) * 14;
            const paddingLeft = indent + 'px';
            
            // 判断是否是第一级（最小级别）
            const isFirstLevel = relativeLevel === 1;
            const fontWeight = isFirstLevel ? '600' : '400';
            const color = isFirstLevel ? '#1A1A1A' : '#3C4248';
            
            tocItem.innerHTML = `
                <span class="toggle-icon ${hasChildren ? '' : 'no-children'}">
                    <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 12 12" style="width: 12px; height: 12px; display: block; fill: #707070; flex-shrink: 0;"><path d="M6.02734 8.80274C6.27148 8.80274 6.47168 8.71484 6.66211 8.51465L10.2803 4.82324C10.4268 4.67676 10.5 4.49609 10.5 4.28125C10.5 3.85156 10.1484 3.5 9.72363 3.5C9.50879 3.5 9.30859 3.58789 9.15234 3.74902L6.03223 6.9668L2.90722 3.74902C2.74609 3.58789 2.55078 3.5 2.33105 3.5C1.90137 3.5 1.55469 3.85156 1.55469 4.28125C1.55469 4.49609 1.62793 4.67676 1.77441 4.82324L5.39258 8.51465C5.58789 8.71973 5.78808 8.80274 6.02734 8.80274Z"></path></svg>
                </span>
                <span class="toc-text" style="font-weight: ${fontWeight}; color: ${color};">${item.text}</span>
            `;
            
            // 设置动态缩进
            tocItem.style.paddingLeft = paddingLeft;
            
            fragment.appendChild(tocItem);
        });
        
        this.tocBody.appendChild(fragment);
    }
    
    // 判断当前项是否有子项
    hasChildItems(items, currentIndex) {
        if (currentIndex >= items.length - 1) return false;
        
        const currentLevel = items[currentIndex].level;
        const nextLevel = items[currentIndex + 1].level;
        
        return nextLevel > currentLevel;
    }
    
    // 绑定目录项点击事件
    bindTOCItemEvents() {
        const tocItems = this.tocBody.querySelectorAll('.toc-item');
        
        tocItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是折叠图标，不执行滚动
                if (e.target.closest('.toggle-icon')) return;
                
                const targetId = item.dataset.targetId;
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    // 滚动到目标元素
                    const contentWithToc = document.querySelector('.content-with-toc');
                    if (contentWithToc) {
                        const targetTop = targetElement.offsetTop;
                        contentWithToc.scrollTo({
                            top: targetTop - 70, // 留出一些顶部空间
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }
    
    // 绑定折叠图标点击事件
    bindToggleIconEvents() {
        const toggleIcons = this.tocBody.querySelectorAll('.toggle-icon');
        
        toggleIcons.forEach(icon => {
            if (!icon.classList.contains('no-children')) {
                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    icon.classList.toggle('collapsed');
                    
                    const parentItem = icon.closest('.toc-item');
                    const parentLevel = parseInt(parentItem.dataset.level);
                    let nextElement = parentItem.nextElementSibling;
                    
                    // 切换所有子项的显示/隐藏状态
                    while (nextElement && nextElement.classList.contains('toc-item')) {
                        const nextLevel = parseInt(nextElement.dataset.level);
                        if (nextLevel <= parentLevel) break;
                        
                        nextElement.style.display = icon.classList.contains('collapsed') ? 'none' : 'flex';
                        nextElement = nextElement.nextElementSibling;
                    }
                });
            }
        });
    }
}

// 页面菜单控制器类
class PageMenuController {
    constructor(notebookLoader, sidebarController) {
        this.pageMenuButton = document.getElementById('pageMenuButton');
        this.pageMenu = document.getElementById('pageMenu');
        this.pageMenuBody = document.getElementById('pageMenuBody');
        this.notebookLoader = notebookLoader;
        this.sidebarController = sidebarController;
        this.isOpen = false;
        this.isHovering = false;
        
        // 折叠图标元素
        this.collapseIconContainer = document.getElementById('collapseIconInMenu');
        this.iconBackward = this.collapseIconContainer?.querySelector('.icon-backward');
        this.iconForward = this.collapseIconContainer?.querySelector('.icon-forward');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateCollapseIcon();
    }
    
    bindEvents() {
        // 鼠标进入/离开事件
        this.pageMenuButton.addEventListener('mouseenter', () => {
            this.isHovering = true;
            this.updateTooltip();
        });
        
        this.pageMenuButton.addEventListener('mouseleave', () => {
            this.isHovering = false;
            this.updateTooltip();
        });
        
        // 页面菜单按钮点击事件
        this.pageMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const width = window.innerWidth;
            
            // 判断点击行为：
            // 1. 宽度 >= 移动端断点 且鼠标悬停 → 触发折叠/展开侧栏
            // 2. 其他情况 → 触发页面菜单
            if (width >= MOBILE_BREAKPOINT && this.isHovering) {
                // 触发折叠/展开侧栏
                if (this.sidebarController) {
                    this.sidebarController.handleCollapse();
                    // 延迟更新折叠图标状态，等待动画完成
                    setTimeout(() => {
                        this.updateCollapseIcon();
                        this.updateTooltip();
                    }, 100);
                }
            } else {
                // 触发页面菜单
                this.toggleMenu();
            }
        });
        
        // 点击菜单外部关闭
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.pageMenu.contains(e.target) && !this.pageMenuButton.contains(e.target)) {
                this.hideMenu();
            }
        });
        
        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hideMenu();
            }
        });
        
        // 阻止菜单内部点击事件冒泡
        this.pageMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // 更新 tooltip 文字
    updateTooltip() {
        const width = window.innerWidth;
        
        if (width >= MOBILE_BREAKPOINT && this.isHovering) {
            // 悬停时显示折叠/展开提示
            const tooltipText = this.sidebarController?.isCollapsed ? '展开侧栏' : '折叠侧栏';
            this.pageMenuButton.setAttribute('data-tooltip', tooltipText);
        } else {
            // 默认显示切换页面提示
            this.pageMenuButton.setAttribute('data-tooltip', '切换页面');
        }
    }
    
    // 更新折叠图标的显示状态
    updateCollapseIcon() {
        if (!this.iconBackward || !this.iconForward || !this.sidebarController) return;
        
        if (this.sidebarController.isCollapsed) {
            this.iconBackward.style.display = 'none';
            this.iconForward.style.display = 'block';
        } else {
            this.iconBackward.style.display = 'block';
            this.iconForward.style.display = 'none';
        }
    }
    
    // 生成页面菜单项
    generatePageMenuItems() {
        if (!this.pageMenuBody || !this.notebookLoader) return;
        
        const notebooks = this.notebookLoader.notebooks;
        const currentNotebook = this.notebookLoader.currentNotebook;
        
        // 清空现有内容
        this.pageMenuBody.innerHTML = '';
        
        // 生成菜单项
        notebooks.forEach(notebook => {
            const menuItem = document.createElement('div');
            menuItem.className = 'page-menu-item';
            if (notebook.name === currentNotebook) {
                menuItem.classList.add('active');
            }
            
            // 获取图标
            const displayIcon = this.notebookLoader.notebookIcons.get(notebook.name) || '📄';
            
            // 如果图标包含HTML标签，需要特殊处理
            const iconHTML = displayIcon.includes('<') 
                ? displayIcon 
                : `<span style="display: block;">${displayIcon}</span>`;
            
            menuItem.innerHTML = `
                <div class="page-menu-item-icon">${iconHTML}</div>
                <div class="page-menu-item-name">${notebook.name}</div>
            `;
            
            // 点击事件
            menuItem.addEventListener('click', async () => {
                // 移除所有活跃状态
                this.pageMenuBody.querySelectorAll('.page-menu-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // 设置当前项为活跃状态
                menuItem.classList.add('active');
                
                // 更新侧边栏的活跃状态
                document.querySelectorAll('.page-title.active').forEach(item => {
                    item.classList.remove('active');
                });
                const sidebarItem = document.querySelector(`[data-notebook="${notebook.name}"]`);
                if (sidebarItem) {
                    sidebarItem.classList.add('active');
                }
                
                // 更新面包屑
                this.notebookLoader.updateBreadcrumb(notebook.name);
                
                // 加载笔记
                await this.notebookLoader.loadNotebook(notebook.name, notebook.path);
                
                // 关闭菜单
                this.hideMenu();
            });
            
            this.pageMenuBody.appendChild(menuItem);
        });
    }
    
    toggleMenu() {
        if (this.isOpen) {
            this.hideMenu();
        } else {
            this.showMenu();
        }
    }
    
    showMenu() {
        this.pageMenu.classList.add('show');
        this.isOpen = true;
        
        // 每次打开时重新生成菜单项，确保状态同步
        this.generatePageMenuItems();
        
        // 更新按钮状态
        this.pageMenuButton.setAttribute('aria-expanded', 'true');
    }
    
    hideMenu() {
        this.pageMenu.classList.remove('show');
        this.isOpen = false;
        
        // 更新按钮状态
        this.pageMenuButton.setAttribute('aria-expanded', 'false');
    }
}

// 更多菜单控制器类
class MoreMenuController {
    constructor(tocController) {
        this.moreButton = document.getElementById('moreButton');
        this.moreMenu = document.getElementById('moreMenu');
        this.isOpen = false;
        this.tocController = tocController;
        
        // 全宽模式状态（默认关闭）
        this.isFullWidth = false;
        
        // 小字号模式状态（默认关闭）
        this.isSmallFont = false;
        
        // 字数统计元素
        this.wordCountElement = document.getElementById('wordCount');
        
        // 编辑信息元素
        this.lastEditorElement = document.getElementById('lastEditor');
        this.lastEditTimeElement = document.getElementById('lastEditTime');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initFullWidth();
        this.initSmallFont();
    }
    
    // 初始化全宽状态
    initFullWidth() {
        if (this.isFullWidth) {
            document.body.classList.add('full-width');
        }
    }
    
    // 初始化小字号状态
    initSmallFont() {
        if (this.isSmallFont) {
            document.body.classList.add('small-font');
        }
    }
    
    bindEvents() {
        // 更多按钮点击事件
        this.moreButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });
        
        // 点击菜单外部关闭
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.moreMenu.contains(e.target) && !this.moreButton.contains(e.target)) {
                this.hideMenu();
            }
        });
        
        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hideMenu();
            }
        });
        
        // 菜单项开关切换
        this.moreMenu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item');
            if (!menuItem) return;
            
            const switchEl = menuItem.querySelector('.switch-container');
            if (switchEl) {
                switchEl.classList.toggle('on');
                
                // 检查是哪个功能开关
                const label = menuItem.querySelector('.label');
                if (label) {
                    const labelText = label.textContent.trim();
                    
                    if (labelText === '目录') {
                        // 切换目录显示/隐藏
                        if (this.tocController) {
                            this.tocController.toggle();
                        }
                    } else if (labelText === '全宽') {
                        // 切换全宽模式
                        this.toggleFullWidth();
                    } else if (labelText === '小字号') {
                        // 切换小字号模式
                        this.toggleSmallFont();
                    }
                }
            }
        });
        
        // 阻止菜单内部点击事件冒泡
        this.moreMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    toggleMenu() {
        if (this.isOpen) {
            this.hideMenu();
        } else {
            this.showMenu();
        }
    }
    
    showMenu() {
        this.moreMenu.classList.add('show');
        this.isOpen = true;
        
        // 更新按钮状态（可选）
        this.moreButton.setAttribute('aria-expanded', 'true');
    }
    
    hideMenu() {
        this.moreMenu.classList.remove('show');
        this.isOpen = false;
        
        // 更新按钮状态（可选）
        this.moreButton.setAttribute('aria-expanded', 'false');
    }
    
    // 切换全宽模式
    toggleFullWidth() {
        this.isFullWidth = !this.isFullWidth;
        
        if (this.isFullWidth) {
            document.body.classList.add('full-width');
        } else {
            document.body.classList.remove('full-width');
        }
        
        console.log('全宽模式:', this.isFullWidth ? '开启' : '关闭');
    }
    
    // 切换小字号模式
    toggleSmallFont() {
        this.isSmallFont = !this.isSmallFont;
        
        if (this.isSmallFont) {
            document.body.classList.add('small-font');
        } else {
            document.body.classList.remove('small-font');
        }
        
        console.log('小字号模式:', this.isSmallFont ? '开启' : '关闭');
    }
    
    // 更新字数统计
    updateWordCount(count) {
        if (this.wordCountElement) {
            this.wordCountElement.textContent = `字数：${count.toLocaleString()} 个字`;
        }
    }
    
    // 更新编辑信息
    updateEditInfo(author, editTime) {
        if (this.lastEditorElement) {
            this.lastEditorElement.textContent = `上次由 ${author || '--'} 编辑`;
        }
        if (this.lastEditTimeElement) {
            this.lastEditTimeElement.textContent = editTime || '--';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const sidebarController = new SidebarController();
    const tocController = new TOCController();
    const notebookLoader = new NotebookLoader(tocController);
    const moreMenuController = new MoreMenuController(tocController);
    const pageMenuController = new PageMenuController(notebookLoader, sidebarController);
    
    // 将控制器实例暴露到全局，方便调试
    window.sidebarController = sidebarController;
    window.notebookLoader = notebookLoader;
    window.tocController = tocController;
    window.moreMenuController = moreMenuController;
    window.pageMenuController = pageMenuController;
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (window.sidebarController) {
        window.sidebarController.destroy();
    }
    if (window.notebookLoader) {
        window.notebookLoader.destroy();
    }
});

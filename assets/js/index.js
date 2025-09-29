// 侧栏交互功能实现
class SidebarController {
    constructor() {
        // 状态变量
        this.sidebarWidth = 280;
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
        this.lastPointer = { x: 0, y: 0 };
        
        // DOM 元素
        this.appLayout = document.getElementById('appLayout');
        this.sidebarContainer = document.getElementById('sidebarContainer');
        this.sidebarClipper = document.getElementById('sidebarClipper');
        this.collapseBtn = document.getElementById('collapseBtn');
        this.resizeHandle = document.getElementById('resizeHandle');
        this.mainContent = document.getElementById('mainContent');
        
        // 图标元素
        this.iconBackward = this.collapseBtn.querySelector('.icon-backward');
        this.iconForward = this.collapseBtn.querySelector('.icon-forward');
        
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
    }
    
    // 更新CSS变量
    updateCSSVariable() {
        this.appLayout.style.setProperty('--sidebar-width', `${this.sidebarWidth}px`);
    }
    
    // 绑定事件
    bindEvents() {
        // 折叠按钮点击事件
        this.collapseBtn.addEventListener('click', () => {
            this.handleCollapse();
        });
        
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
            this.hideTimeout = setTimeout(() => {
                this.setShowSidebar(false);
                this.hideTimeout = null;
            }, 500);
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
        
        // 如果侧栏当前隐藏，检查是否靠近左边缘来显示
        if (!this.showSidebar && !this.isAnimating && !this.isExpanding && e.clientX <= 10) {
            this.setShowSidebar(true);
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
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
                this.hideTimeout = setTimeout(() => {
                    this.setShowSidebar(false);
                    this.hideTimeout = null;
                }, 500);
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
            
            // 10ms后开始展开尺寸动画
            setTimeout(() => {
                this.setInExpansion(true);
            }, 10);
            
            // 0.3秒后完成展开
            setTimeout(() => {
                this.setCollapsedState(false);
                this.setExpandingState(false);
                this.setInExpansion(false);
                this.setShowSidebar(false);
                this.setAnimatingState(false);
            }, 300);
        } else {
            // 防止重复点击
            if (this.isAnimating || this.isExpanding) {
                return;
            }
            
            // 折叠：立即设置折叠状态，然后开始动画
            this.setCollapsedState(true);
            this.setAnimatingState(true);
            this.setShowSidebar(true);
            
            // 10ms后开始尺寸动画（让样式先生效）
            setTimeout(() => {
                this.setInAnimation(true);
            }, 10);
            
            // 0.3秒后完成尺寸收缩动画，变成悬浮状态
            setTimeout(() => {
                this.setFloatingState(true);
                this.setAnimatingState(false);
                this.setInAnimation(false);
                
                // 等一帧、等布局稳定后再判定一次
                requestAnimationFrame(() => {
                    this.checkMousePosition();
                });
            }, 300);
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
            
            // 0.5秒后自动隐藏
            this.hideTimeout = setTimeout(() => {
                this.setShowSidebar(false);
                this.hideTimeout = null;
            }, 500);
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
        // 只在非折叠、非动画、非展开状态下显示拖拽把手
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
        // 更新按钮标题
        this.collapseBtn.title = this.isCollapsed ? '展开侧栏' : '折叠侧栏';
        
        // 切换图标显示
        if (this.isCollapsed) {
            this.iconBackward.style.display = 'none';
            this.iconForward.style.display = 'block';
        } else {
            this.iconBackward.style.display = 'block';
            this.iconForward.style.display = 'none';
        }
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
        
        // 移除事件监听
        document.removeEventListener('mousemove', this.globalMouseMoveHandler);
    }
}

// 笔记加载器类
class NotebookLoader {
    constructor() {
        // 笔记配置
        this.notebooks = [
            {
                name: '概率统计',
                path: 'pages/概率统计/概率统计.html',
                icon: '📊'
            },
            {
                name: '线性代数I', 
                path: 'pages/线性代数I/线性代数I.html',
                icon: '📐'
            }
        ];
        
        this.currentNotebook = null;
        this.contentContainer = document.querySelector('#mainContent .content-wrapper');
        
        // 初始化
        this.init();
    }
    
    init() {
        this.generateNavigationItems();
        this.bindNavigationEvents();
        this.loadDefaultContent();
    }
    
    // 动态生成导航列表
    generateNavigationItems() {
        const pageTree = document.querySelector('.page-tree');
        if (!pageTree) return;
        
        // 清空现有内容
        pageTree.innerHTML = '';
        
        // 生成笔记导航项
        this.notebooks.forEach(notebook => {
            const pageItem = document.createElement('div');
            pageItem.className = 'page-item';
            pageItem.innerHTML = `
                <div class="page-title" data-notebook="${notebook.name}" data-path="${notebook.path}">
                    <span class="page-name">${notebook.icon} ${notebook.name}</span>
                </div>
            `;
            pageTree.appendChild(pageItem);
        });
        
        // 添加首页导航
        const homeItem = document.createElement('div');
        homeItem.className = 'page-item';
        homeItem.innerHTML = `
            <div class="page-title" data-notebook="home">
                <span class="page-name">🏠 首页</span>
            </div>
        `;
        pageTree.insertBefore(homeItem, pageTree.firstChild);
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
            
            if (notebookName === 'home') {
                this.loadDefaultContent();
            } else {
                await this.loadNotebook(notebookName, notebookPath);
            }
        });
    }
    
    // 加载笔记内容
    async loadNotebook(notebookName, notebookPath) {
        try {
            // 显示加载状态
            this.showLoadingState();
            
            console.log(`正在加载笔记: ${notebookName}`);
            
            // 使用fetch加载HTML文件
            const response = await fetch(notebookPath);
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            console.log('HTML内容加载成功');
            
            // 解析HTML内容
            const processedContent = this.parseAndProcessHTML(htmlContent, notebookName);
            
            // 将内容插入到主内容区
            this.insertContent(processedContent);
            
            this.currentNotebook = notebookName;
            console.log(`笔记 ${notebookName} 加载完成`);
            
        } catch (error) {
            console.error('加载笔记失败:', error);
            this.showErrorState(error.message);
        }
    }
    
    // 解析和处理HTML内容
    parseAndProcessHTML(htmlContent, notebookName) {
        // 创建临时DOM来解析HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // 提取文章内容（优先提取article标签，否则提取body内容）
        let contentElement = doc.querySelector('article');
        if (!contentElement) {
            contentElement = doc.querySelector('body');
        }
        
        if (!contentElement) {
            throw new Error('无法找到有效的内容');
        }
        
        // 修正资源路径
        this.fixResourcePaths(contentElement, notebookName);
        
        return contentElement.innerHTML;
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
        
        // 滚动到顶部
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }
    
    // 显示加载状态
    showLoadingState() {
        if (!this.contentContainer) return;
        
        this.contentContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #5F5E5B;">
                <div style="font-size: 48px; margin-bottom: 20px;">📖</div>
                <h2 style="color: #32302C; margin-bottom: 10px;">正在加载笔记...</h2>
                <p>请稍等片刻</p>
            </div>
        `;
    }
    
    // 显示错误状态
    showErrorState(message) {
        if (!this.contentContainer) return;
        
        this.contentContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #dc3545;">
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
        `;
    }
    
    // 加载默认内容（首页）
    loadDefaultContent() {
        if (!this.contentContainer) return;
        
        this.contentContainer.innerHTML = `
            <h1>欢迎来到我的笔记系统</h1>
            <p>这里是一个基于动态加载的笔记管理系统。你可以：</p>
            <ul>
                <li>点击左侧侧栏中的笔记标题来查看不同科目的笔记</li>
                <li>点击左侧的折叠按钮来折叠/展开侧栏</li>
                <li>拖拽侧栏右边缘来调整侧栏宽度</li>
                <li>当侧栏折叠后，将鼠标移到屏幕左边缘可以临时显示侧栏</li>
            </ul>
            <div class="demo-content">
                <h2>系统特性</h2>
                <p>这个系统具有以下特性：</p>
                <ul>
                    <li><strong>动态内容加载</strong>：使用Ajax技术动态加载笔记内容，无需页面刷新</li>
                    <li><strong>路径自动修正</strong>：自动修正图片和媒体文件的相对路径</li>
                    <li><strong>样式预加载</strong>：预加载了所有必要的CSS样式文件</li>
                    <li><strong>响应式侧栏</strong>：支持折叠、展开、拖拽调整等交互</li>
                    <li><strong>数学公式支持</strong>：支持KaTeX数学公式渲染</li>
                    <li><strong>代码高亮</strong>：支持Prism.js代码语法高亮</li>
                </ul>
            </div>
        `;
        
        this.currentNotebook = null;
    }
    
    // 获取当前加载的笔记
    getCurrentNotebook() {
        return this.currentNotebook;
    }
    
    // 清理资源
    destroy() {
        // 清理事件监听器等
        console.log('NotebookLoader已清理');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const sidebarController = new SidebarController();
    const notebookLoader = new NotebookLoader();
    
    // 将控制器实例暴露到全局，方便调试
    window.sidebarController = sidebarController;
    window.notebookLoader = notebookLoader;
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

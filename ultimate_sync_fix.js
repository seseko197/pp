// ultimate_sync_fix.js - 终极跨页面同步解决方案 
class UltimateSyncFix { 
    constructor() { 
        this.version = '1.0.0'; 
        this.syncKeys = { 
            profile: 'ultimate_user_profile', 
            trigger: 'ultimate_sync_trigger', 
            timestamp: 'ultimate_sync_timestamp' 
        }; 
        this.init(); 
    } 

    init() { 
        console.log('🚀 终极同步修复工具启动 v' + this.version); 
        
        // 监听所有可能的同步事件 
        this.setupEventListeners(); 
        
        // 立即同步一次 
        this.syncAllPages(); 
        
        // 设置心跳检测 
        this.setupHeartbeat(); 
    } 

    setupEventListeners() {
        // localStorage变化监听
        window.addEventListener('storage', (e) => { 
            this.handleStorageChange(e);
        }); 

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => { 
            if (!document.hidden) { 
                // 仅在开发环境输出日志
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            console.log('📱 页面变为可见，触发同步检查');
        }
                this.syncAllPages();
            }
        }); 

        // 页面聚焦事件
        window.addEventListener('focus', () => { 
            // 仅在开发环境输出日志
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            console.log('🎯 页面获得焦点，触发同步检查');
        }
            this.syncAllPages();
        }); 

        // 定期同步（从5秒改为30秒）
        setInterval(() => { 
            this.checkForUpdates();
        }, 30000);
    } 

    handleStorageChange(event) {
        // 仅在开发环境输出日志
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            console.log('🔄 检测到存储变化:', event.key);
        }
        
        switch (event.key) { 
            case this.syncKeys.profile: 
                this.syncUserProfile(); 
                break; 
            case this.syncKeys.trigger: 
                this.syncAllPages(); 
                break; 
            case 'userProfileUpdated': 
            case 'userProfileData': 
                this.legacySync(); 
                break;
        }
    } 

    async syncAllPages() { 
        // 仅在开发环境输出日志
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            console.log('🔄 开始全页面同步');
        }
        
        try { 
            await this.syncUserProfile(); 
            await this.syncAnalysisHistory(); 
            this.updateSyncTimestamp(); 
        } catch (error) { 
            console.error('同步失败:', error); 
        }
    } 

    async syncUserProfile() { 
        try { 
            // 方法1: 从localStorage获取 
            const profileData = localStorage.getItem(this.syncKeys.profile) || 
                              localStorage.getItem('userProfileData'); 
            
            if (profileData) { 
                const profile = JSON.parse(profileData); 
                await this.updateProfileDisplay(profile); 
                // 仅在开发环境输出日志
                if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
                    console.log('✅ 用户资料同步完成');
                }
                return true; 
            } 

            // 方法2: 从IndexedDB获取 
            if (window.localDB) { 
                const profile = await window.localDB.getUserProfile(); 
                if (profile) { 
                    await this.updateProfileDisplay(profile); 
                    // 仅在开发环境输出日志
                if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
                    console.log('✅ 从IndexedDB同步用户资料完成');
                }
                    return true; 
                } 
            } 

            // 仅在开发环境输出日志
                if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
                    console.log('⚠️ 未找到用户资料数据');
                }
            return false; 
        } catch (error) { 
            console.error('用户资料同步失败:', error); 
            return false; 
        }
    } 

    async syncAnalysisHistory() { 
        try { 
            if (typeof syncAnalysisHistory === 'function') { 
                await syncAnalysisHistory(); 
                // 仅在开发环境输出日志
                if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
                    console.log('✅ 分析历史同步完成');
                }
            } 
        } catch (error) { 
            console.error('分析历史同步失败:', error); 
        }
    } 

    async updateProfileDisplay(profile) { 
        if (!profile) return; 

        console.log('🎨 更新页面显示:', profile.fullname); 

        // 更新所有头像元素 
        const avatarSelectors = [ 
            'img[src*="picsum"]', 
            '#user-avatar', 
            '#preview-avatar', 
            '#nav-avatar-desktop', 
            '#nav-avatar-mobile', 
            '.avatar', 
            '[class*="avatar"]' 
        ]; 

        avatarSelectors.forEach(selector => { 
            document.querySelectorAll(selector).forEach(img => { 
                if (profile.avatar && img.tagName === 'IMG') { 
                    img.src = profile.avatar; 
                    img.alt = profile.fullname || '用户头像'; 
                } 
            }); 
        }); 

        // 更新所有姓名元素 - 使用精确的选择器以避免误替换
        const nameSelectors = [ 
            '#user-name', 
            '#nav-username-desktop', 
            '#nav-username-mobile', 
            '[id="username"]', 
            '[id="fullname"]', 
            '.username-display',
            '.fullname-display'
        ]; 

        nameSelectors.forEach(selector => { 
            document.querySelectorAll(selector).forEach(element => { 
                if (profile.fullname && element.textContent && 
                    // 确保不替换表单标签和非用户信息元素
                    !element.matches('label') && 
                    !element.closest('form') && 
                    !element.textContent.includes('数据类型') && 
                    !element.textContent.includes('参考标准')
                ) { 
                    // 记录更新前的内容，便于调试
                    const oldText = element.textContent;
                    element.textContent = profile.fullname;
                    // 只有当内容实际发生变化时才记录日志
                    if (oldText !== profile.fullname && typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
                        console.log(`🔄 已更新元素: ${selector}, 从 "${oldText}" 到 "${profile.fullname}"`);
                    }
                } 
            }); 
        }); 

        // 更新邮箱 
        if (profile.email) { 
            const emailElements = document.querySelectorAll('#user-email'); 
            emailElements.forEach(el => { 
                if (el.textContent) el.textContent = profile.email; 
            }); 
        } 

        // 触发自定义事件 
        this.dispatchProfileUpdatedEvent(profile); 
    } 

    dispatchProfileUpdatedEvent(profile) { 
        const event = new CustomEvent('ultimateProfileUpdated', { 
            detail: { profile, timestamp: Date.now() } 
        }); 
        window.dispatchEvent(event); 
    } 

    triggerGlobalSync(profileData = null) {
        console.log('🌍 触发全局同步');
        
        const timestamp = Date.now();
        
        // 方法1: 使用新系统
        if (profileData) {
            console.log('📤 保存用户资料:', profileData.fullname);
            localStorage.setItem(this.syncKeys.profile, JSON.stringify(profileData));
            // 立即更新当前页面的显示
            this.updateProfileDisplay(profileData);
        }
        
        localStorage.setItem(this.syncKeys.trigger, timestamp.toString());
        localStorage.setItem(this.syncKeys.timestamp, timestamp.toString());
    }

    setupHeartbeat() {
        // 仅在开发环境输出日志
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            console.log('💓 设置心跳检测系统');
        }
        
        // 从10秒改为60秒
        setInterval(() => {
            const heartbeat = {
                timestamp: Date.now(),
                version: this.version,
                active: true
            };
            
            try {
                localStorage.setItem('ultimate_sync_heartbeat', JSON.stringify(heartbeat));
            } catch (error) {
                console.error('心跳检测失败:', error);
            }
        }, 60000);
    }

    checkForUpdates() {
        // 仅在开发环境输出日志
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            console.log('🔍 检查更新...');
        }
        
        try { 
            // 检查时间戳是否更新
            const lastSync = localStorage.getItem(this.syncKeys.timestamp); 
            const currentTimestamp = Date.now(); 
            
            // 如果超过30秒没有同步，强制同步（从10秒改为30秒）
            if (!lastSync || (currentTimestamp - parseInt(lastSync)) > 30000) { 
                // 仅在开发环境输出日志
                    if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
                        console.log('⏱️ 同步时间戳过期，触发强制同步');
                    }
                this.syncAllPages(); 
            } 
        } catch (error) { 
            console.error('更新检查失败:', error); 
        }
    }

    legacySync() { 
        // 仅在开发环境输出日志
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            console.log('🔄 兼容旧系统同步');
        }
        
        try { 
            // 处理旧系统的同步
            this.syncUserProfile(); 
        } catch (error) { 
            console.error('旧系统同步失败:', error); 
        }
    }
}

// 初始化同步系统
if (!window.ultimateSyncSystem) {
    window.ultimateSyncSystem = new UltimateSyncFix();
    console.log('✅ 终极同步系统已成功初始化');
} else {
    console.log('⚠️ 终极同步系统已存在，跳过初始化');
}
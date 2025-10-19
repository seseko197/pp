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
        // 静默处理：终极同步修复工具启动 v' + this.version
        
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
                // 静默处理：页面变为可见，触发同步检查
                this.syncAllPages();
            }
        }); 

        // 页面聚焦事件
        window.addEventListener('focus', () => { 
            // 静默处理：页面获得焦点，触发同步检查
            this.syncAllPages();
        }); 

        // 定期同步（从5秒改为30秒）
        setInterval(() => { 
            this.checkForUpdates();
        }, 30000);
    } 

    handleStorageChange(event) {
        // 静默处理：检测到存储变化
        
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
        // 静默处理：开始全页面同步
        
        try { 
            await this.syncUserProfile(); 
            await this.syncAnalysisHistory(); 
            this.updateSyncTimestamp(); 
        } catch (error) { 
            // 静默处理：同步失败
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
                // 静默处理：用户资料同步完成
                return true; 
            } 

            // 方法2: 通过localDB接口获取（内部已使用localStorage）
            if (window.localDB) { 
                const profile = await window.localDB.getUserProfile(); 
                if (profile) { 
                    await this.updateProfileDisplay(profile); 
                    // 静默处理：通过localDB同步用户资料完成
                    return true; 
                } 
            } 

            // 静默处理：未找到用户资料数据
            return false; 
        } catch (error) { 
            // 静默处理：用户资料同步失败
            return false; 
        }
    } 

    async syncAnalysisHistory() { 
        try { 
            if (typeof syncAnalysisHistory === 'function') { 
                await syncAnalysisHistory(); 
                // 静默处理：分析历史同步完成
            } 
        } catch (error) { 
            // 静默处理：分析历史同步失败
        }
    } 

    async updateProfileDisplay(profile) { 
        if (!profile) return; 

        // 静默处理：更新页面显示 

        // 头像使用默认头像，不再从profile更新 

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
                    // 静默处理：更新元素内容
                    const oldText = element.textContent;
                    element.textContent = profile.fullname;
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
        // 静默处理：触发全局同步
        
        const timestamp = Date.now();
        
        // 方法1: 使用新系统
        if (profileData) {
            // 静默处理：保存用户资料
            localStorage.setItem(this.syncKeys.profile, JSON.stringify(profileData));
            // 立即更新当前页面的显示
            this.updateProfileDisplay(profileData);
        }
        
        localStorage.setItem(this.syncKeys.trigger, timestamp.toString());
        localStorage.setItem(this.syncKeys.timestamp, timestamp.toString());
    }

    setupHeartbeat() {
        // 静默处理：设置心跳检测系统
        
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
                // 静默处理：心跳检测失败
            }
        }, 60000);
    }

    checkForUpdates() {
        // 静默处理：检查更新...
        
        try { 
            // 检查时间戳是否更新
            const lastSync = localStorage.getItem(this.syncKeys.timestamp); 
            const currentTimestamp = Date.now(); 
            
            // 如果超过30秒没有同步，强制同步（从10秒改为30秒）
            if (!lastSync || (currentTimestamp - parseInt(lastSync)) > 30000) { 
                // 静默处理：同步时间戳过期，触发强制同步
                this.syncAllPages(); 
            } 
        } catch (error) { 
            // 静默处理：更新检查失败
        }
    }

    legacySync() { 
        // 静默处理：兼容旧系统同步
        
        try { 
            // 处理旧系统的同步
            this.syncUserProfile(); 
        } catch (error) { 
            // 静默处理：旧系统同步失败
        }
    }
}

// 初始化同步系统
if (!window.ultimateSyncSystem) {
    window.ultimateSyncSystem = new UltimateSyncFix();
    // 静默处理：终极同步系统已成功初始化
} else {
    // 静默处理：终极同步系统已存在，跳过初始化
}
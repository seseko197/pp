// core_sync_system.js - 核心统一同步系统
// 设计理念：精简、高效、一致
// 目标：消除系统冗余，统一数据存储，优化性能

class CoreSyncSystem {
    constructor() {
        
        // 统一的存储键名
        this.storageKeys = {
            profile: 'core_user_profile',
            analysisHistory: 'analysisHistory',
            syncTrigger: 'core_sync_trigger',
            lastSyncTime: 'core_last_sync_time'
        };
        
        // 配置参数
        this.config = {
            syncInterval: 60000, // 60秒同步一次
            maxHistoryRecords: 100,
            isDevMode: typeof window !== 'undefined' && window.location && 
                      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
            enableLogging: true // 启用日志记录
        };
        
        // 追踪同步状态
        this.state = {
            isSyncing: false,
            lastSyncTime: 0,
            isEditingProfile: false,
            initialized: false,
            syncAttempts: 0,
            lastSyncError: null
        };
        
        // 安全存储访问 - 在构造函数中初始化
        this.secureStorage = {
            getItem: (key) => {
                try {
                    return localStorage.getItem(key);
                } catch (e) {
                    this.log('error', `获取本地存储失败 [${key}]:`, e);
                    return null;
                }
            },
            setItem: (key, value) => {
                try {
                    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                    localStorage.setItem(key, stringValue);
                    return true;
                } catch (e) {
                    this.log('error', `设置本地存储失败 [${key}]:`, e);
                    return false;
                }
            },
            removeItem: (key) => {
                try {
                    localStorage.removeItem(key);
                    return true;
                } catch (e) {
                    this.log('error', `删除本地存储失败 [${key}]:`, e);
                    return false;
                }
            }
        };
        
        // 初始化
        this.init();
    }
    
    // 增强的日志系统
    log(level, ...args) {
        if (!this.config.enableLogging) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[CoreSync] ${timestamp} [${level.toUpperCase()}]`;
        
        switch (level) {
            case 'error':
                console.error(prefix, ...args);
                break;
            case 'warn':
                console.warn(prefix, ...args);
                break;
            case 'info':
                if (this.config.isDevMode) {
                    console.info(prefix, ...args);
                }
                break;
            case 'debug':
                if (this.config.isDevMode) {
                    console.debug(prefix, ...args);
                }
                break;
            default:
                if (this.config.isDevMode) {
                    console.log(prefix, ...args);
                }
        }
    }
    
    init() {
        try {
            this.log('info', '初始化核心同步系统...');
            
            // 确保window对象存在
            if (typeof window === 'undefined') {
                this.log('error', '运行环境不支持，无法初始化同步系统');
                return;
            }
            
            // 避免重复初始化
            if (window._coreSyncSystemInitialized) {
                this.log('warn', '核心同步系统已初始化，跳过重复初始化');
                return;
            }
            
            // 从存储恢复同步时间
            const savedSyncTime = localStorage.getItem(this.storageKeys.lastSyncTime);
            if (savedSyncTime) {
                this.state.lastSyncTime = parseInt(savedSyncTime);
                this.log('debug', '恢复上次同步时间:', new Date(this.state.lastSyncTime).toLocaleString());
            }
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 立即同步一次
            this.syncAllData();
            
            // 设置定期同步
            this.scheduleNextSync();
            
            this.state.initialized = true;
            window._coreSyncSystemInitialized = true;
            
            window.coreSyncSystem = this;
            
            this.log('info', '核心同步系统初始化完成');
            
        } catch (error) {
            this.log('error', '核心同步系统初始化失败:', error);
        }
    }
    
    setupEventListeners() {
        try {
            this.log('debug', '设置事件监听器...');
            
            // 使用防抖处理storage事件，避免频繁触发
            let storageDebounceTimer;
            window.addEventListener('storage', (e) => {
                clearTimeout(storageDebounceTimer);
                storageDebounceTimer = setTimeout(() => {
                    this.handleStorageChange(e);
                }, 200);
            });
            
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            
            // 使用节流处理页面焦点事件
            let focusThrottleTimer;
            window.addEventListener('focus', () => {
                if (!focusThrottleTimer) {
                    this.handlePageFocus();
                    focusThrottleTimer = setTimeout(() => {
                        focusThrottleTimer = null;
                    }, 5000); // 5秒内只触发一次
                }
            });
            
            window.addEventListener('coreProfileUpdated', this.handleCoreProfileUpdate.bind(this));
            window.addEventListener('coreAnalysisHistoryUpdated', this.handleAnalysisHistoryUpdate.bind(this));
            
            // 监听页面卸载，清理资源
            window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
            
        } catch (error) {
            this.log('error', '设置事件监听器失败:', error);
        }
    }
    
    handleStorageChange(event) {
        try {
            if (this.state.isSyncing) {
                this.log('debug', '同步正在进行中，跳过storage事件处理');
                return;
            }
            
            // 只处理关键存储变化
            switch (event.key) {
                case this.storageKeys.profile:
                    this.log('debug', '检测到用户资料变化，触发同步');
                    this.syncUserData();
                    break;
                case this.storageKeys.analysisHistory:
                    this.log('debug', '检测到分析历史变化，触发同步');
                    this.syncAnalysisHistory();
                    break;
                case this.storageKeys.syncTrigger:
                    this.log('debug', '检测到同步触发器，执行全量同步');
                    this.syncAllData();
                    break;
                // 兼容旧系统键名
                case 'userProfileData':
                case 'unified_user_profile':
                case 'ultimate_user_profile':
                    this.log('debug', `检测到旧系统键变化 [${event.key}]，执行数据迁移`);
                    this.migrateUserData(event.key);
                    break;
            }
        } catch (error) {
            this.log('error', '处理storage事件失败:', error);
        }
    }
    
    handleVisibilityChange() {
        try {
            if (!document.hidden && this.state.initialized) {
                this.log('debug', '页面变为可见状态，检查是否需要同步');
                
                // 检查距离上次同步的时间，避免过于频繁
                const timeSinceLastSync = Date.now() - this.state.lastSyncTime;
                if (timeSinceLastSync > 30000) { // 30秒
                    this.syncAllData();
                } else {
                    this.log('debug', `距离上次同步仅 ${timeSinceLastSync}ms，跳过同步`);
                }
            }
        } catch (error) {
            this.log('error', '处理页面可见性变化失败:', error);
        }
    }
    
    handlePageFocus() {
        try {
            // 避免过于频繁的同步
            const timeSinceLastSync = Date.now() - this.state.lastSyncTime;
            if (timeSinceLastSync > 10000) { // 10秒
                this.log('debug', '页面获得焦点，执行同步');
                this.syncAllData();
            } else {
                this.log('debug', `页面获得焦点，但距离上次同步仅 ${timeSinceLastSync}ms，跳过同步`);
            }
        } catch (error) {
            this.log('error', '处理页面焦点事件失败:', error);
        }
    }
    
    handleCoreProfileUpdate(event) {
        const profile = event.detail?.profile;
        if (profile) {
            this.updateProfileDisplay(profile);
        }
    }
    
    handleAnalysisHistoryUpdate() {
        this.syncAnalysisHistory();
    }
    
    scheduleNextSync() {
        try {
            requestAnimationFrame(() => {
                const now = Date.now();
                const timeSinceLastSync = now - this.state.lastSyncTime;
                
                if (timeSinceLastSync >= this.config.syncInterval) {
                    this.log('debug', `定期同步触发，距离上次同步 ${timeSinceLastSync}ms`);
                    this.syncAllData();
                }
                
                // 设置下一次检查，使用setTimeout而非递归，避免调用栈过深
                this.nextSyncTimeout = setTimeout(() => {
                    this.scheduleNextSync();
                }, 5000); // 每5秒检查一次
            });
        } catch (error) {
            this.log('error', '调度下次同步失败:', error);
            // 即使出错也尝试重新调度
            setTimeout(() => this.scheduleNextSync(), 10000);
        }
    }
    
    async syncAllData() {
        if (this.state.isSyncing || !this.state.initialized) {
            this.log('debug', '同步条件不满足，跳过同步');
            return;
        }
        
        this.state.isSyncing = true;
        this.state.syncAttempts++;
        this.log('info', `开始第 ${this.state.syncAttempts} 次全量同步...`);
        
        try {
            // 使用单独的catch处理每个同步操作，确保一个失败不影响另一个
            const syncResults = await Promise.allSettled([
                this.syncUserData(),
                this.syncAnalysisHistory()
            ]);
            
            // 检查结果
            const userDataSuccess = syncResults[0].status === 'fulfilled';
            const analysisSuccess = syncResults[1].status === 'fulfilled';
            
            // 记录错误
            if (!userDataSuccess) {
                this.log('error', '用户资料同步失败:', syncResults[0].reason);
            }
            if (!analysisSuccess) {
                this.log('error', '分析历史同步失败:', syncResults[1].reason);
            }
            
            // 即使部分失败，也更新同步时间（避免反复尝试失败的操作）
            this.state.lastSyncTime = Date.now();
            this.secureStorage.setItem(this.storageKeys.lastSyncTime, this.state.lastSyncTime.toString());
            
            this.state.lastSyncError = null;
            this.log('info', `同步完成 - 用户资料:${userDataSuccess ? '成功' : '失败'}, 分析历史:${analysisSuccess ? '成功' : '失败'}`);
            
        } catch (error) {
            this.log('error', '同步过程发生未预期错误:', error);
            this.state.lastSyncError = error.message;
        } finally {
            this.state.isSyncing = false;
        }
    }
    
    async syncUserData() {
        try {
            this.log('debug', '开始同步用户资料...');
            
            // 尝试使用localDB（如果可用）
            if (window.localDB && typeof window.localDB.getUserProfile === 'function') {
                this.log('debug', '使用localDB获取用户资料');
                try {
                    const profile = await window.localDB.getUserProfile();
                    if (profile && !this.state.isEditingProfile) {
                        this.updateProfileDisplay(profile);
                        this.log('debug', '用户资料同步成功（通过localDB）');
                        return true;
                    }
                } catch (localDbError) {
                    this.log('warn', 'localDB获取用户资料失败，回退到本地存储:', localDbError);
                    // 继续执行，尝试从本地存储获取
                }
            }
            
            // 备用方案：使用本地存储
            const profile = this.getUserProfile();
            if (profile && !this.state.isEditingProfile) {
                this.updateProfileDisplay(profile);
                this.log('debug', '用户资料同步成功（通过本地存储）');
                return true;
            }
            
            this.log('debug', '没有可用的用户资料或正在编辑中');
            return false;
        } catch (error) {
            this.log('error', '同步用户资料失败:', error);
            throw error;
        }
    }
    
    async syncAnalysisHistory() {
        try {
            this.log('debug', '开始同步分析历史...');
            
            // 尝试使用localDB（如果可用）
            if (window.localDB && typeof window.localDB.getAllAnalysisHistory === 'function') {
                this.log('debug', '使用localDB获取分析历史');
                try {
                    const history = await window.localDB.getAllAnalysisHistory();
                    this.log('debug', `成功获取 ${history.length} 条分析历史记录`);
                    
                    // 保存到本地存储作为备份
                    if (history.length > 0) {
                        this.secureStorage.setItem(
                            this.storageKeys.analysisHistory, 
                            JSON.stringify(history)
                        );
                    }
                    
                    return true;
                } catch (localDbError) {
                    this.log('warn', 'localDB获取分析历史失败，尝试调用页面同步函数:', localDbError);
                }
            }
            
            // 备用方案：调用页面上可能存在的同步函数
            if (typeof syncAnalysisHistory === 'function') {
                this.log('debug', '调用页面同步函数');
                await syncAnalysisHistory();
                return true;
            }
            
            this.log('debug', '没有可用的分析历史同步方法');
            return false;
        } catch (error) {
            this.log('error', '同步分析历史失败:', error);
            throw error;
        }
    }
    
    // 用户资料相关方法
    getUserProfile() {
        try {
            this.log('debug', '获取用户资料...');
            
            // 优先使用核心键名
            let profileData = this.secureStorage.getItem(this.storageKeys.profile);
            
            // 兼容旧系统的键名
            if (!profileData) {
                this.log('debug', '未找到核心键资料，尝试旧系统键名');
                const legacyKeys = ['userProfileData', 'unified_user_profile', 'ultimate_user_profile', 'currentUser'];
                for (const key of legacyKeys) {
                    profileData = this.secureStorage.getItem(key);
                    if (profileData) {
                        this.log('debug', `从旧系统键 [${key}] 找到用户资料`);
                        break;
                    }
                }
            }
            
            if (profileData) {
                try {
                    const profile = JSON.parse(profileData);
                    this.log('debug', '成功解析用户资料');
                    return profile;
                } catch (parseError) {
                    this.log('error', '解析用户资料JSON失败:', parseError);
                    // 尝试清理损坏的数据
                    this.secureStorage.removeItem(this.storageKeys.profile);
                    return null;
                }
            }
            
            this.log('debug', '未找到用户资料');
            return null;
        } catch (error) {
            this.log('error', '获取用户资料失败:', error);
            return null;
        }
    }
    
    saveUserProfile(profile) {
        try {
            this.log('debug', '保存用户资料...');
            
            const userData = {
                id: 'currentUser',
                ...profile,
                updatedAt: new Date().toISOString()
            };
            
            // 保存到核心存储
            const saved = this.secureStorage.setItem(this.storageKeys.profile, userData);
            if (!saved) {
                throw new Error('保存到本地存储失败');
            }
            
            // 触发同步
            this.triggerSync();
            
            // 更新显示（如果不在编辑模式）
            if (!this.state.isEditingProfile) {
                this.updateProfileDisplay(userData);
            }
            
            // 触发全局事件通知其他组件
            window.dispatchEvent(new CustomEvent('coreProfileUpdated', { 
                detail: { profile: userData } 
            }));
            
            this.log('debug', '用户资料保存成功');
            return userData;
        } catch (error) {
            this.log('error', '保存用户资料失败:', error);
            throw error;
        }
    }
    
    updateProfileDisplay(profile) {
        if (!profile) return;
        
        // 批量更新DOM，减少重排重绘
        const updates = [];
        
        // 更新头像
        if (profile.avatar) {
            updates.push(
                { selector: '#user-avatar, #nav-avatar-desktop, #nav-avatar-mobile', property: 'attributes', value: { src: profile.avatar } },
                { selector: '#user-avatar, #nav-avatar-desktop, #nav-avatar-mobile', property: 'attributes', value: { alt: profile.fullname || '用户头像' } }
            );
        }
        
        // 更新用户名
        if (profile.fullname) {
            updates.push(
                { selector: '#user-name, #nav-username-desktop, #nav-username-mobile, #username, #fullname, .username-display, .fullname-display', property: 'textContent', value: profile.fullname }
            );
        }
        
        // 更新邮箱
        if (profile.email) {
            updates.push(
                { selector: '#user-email', property: 'textContent', value: profile.email }
            );
        }
        
        // 执行批量更新
        this.batchUpdateDOM(updates);
    }
    
    // 分析历史相关方法
    getAllAnalysisHistory() {
        try {
            const historyRecords = JSON.parse(localStorage.getItem(this.storageKeys.analysisHistory)) || [];
            return historyRecords.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            return [];
        }
    }
    
    addAnalysisRecord(record) {
        try {
            const recordData = {
                ...record,
                id: Date.now() + Math.floor(Math.random() * 1000),
                timestamp: record.timestamp || Date.now(),
                createdAt: new Date().toISOString()
            };
            
            const historyRecords = JSON.parse(localStorage.getItem(this.storageKeys.analysisHistory)) || [];
            historyRecords.unshift(recordData);
            
            const limitedRecords = historyRecords.slice(0, this.config.maxHistoryRecords);
            localStorage.setItem(this.storageKeys.analysisHistory, JSON.stringify(limitedRecords));
            
            this.triggerSync();
            
            window.dispatchEvent(new CustomEvent('coreAnalysisHistoryUpdated', { 
                detail: { record: recordData } 
            }));
            
            return recordData;
        } catch (error) {
            throw error;
        }
    }
    
    deleteAnalysisRecord(id) {
        try {
            const historyRecords = JSON.parse(localStorage.getItem(this.storageKeys.analysisHistory)) || [];
            
            const updatedRecords = historyRecords.filter(record => {
                if (record.id === id) return false;
                if (record.id == id) return false; // 类型不严格比较
                
                if (typeof record.id === 'number' && typeof id === 'string') {
                    return record.id !== parseInt(id);
                }
                if (typeof record.id === 'string' && typeof id === 'number') {
                    return record.id !== id.toString();
                }
                
                return true;
            });
            
            localStorage.setItem(this.storageKeys.analysisHistory, JSON.stringify(updatedRecords));
            this.triggerSync();
            
            window.dispatchEvent(new CustomEvent('coreAnalysisHistoryUpdated'));
            
            return updatedRecords.length !== historyRecords.length;
        } catch (error) {
            throw error;
        }
    }
    
    // 辅助方法 - 触发同步
    triggerSync() {
        try {
            this.log('debug', '触发同步...');
            const timestamp = Date.now().toString();
            
            // 使用安全存储方法
            this.secureStorage.setItem(this.storageKeys.syncTrigger, timestamp);
            
            // 延迟清理触发器，避免重复触发
            setTimeout(() => {
                try {
                    this.secureStorage.removeItem(this.storageKeys.syncTrigger);
                    this.log('debug', '同步触发器已清理');
                } catch (e) {
                    this.log('error', '清理同步触发器失败:', e);
                }
            }, 200); // 稍微延长时间确保事件传播完成
            
        } catch (error) {
            this.log('error', '触发同步失败:', error);
        }
    }
    
    // 处理页面卸载
    handleBeforeUnload() {
        try {
            this.log('info', '页面卸载，清理同步资源');
            
            // 清理定时器
            if (this.nextSyncTimeout) {
                clearTimeout(this.nextSyncTimeout);
            }
            
            // 清理全局标志
            // 注意：不清理_coreSyncSystemInitialized，因为页面可能在不同标签页间切换
            
        } catch (error) {
            this.log('error', '清理资源失败:', error);
        }
    }
    
    batchUpdateDOM(updates) {
        if (!Array.isArray(updates) || updates.length === 0) return;
        
        // 使用DocumentFragment优化DOM更新
        const fragment = document.createDocumentFragment();
        const updateMap = new Map(); // 存储需要更新的元素和属性
        
        // 第一阶段：收集所有元素和更新
        updates.forEach(update => {
            const elements = document.querySelectorAll(update.selector);
            elements.forEach(element => {
                if (!updateMap.has(element)) {
                    updateMap.set(element, []);
                }
                updateMap.get(element).push(update);
            });
        });
        
        // 第二阶段：执行更新
        updateMap.forEach((elementUpdates, element) => {
            try {
                elementUpdates.forEach(update => {
                    if (update.property === 'textContent') {
                        if (element.textContent !== update.value && 
                            !element.matches('input, textarea, select, label')) {
                            element.textContent = update.value;
                        }
                    } else if (update.property === 'attributes' && typeof update.value === 'object') {
                        Object.entries(update.value).forEach(([key, value]) => {
                            element.setAttribute(key, value);
                        });
                    } else if (update.property === 'className') {
                        element.className = update.value;
                    } else if (update.property === 'style' && typeof update.value === 'object') {
                        Object.assign(element.style, update.value);
                    }
                });
            } catch (e) {
                // 静默处理DOM更新错误
            }
        });
    }
    
    // 迁移方法
    migrateUserData(fromKey) {
        try {
            const profileData = localStorage.getItem(fromKey);
            if (profileData) {
                const profile = JSON.parse(profileData);
                this.saveUserProfile(profile);
            }
        } catch (error) {
            // 静默处理迁移错误
        }
    }
    
    // 控制编辑模式
    setEditingProfile(isEditing) {
        this.state.isEditingProfile = isEditing;
    }
    

}

// 初始化核心同步系统
// 确保只初始化一次
if (typeof window !== 'undefined' && !window.coreSyncSystem && !window._coreSyncSystemInitialized) {
    window.coreSyncSystem = new CoreSyncSystem();
    console.log('核心同步系统已创建');
} else if (window.coreSyncSystem) {
    console.log('核心同步系统已存在，使用现有实例');
}
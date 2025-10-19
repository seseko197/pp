// unified_sync_manager.js - 统一同步管理系统
// 设计理念：整合所有同步功能，消除冗余，提供一致的API
// 目标：替代CoreSyncSystem、UltimateSyncFix、localdb.js中的同步部分和sync_user_profile.js

class UnifiedSyncManager {
    constructor() {
        // 统一的存储键名配置
        this.storageKeys = {
            profile: 'unified_user_profile',
            analysisHistory: 'analysisHistory',
            syncTrigger: 'unified_sync_trigger',
            lastSyncTime: 'unified_last_sync_time'
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
        
        // 发布-订阅模式实现页面内组件通信
        this.subscribers = {};
        
        // API服务实例（如果可用）
        this.apiService = window.apiService || null;
        
        // 初始化
        this.init();
    }
    
    // 增强的日志系统
    log(level, ...args) {
        if (!this.config.enableLogging) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[UnifiedSync] ${timestamp} [${level.toUpperCase()}]`;
        
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
    
    // 安全存储访问方法
    secureStorage = {
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
    
    init() {
        try {
            this.log('info', '初始化统一同步管理系统...');
            
            // 确保window对象存在
            if (typeof window === 'undefined') {
                this.log('error', '运行环境不支持，无法初始化同步系统');
                return;
            }
            
            // 避免重复初始化
            if (window._unifiedSyncManagerInitialized) {
                this.log('warn', '统一同步管理系统已初始化，跳过重复初始化');
                return;
            }
            
            // 从存储恢复同步时间
            const savedSyncTime = this.secureStorage.getItem(this.storageKeys.lastSyncTime);
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
            window._unifiedSyncManagerInitialized = true;
            window.unifiedSyncManager = this;
            
            this.log('info', '统一同步管理系统初始化完成');
            
        } catch (error) {
            this.log('error', '统一同步管理系统初始化失败:', error);
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
            
            // 页面可见性变化
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.log('debug', '页面变为可见，触发同步检查');
                    this.syncAllData();
                }
            });
            
            // 使用节流处理页面焦点事件
            let focusThrottleTimer;
            window.addEventListener('focus', () => {
                if (!focusThrottleTimer) {
                    this.log('debug', '页面获得焦点，触发同步检查');
                    this.syncAllData();
                    focusThrottleTimer = setTimeout(() => {
                        focusThrottleTimer = null;
                    }, 5000); // 5秒内只触发一次
                }
            });
            
            // 监听统一的资料更新事件
            window.addEventListener('unifiedProfileUpdated', (e) => {
                this.log('debug', '收到统一资料更新事件');
                const profile = e.detail?.profile;
                if (profile) {
                    this.updateProfileDisplay(profile);
                }
            });
            
            // 监听页面卸载，清理资源
            window.addEventListener('beforeunload', () => {
                this.log('debug', '页面即将卸载，执行清理');
                // 可以在这里执行一些清理工作
            });
            
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
                // 为了向后兼容，也处理旧的键名
                case 'userProfileData':
                case 'core_user_profile':
                case 'ultimate_user_profile':
                    this.log('debug', '检测到旧版用户资料变化，触发同步');
                    this.syncUserData();
                    break;
            }
        } catch (error) {
            this.log('error', '处理存储变化事件失败:', error);
        }
    }
    
    // 发布-订阅模式方法
    subscribe(eventName, callback) {
        if (!this.subscribers[eventName]) {
            this.subscribers[eventName] = [];
        }
        this.subscribers[eventName].push(callback);
        // 返回取消订阅函数
        return () => this.unsubscribe(eventName, callback);
    }
    
    unsubscribe(eventName, callback) {
        if (this.subscribers[eventName]) {
            this.subscribers[eventName] = this.subscribers[eventName].filter(cb => cb !== callback);
        }
    }
    
    notifySubscribers(eventName, data = null) {
        if (this.subscribers[eventName]) {
            this.subscribers[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.log('error', `通知订阅者失败 [${eventName}]:`, error);
                }
            });
        }
    }
    
    // 设置定期同步
    scheduleNextSync() {
        setTimeout(() => {
            this.syncAllData();
            this.scheduleNextSync(); // 递归设置下一次同步
        }, this.config.syncInterval);
    }
    
    // 全量同步
    async syncAllData() {
        if (this.state.isSyncing) {
            this.log('debug', '全量同步已在进行中，跳过');
            return;
        }
        
        this.state.isSyncing = true;
        try {
            this.log('debug', '开始全量同步...');
            
            // 同步用户资料
            await this.syncUserData();
            
            // 同步分析历史
            await this.syncAnalysisHistory();
            
            // 更新同步时间
            this.updateSyncTimestamp();
            
            this.log('debug', '全量同步完成');
        } catch (error) {
            this.log('error', '全量同步失败:', error);
            this.state.lastSyncError = error;
        } finally {
            this.state.isSyncing = false;
        }
    }
    
    // 同步用户资料
    async syncUserData() {
        try {
            // 首先尝试通过API获取最新资料
            if (this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const profile = await this.apiService.getUserProfile();
                    if (profile) {
                        // 保存到本地存储
                        this.saveProfile(profile);
                        // 更新页面显示
                        this.updateProfileDisplay(profile);
                        this.log('debug', '通过API同步用户资料成功');
                        return profile;
                    }
                } catch (apiError) {
                    this.log('warn', 'API获取用户资料失败，使用本地备份:', apiError);
                    // API失败时降级到本地存储
                }
            }
            
            // 从本地存储获取
            const profile = this.getProfile();
            if (profile) {
                // 更新页面显示
                this.updateProfileDisplay(profile);
                this.log('debug', '通过本地存储同步用户资料成功');
                return profile;
            }
            
            this.log('debug', '未找到用户资料');
            return null;
        } catch (error) {
            this.log('error', '同步用户资料失败:', error);
            return null;
        }
    }
    
    // 同步分析历史
    async syncAnalysisHistory() {
        try {
            // 首先尝试通过API获取最新分析历史
            if (this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const records = await this.apiService.getAnalysisRecords(this.config.maxHistoryRecords, 0);
                    if (records && records.length > 0) {
                        // 转换API返回的数据格式
                        const formattedRecords = records.map(record => ({
                            id: record.id,
                            score: record.score,
                            analysisData: record.analysis_data || {},
                            timestamp: record.timestamp
                        }));
                        
                        // 保存到本地存储
                        this.saveAnalysisHistory(formattedRecords);
                        // 通知订阅者
                        this.notifySubscribers('analysisHistoryUpdated', formattedRecords);
                        this.log('debug', '通过API同步分析历史成功');
                        return formattedRecords;
                    }
                } catch (apiError) {
                    this.log('warn', 'API获取分析历史失败，使用本地备份:', apiError);
                    // API失败时降级到本地存储
                }
            }
            
            // 从本地存储获取
            const history = this.getAnalysisHistory();
            if (history) {
                // 通知订阅者
                this.notifySubscribers('analysisHistoryUpdated', history);
                this.log('debug', '通过本地存储同步分析历史成功');
                return history;
            }
            
            return [];
        } catch (error) {
            this.log('error', '同步分析历史失败:', error);
            return [];
        }
    }
    
    // 获取用户资料
    getProfile() {
        try {
            const profileData = this.secureStorage.getItem(this.storageKeys.profile);
            return profileData ? JSON.parse(profileData) : null;
        } catch (error) {
            this.log('error', '获取用户资料失败:', error);
            return null;
        }
    }
    
    // 保存用户资料
    saveProfile(profile) {
        try {
            const profileToSave = {
                id: profile.id || 'currentUser',
                ...profile,
                updatedAt: new Date().toISOString()
            };
            
            // 保存到本地存储
            this.secureStorage.setItem(this.storageKeys.profile, profileToSave);
            
            // 为了向后兼容，也保存到旧的键名
            this.secureStorage.setItem('userProfileData', profileToSave);
            
            // 触发同步触发器
            this.triggerSync();
            
            this.log('debug', '保存用户资料成功');
            return profileToSave;
        } catch (error) {
            this.log('error', '保存用户资料失败:', error);
            throw error;
        }
    }
    
    // 获取分析历史
    getAnalysisHistory() {
        try {
            const historyData = this.secureStorage.getItem(this.storageKeys.analysisHistory);
            const history = historyData ? JSON.parse(historyData) : [];
            return history.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            this.log('error', '获取分析历史失败:', error);
            return [];
        }
    }
    
    // 保存分析历史
    saveAnalysisHistory(history) {
        try {
            // 限制记录数量
            const limitedHistory = history.slice(0, this.config.maxHistoryRecords);
            this.secureStorage.setItem(this.storageKeys.analysisHistory, limitedHistory);
            
            this.log('debug', '保存分析历史成功');
            return limitedHistory;
        } catch (error) {
            this.log('error', '保存分析历史失败:', error);
            throw error;
        }
    }
    
    // 更新页面显示
    updateProfileDisplay(profile) {
        if (!profile) return;
        
        this.log('debug', '更新页面显示的用户资料');
        
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
        
        // 通知订阅者
        this.notifySubscribers('profileUpdated', profile);
        
        // 触发自定义事件
        const event = new CustomEvent('unifiedProfileUpdated', {
            detail: { profile, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }
    
    // 触发全局同步
    triggerSync(profileData = null) {
        const timestamp = Date.now();
        
        // 如果提供了资料数据，保存它
        if (profileData) {
            this.saveProfile(profileData);
        }
        
        // 设置同步触发器
        this.secureStorage.setItem(this.storageKeys.syncTrigger, timestamp.toString());
        this.secureStorage.setItem(this.storageKeys.lastSyncTime, timestamp.toString());
        
        this.log('debug', '触发全局同步');
    }
    
    // 更新同步时间戳
    updateSyncTimestamp() {
        const timestamp = Date.now();
        this.state.lastSyncTime = timestamp;
        this.secureStorage.setItem(this.storageKeys.lastSyncTime, timestamp.toString());
    }
    
    // 更新用户资料（对外API）
    async updateUserProfile(profileData) {
        try {
            let savedProfile;
            
            // 优先使用API
            if (this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const updateData = {
                        fullname: profileData.fullname,
                        avatar: profileData.avatar,
                        gender: profileData.gender,
                        age: profileData.age,
                        occupation: profileData.occupation,
                        bio: profileData.bio,
                        interests: profileData.interests,
                        concerns: profileData.concerns
                    };
                    
                    savedProfile = await this.apiService.updateUserProfile(updateData);
                    this.log('debug', '通过API更新用户资料成功');
                } catch (apiError) {
                    this.log('warn', 'API更新用户资料失败，使用本地备份:', apiError);
                    // API失败时降级到本地存储
                }
            }
            
            // 保存到本地并触发同步
            const finalProfile = this.saveProfile(savedProfile || profileData);
            
            return finalProfile;
        } catch (error) {
            this.log('error', '更新用户资料失败:', error);
            throw error;
        }
    }
}

// 创建全局实例
const unifiedSyncManager = new UnifiedSyncManager();

// 导出为全局变量
window.unifiedSyncManager = unifiedSyncManager;
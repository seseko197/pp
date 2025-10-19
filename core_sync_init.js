// core_sync_init.js - 统一同步系统初始化文件
// 功能：管理统一同步管理器的加载、迁移助手和系统配置

// 系统配置
const coreSyncConfig = {
    disableLegacy: true, // 禁用旧系统
    enableCompatibility: true, // 保持兼容性
    debugMode: typeof window !== 'undefined' && window.location && 
              (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
    useUnifiedSyncManager: true, // 使用新的统一同步管理器
    timeout: 8000,
    retryAttempts: 3
};

/**
 * 增强的日志工具
 */
const logger = {
    log: (...args) => {
        if (coreSyncConfig.debugMode) {
            console.log(`[UnifiedSyncInit] ${new Date().toLocaleTimeString()} [INFO]`, ...args);
        }
    },
    warn: (...args) => {
        if (coreSyncConfig.debugMode) {
            console.warn(`[UnifiedSyncInit] ${new Date().toLocaleTimeString()} [WARN]`, ...args);
        }
    },
    error: (...args) => {
        console.error(`[UnifiedSyncInit] ${new Date().toLocaleTimeString()} [ERROR]`, ...args);
    }
};

// 导出日志工具供其他模块使用
window.unifiedSyncLogger = window.unifiedSyncLogger || logger;

/**
 * 禁用旧的同步系统
 */
function disableLegacySyncSystems() {
    if (!coreSyncConfig.disableLegacy) return;
    
    logger.log('开始禁用旧同步系统...');
    
    try {
        // 标记旧系统禁用状态
        window.syncSystemConfig = {
            useUnifiedSyncManager: true,
            legacyDisabled: true,
            unifiedSyncEnabled: true
        };
        
        // 安全检查localStorage
        if (typeof localStorage !== 'undefined') {
            // 清理旧系统的触发键和心跳键
            const legacyKeys = [
                'legacy_sync_trigger', 
                'ultimate_sync_trigger', 
                'ultimate_sync_timestamp', 
                'ultimate_sync_heartbeat',
                'core_sync_trigger',
                'unified_sync_trigger', // 我们需要在首次运行时清理，确保新系统正确初始化
                'core_user_profile',
                'ultimate_user_profile'
            ];
            
            legacyKeys.forEach(key => {
                try {
                    if (localStorage.getItem(key)) {
                        localStorage.removeItem(key);
                        logger.log(`已清理旧系统键: ${key}`);
                    }
                } catch (e) {
                    logger.warn(`清理键 ${key} 失败:`, e);
                }
            });
        }
        
        // 覆盖旧系统的全局变量，防止它们重新初始化
        try {
            window.userProfileSync = null;
            window.ultimateSyncSystem = null;
            window.unifiedSyncSystem = null;
            window.coreSyncSystem = null;
            window.syncInterval = null;
        } catch (e) {
            logger.warn('重置全局变量失败:', e);
        }
        
        // 移除旧系统可能添加的事件监听器（通过重写方法）
        const originalAddEventListener = window.addEventListener;
        if (typeof originalAddEventListener === 'function') {
            window.addEventListener = function(eventName, callback, options) {
                // 只允许统一同步系统的事件
                const allowedEvents = [
                    'unifiedProfileUpdated', 
                    'analysisHistoryUpdated'
                ];
                
                const blockedEvents = [
                    'userProfileUpdated', 
                    'ultimateProfileUpdated',
                    'coreProfileUpdated'
                ];
                
                if (blockedEvents.includes(eventName) && coreSyncConfig.disableLegacy) {
                    logger.log(`已阻止旧系统事件监听器: ${eventName}`);
                    return;
                }
                
                return originalAddEventListener.call(this, eventName, callback, options);
            };
        }
        
        logger.log('旧同步系统禁用完成');
    } catch (error) {
        logger.error('禁用旧同步系统失败:', error);
    }
}

/**
 * 加载统一同步管理器
 */
async function loadUnifiedSyncManager() {
    if (!coreSyncConfig.useUnifiedSyncManager) return;
    
    logger.log('开始加载统一同步管理器...');
    
    try {
        // 动态加载统一同步管理器脚本
        const script = document.createElement('script');
        script.src = 'unified_sync_manager.js';
        script.async = false; // 确保同步加载
        
        // 等待脚本加载完成
        const scriptLoaded = new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('统一同步管理器脚本加载失败'));
        });
        
        document.head.appendChild(script);
        await scriptLoaded;
        
        // 等待统一同步管理器初始化完成
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            if (window.unifiedSyncManager && window.unifiedSyncManager.state && window.unifiedSyncManager.state.initialized) {
                logger.log('统一同步管理器初始化完成');
                break;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!window.unifiedSyncManager) {
            throw new Error('统一同步管理器未成功初始化');
        }
        
        logger.log('统一同步管理器加载成功');
        return window.unifiedSyncManager;
    } catch (error) {
        logger.error('加载统一同步管理器失败:', error);
        throw error;
    }
}

/**
 * 加载同步迁移助手
 */
async function loadSyncMigrationHelper() {
    logger.log('开始加载同步迁移助手...');
    
    try {
        // 检查是否已经加载
        if (window.syncMigrationHelper) {
            logger.log('同步迁移助手已加载');
            return window.syncMigrationHelper;
        }
        
        // 动态加载同步迁移助手脚本
        const script = document.createElement('script');
        script.src = 'sync_migration_helper.js';
        script.async = false; // 确保同步加载
        
        // 等待脚本加载完成
        const scriptLoaded = new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('同步迁移助手脚本加载失败'));
        });
        
        document.head.appendChild(script);
        await scriptLoaded;
        
        if (!window.syncMigrationHelper) {
            throw new Error('同步迁移助手加载失败: 没有找到window.syncMigrationHelper');
        }
        
        logger.log('同步迁移助手加载成功');
        return window.syncMigrationHelper;
    } catch (error) {
        logger.error('加载同步迁移助手失败:', error);
        throw error;
    }
}

/**
 * 初始化兼容性层，确保旧代码可以正常工作
 */
function setupCompatibilityLayer() {
    if (!coreSyncConfig.enableCompatibility) return;
    
    logger.log('设置兼容性层...');
    
    try {
        // 为旧代码提供兼容性访问点
        window.getUserProfile = () => {
            if (window.unifiedSyncManager) {
                return window.unifiedSyncManager.getProfile();
            }
            return null;
        };
        
        window.saveUserProfile = (profile) => {
            if (window.unifiedSyncManager) {
                return window.unifiedSyncManager.saveProfile(profile);
            }
            return false;
        };
        
        window.getAnalysisHistory = () => {
            if (window.unifiedSyncManager) {
                return window.unifiedSyncManager.getAnalysisHistory();
            }
            return [];
        };
        
        window.saveAnalysisHistory = (history) => {
            if (window.unifiedSyncManager) {
                return window.unifiedSyncManager.saveAnalysisHistory(history);
            }
            return false;
        };
        
        logger.log('兼容性层设置完成');
    } catch (error) {
        logger.error('设置兼容性层失败:', error);
    }
}

// 移除重复的initUnifiedSyncSystem函数定义

/**
 * 设置兼容性层，确保旧代码可以正常工作
 */
// 兼容性层现在由我们之前定义的setupCompatibilityLayer函数处理
// 保留一些必要的函数引用以确保兼容性
window.getProfileFromStorage = () => {
    if (window.unifiedSyncManager) {
        return window.unifiedSyncManager.getProfile();
    }
    try {
        if (typeof localStorage === 'undefined') return null;
        
        const keys = ['unified_user_profile', 'userProfileData'];
        for (const key of keys) {
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
        }
        return null;
    } catch (error) {
        logger.warn('从localStorage获取资料失败:', error);
        return null;
    }
};

window.saveProfileToStorage = (profile) => {
    if (window.unifiedSyncManager) {
        return window.unifiedSyncManager.saveProfile(profile);
    }
    try {
        if (typeof localStorage === 'undefined') return false;
        
        const userData = {
            id: 'currentUser',
            ...profile,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('unified_user_profile', JSON.stringify(userData));
        return true;
    } catch (error) {
        logger.warn('保存到localStorage失败:', error);
        return false;
    }
};

// 兼容旧的localDB接口 - 指向统一同步管理器
if (!window.localDB) {
    window.localDB = {
        getUserProfile: async () => {
            if (window.unifiedSyncManager) {
                return window.unifiedSyncManager.getProfile();
            }
            return window.getProfileFromStorage();
        },
        
        saveUserProfile: async (profile) => {
            if (window.unifiedSyncManager) {
                return window.unifiedSyncManager.saveProfile(profile);
            }
            throw new Error('统一同步管理器未初始化');
        },
        
        getAllAnalysisHistory: async () => {
            if (window.unifiedSyncManager) {
                return window.unifiedSyncManager.getAnalysisHistory();
            }
            if (typeof localStorage !== 'undefined') {
                const history = localStorage.getItem('analysisHistory');
                return history ? JSON.parse(history) : [];
            }
            return [];
        },
        
        addAnalysisRecord: async (record) => {
                try {
                    if (window.unifiedSyncManager) {
                        const currentHistory = window.unifiedSyncManager.getAnalysisHistory();
                        const updatedHistory = [record, ...currentHistory];
                        return window.unifiedSyncManager.saveAnalysisHistory(updatedHistory);
                    }
                    // 降级处理
                    if (typeof localStorage !== 'undefined') {
                        const history = localStorage.getItem('analysisHistory');
                        const records = history ? JSON.parse(history) : [];
                        records.unshift(record);
                        // 限制数量
                        const limitedRecords = records.slice(0, 100);
                        localStorage.setItem('analysisHistory', JSON.stringify(limitedRecords));
                        return true;
                    }
                    throw new Error('同步系统未初始化');
                } catch (error) {
                    logger.error('addAnalysisRecord出错:', error);
                    throw error;
                }
            },
            
            deleteAnalysisRecord: async (id) => {
                try {
                    if (window.coreSyncSystem && typeof window.coreSyncSystem.deleteAnalysisRecord === 'function') {
                        return window.coreSyncSystem.deleteAnalysisRecord(id);
                    }
                    // 简单降级处理
                    if (typeof localStorage !== 'undefined') {
                        const history = localStorage.getItem('analysisHistory');
                        if (history) {
                            const records = JSON.parse(history);
                            const filtered = records.filter(r => r.id != id); // 使用!=处理不同类型
                            localStorage.setItem('analysisHistory', JSON.stringify(filtered));
                            return true;
                        }
                    }
                    return false;
                } catch (error) {
                    logger.error('deleteAnalysisRecord出错:', error);
                    return false;
                }
            },
            
            subscribe: () => {
                // 简化的发布订阅实现
                const listeners = [];
                
                const subscribeFunc = (callback) => {
                    if (typeof callback === 'function') {
                        listeners.push(callback);
                    }
                    return () => {
                        const index = listeners.indexOf(callback);
                        if (index > -1) {
                            listeners.splice(index, 1);
                        }
                    };
                };
                
                return subscribeFunc;
            }
        };
        
        logger.log('创建了增强的兼容localDB对象');
    }
    
    // 兼容旧的同步桥接器
    window.syncBridge = {
        onProfileUpdated: (profileData) => {
            try {
                if (window.coreSyncSystem && typeof window.coreSyncSystem.saveUserProfile === 'function') {
                    return window.coreSyncSystem.saveUserProfile(profileData);
                }
                // 降级处理
                return saveProfileToStorage(profileData) ? profileData : null;
            } catch (error) {
                logger.error('syncBridge.onProfileUpdated出错:', error);
                return null;
            }
        },
        
        onAnalysisRecordAdded: (recordData) => {
            try {
                if (window.coreSyncSystem && typeof window.coreSyncSystem.addAnalysisRecord === 'function') {
                    return window.coreSyncSystem.addAnalysisRecord(recordData);
                }
                // 降级处理
                return window.localDB.addAnalysisRecord(recordData);
            } catch (error) {
                logger.error('syncBridge.onAnalysisRecordAdded出错:', error);
                return null;
            }
        },
        
        forceSync: () => {
            try {
                if (window.coreSyncSystem && typeof window.coreSyncSystem.syncAllData === 'function') {
                    logger.log('强制同步被调用');
                    window.coreSyncSystem.syncAllData();
                }
            } catch (error) {
                logger.error('syncBridge.forceSync出错:', error);
            }
        }
    };
    
    // 兼容旧的同步函数
    window.syncProfileData = () => {
        if (window.coreSyncSystem) {
            return window.coreSyncSystem.syncUserData();
        }
    };
    
    // 兼容旧的安全存储
        if (!window.secureStorage) {
            window.secureStorage = {
                getItem: (key) => {
                    if (window.coreSyncSystem) {
                        return window.coreSyncSystem.secureStorage.getItem(key);
                    }
                    return localStorage.getItem(key);
                },
                setItem: (key, value) => {
                    if (window.coreSyncSystem) {
                        return window.coreSyncSystem.secureStorage.setItem(key, value);
                    }
                    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                    return true;
                },
                removeItem: (key) => {
                    if (window.coreSyncSystem) {
                        return window.coreSyncSystem.secureStorage.removeItem(key);
                    }
                    localStorage.removeItem(key);
                    return true;
                }
            };
        }


/**
 * 加载核心同步系统脚本
 */
async function loadCoreSyncSystem() {
    logger.log('开始加载核心同步系统...');
    
    return new Promise((resolve, reject) => {
        try {
            // 安全检查
            if (typeof document === 'undefined' || typeof window === 'undefined') {
                logger.error('运行环境不支持，无法加载脚本');
                reject(new Error('运行环境不支持'));
                return;
            }
            
            // 检查核心系统是否已加载并初始化
            if (window.coreSyncSystem && window.coreSyncSystem.state && window.coreSyncSystem.state.initialized) {
                logger.log('核心同步系统已加载并初始化完成');
                resolve(window.coreSyncSystem);
                return;
            }
            
            // 检查脚本是否已添加到文档
            const existingScript = document.querySelector('script[src="core_sync_system.js"]');
            if (existingScript) {
                logger.log('发现已存在的核心同步系统脚本');
                // 轮询检查系统是否初始化完成
                let retries = 0;
                const maxRetries = 15; // 增加重试次数
                const checkInterval = setInterval(() => {
                    if (window.coreSyncSystem && window.coreSyncSystem.state && window.coreSyncSystem.state.initialized) {
                        clearInterval(checkInterval);
                        logger.log('检测到核心同步系统已初始化');
                        resolve(window.coreSyncSystem);
                    } else if (retries >= maxRetries) {
                        clearInterval(checkInterval);
                        logger.error('核心同步系统加载超时');
                        reject(new Error('核心同步系统加载超时'));
                    } else {
                        retries++;
                        logger.log(`等待核心同步系统初始化... (${retries}/${maxRetries})`);
                    }
                }, 300); // 稍微延长检查间隔
                
                return;
            }
            
            // 动态加载核心同步系统脚本
            const script = document.createElement('script');
            script.src = 'core_sync_system.js';
            script.async = false; // 同步加载以确保顺序执行
            
            script.onload = () => {
                logger.log('核心同步系统脚本加载完成');
                // 等待核心系统初始化
                let retries = 0;
                const maxRetries = 15;
                const checkInterval = setInterval(() => {
                    if (window.coreSyncSystem && window.coreSyncSystem.state && window.coreSyncSystem.state.initialized) {
                        clearInterval(checkInterval);
                        logger.log('核心同步系统初始化完成');
                        resolve(window.coreSyncSystem);
                    } else if (retries >= maxRetries) {
                        clearInterval(checkInterval);
                        logger.error('核心同步系统初始化超时');
                        reject(new Error('核心同步系统初始化超时'));
                    } else {
                        retries++;
                    }
                }, 300);
            };
            
            script.onerror = () => {
                logger.error('核心同步系统脚本加载失败');
                reject(new Error('核心同步系统脚本加载失败'));
            };
            
            // 立即插入到head中
            document.head.appendChild(script);
            logger.log('核心同步系统脚本已添加到文档');
        
        } catch (error) {
            logger.error('加载核心同步系统出错:', error);
            reject(error);
        }
    });
}

/**
 * 同步所有历史数据到新系统
 */
async function migrateAllData() {
    logger.log('开始数据迁移...');
    
    try {
        if (typeof localStorage === 'undefined') {
            logger.warn('localStorage不可用，跳过数据迁移');
            return;
        }
        
        const syncSystem = window.coreSyncSystem || window.unifiedSyncManager;
        if (!syncSystem) {
            logger.warn('同步系统不可用，跳过数据迁移');
            return;
        }
        
        // 迁移用户资料
        const profileKeys = ['userProfileData', 'unified_user_profile', 'ultimate_user_profile', 'currentUser', 'core_user_profile'];
        let migratedProfile = false;
        
        for (const key of profileKeys) {
            try {
                const profileData = localStorage.getItem(key);
                if (profileData) {
                    try {
                        const profile = JSON.parse(profileData);
                        if (profile && typeof profile === 'object') {
                            // 使用正确的方法保存配置文件
                            if (syncSystem.saveUserProfile) {
                                await syncSystem.saveUserProfile(profile);
                            } else if (syncSystem.saveProfile) {
                                await syncSystem.saveProfile(profile);
                            }
                            migratedProfile = true;
                            logger.log(`成功从键 ${key} 迁移用户资料`);
                            break;
                        }
                    } catch (parseError) {
                        logger.warn(`解析 ${key} 的数据失败:`, parseError);
                        // 尝试清理损坏的数据
                        localStorage.removeItem(key);
                    }
                }
            } catch (e) {
                logger.warn(`处理键 ${key} 时出错:`, e);
            }
        }
        
        // 迁移分析历史 - 确保使用正确的键名
        const historyKeys = ['analysisHistory', 'historyRecords', 'analysis_records'];
        
        for (const key of historyKeys) {
            try {
                const historyData = localStorage.getItem(key);
                if (historyData) {
                    try {
                        const records = JSON.parse(historyData);
                        if (Array.isArray(records) && records.length > 0) {
                            // 获取系统中的现有记录
                            let systemHistory = [];
                            try {
                                systemHistory = syncSystem.getAllAnalysisHistory ? 
                                    syncSystem.getAllAnalysisHistory() || [] : [];
                            } catch (e) {
                                logger.warn('获取系统历史记录失败:', e);
                            }
                            
                            // 如果系统还没有历史记录，则进行迁移
                            if (systemHistory.length === 0) {
                                // 限制记录数量
                                const maxRecords = 100;
                                const limitedRecords = records.slice(0, maxRecords);
                                
                                // 确保每条记录有必要的字段
                                const validRecords = limitedRecords.map(record => ({
                                    id: record.id || Date.now() + Math.random().toString(36).substr(2, 9),
                                    createdAt: record.createdAt || new Date().toISOString(),
                                    ...record
                                }));
                                
                                localStorage.setItem('analysisHistory', JSON.stringify(validRecords));
                                
                                logger.log(`成功迁移 ${validRecords.length} 条分析历史记录`);
                            }
                            break;
                        }
                    } catch (parseError) {
                        logger.warn(`解析 ${key} 的历史数据失败:`, parseError);
                        // 尝试清理损坏的数据
                        localStorage.removeItem(key);
                    }
                }
            } catch (e) {
                logger.warn(`处理历史键 ${key} 时出错:`, e);
            }
        }
        
        logger.log('数据迁移完成');
    } catch (error) {
        logger.error('数据迁移失败:', error);
    }
}

/**
 * 主初始化函数 - 统一同步系统初始化
 */
async function initUnifiedSyncSystem() {
    // 防止重复初始化
    if (window.unifiedSyncInitialized || window._coreSyncInitInProgress) {
        logger.log('统一同步系统已初始化或初始化进行中，跳过重复初始化');
        return window.unifiedSyncManager || window.coreSyncSystem;
    }
    
    // 标记初始化进行中
    window._coreSyncInitInProgress = true;
    logger.log('开始初始化统一同步系统...');
    
    try {
        // 1. 首先禁用旧系统
        disableLegacySyncSystems();
        
        // 2. 设置兼容性层
        setupCompatibilityLayer();
        
        // 3. 加载统一同步管理器（添加超时控制）
        const syncSystem = await Promise.race([
            loadUnifiedSyncManager(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('加载超时')), 8000))
        ]);
        
        // 4. 加载迁移助手
        await loadSyncMigrationHelper();
        
        // 5. 迁移历史数据
        await migrateAllData();
        
        // 6. 标记初始化完成
        window.unifiedSyncInitialized = true;
        window._coreSyncInitialized = true;
        
        // 7. 触发自定义事件通知系统已初始化完成
        try {
            window.dispatchEvent(new CustomEvent('unifiedSyncInitialized'));
            window.dispatchEvent(new CustomEvent('coreSyncInitialized')); // 保持向后兼容
            logger.log('已触发unifiedSyncInitialized事件');
        } catch (e) {
            logger.warn('触发初始化完成事件失败:', e);
        }
        
        logger.log('统一同步系统初始化完成');
        return syncSystem;
        
    } catch (error) {
        logger.error(`统一同步系统初始化失败: ${error.message}`);
        
        // 创建增强的备用同步系统
        if (!window.unifiedSyncManager && !window.coreSyncSystem) {
            logger.log('创建备用同步系统...');
            
            const backupSyncSystem = {
                state: { initialized: true },
                config: { maxHistoryRecords: 100 },
                storageKeys: { profile: 'core_user_profile', analysisHistory: 'analysisHistory' },
                
                // 安全存储封装
                secureStorage: {
                    getItem: (key) => {
                        try {
                            return localStorage.getItem(key);
                        } catch (e) {
                            logger.error(`获取存储失败 [${key}]:`, e);
                            return null;
                        }
                    },
                    setItem: (key, value) => {
                        try {
                            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                            localStorage.setItem(key, stringValue);
                            return true;
                        } catch (e) {
                            logger.error(`设置存储失败 [${key}]:`, e);
                            return false;
                        }
                    },
                    removeItem: (key) => {
                        try {
                            localStorage.removeItem(key);
                            return true;
                        } catch (e) {
                            logger.error(`删除存储失败 [${key}]:`, e);
                            return false;
                        }
                    }
                },
                
                // 核心方法实现
                saveUserProfile: (profile) => {
                    try {
                        const userData = {
                            id: 'currentUser',
                            ...profile,
                            updatedAt: new Date().toISOString()
                        };
                        localStorage.setItem('core_user_profile', JSON.stringify(userData));
                        return userData;
                    } catch (e) {
                        logger.error('保存用户资料失败:', e);
                        throw e;
                    }
                },
                
                getUserProfile: () => {
                    try {
                        const data = localStorage.getItem('core_user_profile');
                        return data ? JSON.parse(data) : null;
                    } catch (e) {
                        logger.error('获取用户资料失败:', e);
                        return null;
                    }
                },
                
                getAllAnalysisHistory: () => {
                    try {
                        const data = localStorage.getItem('analysisHistory');
                        return data ? JSON.parse(data) : [];
                    } catch (e) {
                        logger.error('获取分析历史失败:', e);
                        return [];
                    }
                },
                
                addAnalysisRecord: (record) => {
                    try {
                        const history = backupSyncSystem.getAllAnalysisHistory();
                        const newRecord = {
                            id: Date.now() + Math.random().toString(36).substr(2, 9),
                            createdAt: new Date().toISOString(),
                            ...record
                        };
                        history.unshift(newRecord);
                        const limitedHistory = history.slice(0, 100);
                        localStorage.setItem('analysisHistory', JSON.stringify(limitedHistory));
                        return newRecord;
                    } catch (e) {
                        logger.error('添加分析记录失败:', e);
                        throw e;
                    }
                },
                
                deleteAnalysisRecord: (id) => {
                    try {
                        const history = backupSyncSystem.getAllAnalysisHistory();
                        const filtered = history.filter(r => r.id != id);
                        localStorage.setItem('analysisHistory', JSON.stringify(filtered));
                        return true;
                    } catch (e) {
                        logger.error('删除分析记录失败:', e);
                        return false;
                    }
                },
                
                syncAllData: () => {
                    logger.log('备用系统同步数据（仅本地）');
                    // 简单触发事件通知
                    try {
                        window.dispatchEvent(new CustomEvent('coreProfileUpdated'));
                        window.dispatchEvent(new CustomEvent('coreAnalysisHistoryUpdated'));
                    } catch (e) {
                        logger.warn('触发同步事件失败:', e);
                    }
                },
                
                setEditingProfile: (status) => {
                    // 模拟编辑状态
                },
                
                // 统一同步管理器兼容方法
                saveProfile: function(profile) {
                    return this.saveUserProfile(profile);
                }
            };
            
            window.unifiedSyncManager = backupSyncSystem;
            window.coreSyncSystem = backupSyncSystem; // 保持向后兼容
        }
        
        // 即使失败也标记为初始化完成
        window.unifiedSyncInitialized = true;
        window._coreSyncInitialized = true;
        
        logger.log('备用同步系统已激活');
        return window.unifiedSyncManager || window.coreSyncSystem;
    } finally {
        // 清除进行中标记
        window._coreSyncInitInProgress = false;
    }
}

/**
 * 在DOMContentLoaded时的处理
 */
function handleDOMContentLoaded() {
    logger.log('DOMContentLoaded事件触发');
    
    // 确保同步系统已初始化
    if (!window.unifiedSyncInitialized && !window._coreSyncInitialized && 
        ((window.coreSyncSystem && window.coreSyncSystem.state && window.coreSyncSystem.state.initialized) ||
         (window.unifiedSyncManager && window.unifiedSyncManager.state && window.unifiedSyncManager.state.initialized))) {
        window.unifiedSyncInitialized = true;
        window._coreSyncInitialized = true;
        logger.log('DOMContentLoaded时检测到同步系统已初始化');
    }
    
    // 确保同步一次数据
    if (window.coreSyncSystem && typeof window.coreSyncSystem.syncAllData === 'function') {
        logger.log('DOMContentLoaded时触发数据同步');
        // 延迟一小段时间再同步，确保页面其他部分已加载
        setTimeout(() => {
            try {
                window.coreSyncSystem.syncAllData();
            } catch (error) {
                logger.error('DOMContentLoaded同步数据失败:', error);
            }
        }, 500);
    }
}

/**
 * 立即执行初始化
 */
function init() {
    logger.log('开始执行初始化...');
    
    // 异步初始化，避免阻塞页面渲染
    (async () => {
        try {
            // 延迟一小段时间再初始化，让页面先渲染
            await new Promise(resolve => setTimeout(resolve, 100));
            // 优先使用统一同步系统初始化
            if (typeof initUnifiedSyncSystem === 'function') {
                await initUnifiedSyncSystem();
            } else {
                await initializeCoreSync();
            }
        } catch (error) {
            logger.error('初始化过程出错:', error);
        }
    })();
    
    // 监听DOMContentLoaded事件
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
            logger.log('已添加DOMContentLoaded事件监听器');
        } else {
            // 如果DOM已经加载完成，直接执行
            logger.log('DOM已加载完成，直接触发处理');
            setTimeout(handleDOMContentLoaded, 0);
        }
    }
    
    // 添加页面卸载时的清理
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            logger.log('页面卸载，清理同步资源');
            // 清理可能的定时器等
        });
    }
}

// 初始化统一同步系统
if (typeof window !== 'undefined' && !window.unifiedSyncInitialized) {
    logger.log('初始化统一同步系统...');
    
    // 立即执行初始化，确保在DOMContentLoaded之前完成
    init();
}

// 导出统一同步管理器的引用，方便其他模块使用
window.getUnifiedSyncManager = () => {
    return window.unifiedSyncManager || null;
};

// 导出同步迁移助手的引用，方便其他模块使用
window.getSyncMigrationHelper = () => {
    return window.syncMigrationHelper || null;
};

// 确保在页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    try {
        if (window.unifiedSyncManager) {
            logger.log('页面卸载，清理同步资源');
            // 可以在这里添加任何必要的清理逻辑
        }
    } catch (error) {
        console.error('清理同步资源失败:', error);
    }
});

// 暴露关键函数供调试使用
if (typeof window !== 'undefined') {
    window.initUnifiedSyncSystem = initUnifiedSyncSystem;
    window.setupCompatibilityLayer = setupCompatibilityLayer;
    window.migrateAllData = migrateAllData;
    window.coreSyncConfig = coreSyncConfig;
}

// 注意：移除了ES模块导出，因为这是作为全局脚本引入的
// 核心同步系统通过全局变量window.coreSyncSystem暴露
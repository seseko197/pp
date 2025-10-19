// sync_migration_helper.js - 统一同步系统迁移助手
// 功能：帮助将旧系统数据迁移到新的统一同步管理器，并确保平滑过渡

/**
 * 检查是否使用统一同步管理器
 */
function isUsingUnifiedSync() {
    return window._unifiedSyncInitialized === true || 
           (window.syncSystemConfig && window.syncSystemConfig.useUnifiedSyncManager);
}

/**
 * 确保统一同步管理器已加载
 * @returns {Promise<Object>} 统一同步管理器实例
 */
async function ensureUnifiedSyncLoaded() {
    // 如果已经使用统一同步管理器，直接返回
    if (isUsingUnifiedSync() && window.unifiedSyncManager) {
        return Promise.resolve(window.unifiedSyncManager);
    }
    
    // 检查是否已经加载了初始化脚本
    const hasInitScript = document.querySelector('script[src="core_sync_init.js"]');
    
    if (!hasInitScript) {
        // 动态加载初始化脚本
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = 'core_sync_init.js';
                script.async = false;
                
                script.onload = () => {
                    // 等待统一同步管理器初始化完成
                    let retries = 0;
                    const maxRetries = 15;
                    const checkInterval = setInterval(() => {
                        if (window._unifiedSyncInitialized && window.unifiedSyncManager) {
                            clearInterval(checkInterval);
                            resolve(window.unifiedSyncManager);
                        } else if (retries >= maxRetries) {
                            clearInterval(checkInterval);
                            reject(new Error('统一同步管理器初始化超时'));
                        } else {
                            retries++;
                        }
                    }, 200);
                };
                
                script.onerror = () => {
                    reject(new Error('统一同步初始化脚本加载失败'));
                };
                
                document.head.appendChild(script);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 如果已经加载了脚本，等待初始化完成
    return new Promise((resolve, reject) => {
        if (window._unifiedSyncInitialized && window.unifiedSyncManager) {
            return resolve(window.unifiedSyncManager);
        }
        
        // 监听初始化事件
        const handleInit = () => {
            if (window.unifiedSyncManager) {
                resolve(window.unifiedSyncManager);
            } else {
                reject(new Error('统一同步管理器初始化失败'));
            }
        };
        
        window.addEventListener('unifiedSyncInitialized', handleInit, { once: true });
        
        // 设置超时
        setTimeout(() => {
            window.removeEventListener('unifiedSyncInitialized', handleInit);
            reject(new Error('统一同步管理器初始化超时'));
        }, 5000);
    });
}

/**
 * 替换旧的用户资料同步逻辑
 * @param {Function} callback - 可选的回调函数，接收用户资料数据
 * @returns {Promise<Object>} 用户资料
 */
async function syncUserProfile(callback) {
    try {
        const syncManager = await ensureUnifiedSyncLoaded();
        const profile = await syncManager.getUserProfile();
        
        // 执行回调
        if (typeof callback === 'function') {
            callback(profile);
        }
        
        // 触发旧的事件，保持兼容性
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
            detail: profile
        }));
        
        return profile;
    } catch (error) {
        // 静默处理错误
        console.error('同步用户资料失败:', error);
        
        // 降级处理
        try {
            const profile = localStorage.getItem('unified_user_profile');
            const parsedProfile = profile ? JSON.parse(profile) : null;
            
            if (typeof callback === 'function') {
                callback(parsedProfile);
            }
            
            return parsedProfile;
        } catch (e) {
            // 静默处理降级错误
            return null;
        }
    }
}

/**
 * 替换旧的分析历史同步逻辑
 * @param {Function} callback - 可选的回调函数，接收分析历史数据
 * @returns {Promise<Array>} 分析历史记录数组
 */
async function syncAnalysisHistory(callback) {
    try {
        const syncManager = await ensureUnifiedSyncLoaded();
        const history = await syncManager.getAllAnalysisHistory();
        
        // 执行回调
        if (typeof callback === 'function') {
            callback(history);
        }
        
        // 触发旧的事件，保持兼容性
        window.dispatchEvent(new CustomEvent('analysisHistoryUpdated', {
            detail: history
        }));
        
        return history;
    } catch (error) {
        // 静默处理错误
        console.error('同步分析历史失败:', error);
        
        // 降级处理
        try {
            const history = localStorage.getItem('analysisHistory');
            const parsedHistory = history ? JSON.parse(history) : [];
            
            if (typeof callback === 'function') {
                callback(parsedHistory);
            }
            
            return parsedHistory;
        } catch (e) {
            // 静默处理降级错误
            return [];
        }
    }
}

/**
 * 替换旧的保存用户资料逻辑
 * @param {Object} profileData - 用户资料数据
 * @returns {Promise<Object>} 保存后的用户资料
 */
async function saveUserProfileData(profileData) {
    try {
        const syncManager = await ensureUnifiedSyncLoaded();
        const savedProfile = await syncManager.saveUserProfile(profileData);
        
        // 触发旧的事件，保持兼容性
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
            detail: savedProfile
        }));
        
        return savedProfile;
    } catch (error) {
        // 静默处理错误
        console.error('保存用户资料失败:', error);
        
        // 降级处理
        try {
            localStorage.setItem('unified_user_profile', JSON.stringify(profileData));
            // 触发同步
            if (window.unifiedSyncManager) {
                window.unifiedSyncManager.syncAllData();
            }
            return profileData;
        } catch (e) {
            // 静默处理降级错误
            throw e;
        }
    }
}

/**
 * 替换旧的添加分析记录逻辑
 * @param {Object} recordData - 分析记录数据
 * @returns {Promise<Object>} 添加的记录
 */
async function addAnalysisHistoryRecord(recordData) {
    try {
        const syncManager = await ensureUnifiedSyncLoaded();
        
        // 确保记录有必要的字段
        const record = {
            id: recordData.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: recordData.timestamp || Date.now(),
            type: recordData.type || 'analysis',
            data: recordData.data || {},
            ...recordData
        };
        
        const addedRecord = await syncManager.addAnalysisRecord(record);
        
        // 触发旧的事件，保持兼容性
        window.dispatchEvent(new CustomEvent('analysisHistoryUpdated', {
            detail: await syncManager.getAllAnalysisHistory()
        }));
        
        return addedRecord;
    } catch (error) {
        // 静默处理错误
        console.error('添加分析记录失败:', error);
        
        // 降级处理
        try {
            const history = localStorage.getItem('analysisHistory');
            const records = history ? JSON.parse(history) : [];
            
            const record = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                type: 'analysis',
                data: {},
                ...recordData
            };
            
            records.unshift(record);
            
            // 限制数量
            if (records.length > 100) {
                records.splice(100);
            }
            
            localStorage.setItem('analysisHistory', JSON.stringify(records));
            // 触发同步
            if (window.unifiedSyncManager) {
                window.unifiedSyncManager.syncAllData();
            }
            return record;
        } catch (e) {
            // 静默处理降级错误
            throw e;
        }
    }
}

/**
 * 自动替换页面中的旧同步系统引用
 */
function autoReplaceLegacyReferences() {
    // 检查是否已经替换过
    if (window._legacyReferencesReplaced) return;
    
    // 监控可能的同步函数调用
    const syncFunctionNames = [
        'syncProfileData', 'syncUserData', 'updateUserProfile', 
        'refreshAnalysisHistory', 'syncAllData',
        'getUserProfile', 'saveUserProfile',
        'getAnalysisHistory', 'saveAnalysisHistory'
    ];
    
    // 检查并替换全局函数引用
    syncFunctionNames.forEach(funcName => {
        if (window[funcName] && typeof window[funcName] === 'function') {
            const originalFunction = window[funcName];
            window[funcName] = async function(...args) {
                try {
                    const syncManager = await ensureUnifiedSyncLoaded();
                    
                    // 根据函数名调用相应的统一同步管理器方法
                    if (funcName.includes('Profile')) {
                        if (funcName.includes('save') || funcName.includes('update')) {
                            return syncManager.saveUserProfile(args[0]);
                        } else {
                            return syncManager.getUserProfile();
                        }
                    } else if (funcName.includes('Analysis')) {
                        return syncManager.getAllAnalysisHistory();
                    } else if (funcName.includes('syncAll')) {
                        return syncManager.syncAllData();
                    } else {
                        // 默认行为
                        return syncManager.syncAllData();
                    }
                } catch (error) {
                    // 静默处理错误并回退到原始函数
                    console.warn('统一同步管理器调用失败，回退到原始函数:', error);
                    return originalFunction.apply(this, args);
                }
            };
        }
    });
    
    // 标记已替换
    window._legacyReferencesReplaced = true;
}

/**
 * 初始化迁移助手
 */
function initializeMigrationHelper() {
    // 立即替换旧的引用
    autoReplaceLegacyReferences();
    
    // 监听页面加载完成事件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // 确保统一同步管理器已加载
            ensureUnifiedSyncLoaded().catch(error => {
                console.warn('统一同步管理器初始化失败，将使用降级模式:', error);
            });
        });
    } else {
        // 如果DOM已经加载，立即执行
        ensureUnifiedSyncLoaded().catch(error => {
            console.warn('统一同步管理器初始化失败，将使用降级模式:', error);
        });
    }
}

/**
 * 导出公共API
 */
const migrationHelper = {
    ensureUnifiedSyncLoaded,
    syncUserProfile,
    syncAnalysisHistory,
    saveUserProfileData,
    addAnalysisHistoryRecord,
    isUsingUnifiedSync,
    initializeMigrationHelper
};

// 自动初始化
initializeMigrationHelper();

// 导出供其他模块使用
export default migrationHelper;
export { 
    ensureUnifiedSyncLoaded, 
    syncUserProfile, 
    syncAnalysisHistory,
    saveUserProfileData,
    addAnalysisHistoryRecord,
    isUsingUnifiedSync,
    initializeMigrationHelper
};
// init_sync_system.js - 统一同步系统初始化辅助文件
// 注意：此文件现在作为core_sync_init.js的补充，提供初始化支持

// 防止重复执行初始化
let syncSystemInitialized = false;

// 允许的用户资料键（保留这些键以确保各系统间的兼容性）
const profileKeys = [
    'userProfileUpdated',
    'ultimateProfileUpdated',
    'unifiedProfileUpdated',
    'unified_user_profile',
    'userProfileData',
    'ultimate_user_profile',
    'core_user_profile',
    'currentUser'
];

// 禁用旧的同步系统但保留关键功能
function disableLegacySyncSystems() {
    // 设置标志以协调同步系统
    window.syncSystemConfig = {
        useUnifiedSyncManager: true,
        legacyCompatibility: true,
        disableLegacy: true
    };
    
    // 清理旧系统的非关键键
    const legacyKeys = [
        'legacy_sync_trigger', 'ultimate_sync_trigger', 'ultimate_sync_timestamp', 
        'ultimate_sync_heartbeat', 'core_sync_trigger', 'sync_trigger', 
        'ultimate_sync_lock', 'core_sync_lock', 'sync_lock'
    ];
    legacyKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
        }
    });
    
    // 覆盖全局变量以防止旧系统初始化
    window.coreSyncSystem = null;
    window.ultimateSyncFix = null;
    window.unifiedSyncSystem = null;
}

// 应用安全修复
function applySecurityFixes() {
    // 实现安全的存储访问层
    window.secureStorage = {
        getItem: function(key) {
            try {
                const value = localStorage.getItem(key);
                // 仅在读取非JSON数据时进行HTML转义
                if (value && !profileKeys.includes(key) && !key.includes('analysis')) {
                    return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }
                return value;
            } catch (e) {
                // 静默处理错误
                return null;
            }
        },
        setItem: function(key, value) {
            try {
                // 确保值是字符串
                const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, stringValue);
            } catch (e) {
                // 静默处理错误
            }
        },
        removeItem: function(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                // 静默处理错误
            }
        },
        encrypt: function(text) {
            if (!text) return '';
            return btoa(unescape(encodeURIComponent(text)));
        },
        
        decrypt: function(encrypted) {
            if (!encrypted) return '';
            try {
                return decodeURIComponent(escape(atob(encrypted)));
            } catch (e) {
                return '';
            }
        },
        
        saveCredentials: function(username, password) {
            const credentials = {
                username: username,
                password: this.encrypt(password),
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('userCredentials', JSON.stringify(credentials));
        },
        
        getCredentials: function() {
            try {
                const credsStr = localStorage.getItem('userCredentials');
                if (credsStr) {
                    const creds = JSON.parse(credsStr);
                    return {
                        username: creds.username,
                        hasPassword: !!creds.password
                    };
                }
            } catch (e) {}
            return null;
        },
        
        verifyPassword: function(inputPassword) {
            try {
                const credsStr = localStorage.getItem('userCredentials');
                if (credsStr) {
                    const creds = JSON.parse(credsStr);
                    const storedPassword = this.decrypt(creds.password);
                    return storedPassword === inputPassword;
                }
            } catch (e) {}
            return false;
        }
    };
    
    // 修复明文密码
    try {
        const credsStr = localStorage.getItem('userCredentials');
        if (credsStr) {
            const creds = JSON.parse(credsStr);
            if (creds.password && !creds.password.startsWith('eyJ') && 
                creds.password.length < 100) {
                window.secureStorage.saveCredentials(creds.username, creds.password);
            }
        }
    } catch (e) {}
}

// 性能优化
function optimizePerformance() {
    // 仅在非开发环境中进行日志限制
    if (window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // 静默处理所有日志输出
        const originalConsoleLog = console.log;
        console.log = function() {
            // 完全禁用console.log
        };
    }
    
    // 优化DOM查询
    window.optimizedQuerySelector = function(selector) {
        if (selector.startsWith('#') && !selector.includes(' ')) {
            return document.getElementById(selector.substring(1));
        }
        return document.querySelector(selector);
    };
    
    // 批处理DOM更新
    window.batchUpdateDOM = function(updates) {
        if (!Array.isArray(updates)) return;
        
        updates.forEach(update => {
            const element = document.querySelector(update.selector);
            if (element) {
                if (update.property === 'textContent') {
                    element.textContent = update.value;
                } else if (update.property === 'innerHTML') {
                    if (window.secureStorage && window.secureStorage.sanitize) {
                        element.innerHTML = window.secureStorage.sanitize(update.value);
                    } else {
                        element.innerHTML = update.value;
                    }
                } else if (update.property === 'className') {
                    element.className = update.value;
                } else if (update.property === 'style') {
                    Object.assign(element.style, update.value);
                } else if (update.property === 'attributes') {
                    Object.entries(update.value).forEach(([key, value]) => {
                        element.setAttribute(key, value);
                    });
                }
            }
        });
    };
}

// 立即加载统一同步管理器脚本
function loadUnifiedSyncScript() {
    return new Promise((resolve, reject) => {
        try {
            // 检查脚本是否已加载
            if (document.querySelector('script[src="unified_sync_manager.js"]')) {
                resolve();
                return;
            }
            
            // 动态加载统一同步管理器
            const script = document.createElement('script');
            script.src = 'unified_sync_manager.js';
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error('加载统一同步管理器脚本失败'));
            };
            // 立即插入到head中，不等待DOMContentLoaded
            document.head.appendChild(script);
        } catch (error) {
            reject(error);
        }
    });
}

// 设置同步系统间的协调机制
function setupSyncCoordination() {
    // 创建同步桥接器，确保所有系统都能接收更新
    window.syncBridge = {
        // 当任何系统更新用户资料时调用
        onProfileUpdated: function(profileData) {
            // 确保统一同步系统存在并更新
            if (window.unifiedSyncSystem) {
                try {
                    window.unifiedSyncSystem.saveUserProfile(profileData);
                } catch (e) {
                    // 静默处理错误
                }
            }
            
            // 同时更新旧系统的存储键以确保兼容性
            try {
                localStorage.setItem('userProfileData', JSON.stringify(profileData));
                // 触发旧系统的更新事件
                const timestamp = Date.now().toString();
                localStorage.setItem('userProfileUpdated', timestamp);
                setTimeout(() => {
                    localStorage.removeItem('userProfileUpdated');
                }, 100);
            } catch (e) {
                // 静默处理错误
            }
        },
        
        // 当添加分析历史记录时调用
        onAnalysisRecordAdded: function(recordData) {
            // 确保统一同步系统存在并更新分析历史
            if (window.unifiedSyncSystem && typeof window.unifiedSyncSystem.addAnalysisRecord === 'function') {
                try {
                    window.unifiedSyncSystem.addAnalysisRecord(recordData);
                } catch (e) {
                    // 静默处理错误
                }
            }
            
            // 同时确保分析历史记录正确保存到localStorage
            try {
                // 获取现有历史记录
                let historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
                // 添加新记录到开头
                historyRecords.unshift(recordData);
                // 限制历史记录数量，最多保存100条
                const limitedRecords = historyRecords.slice(0, 100);
                localStorage.setItem('analysisHistory', JSON.stringify(limitedRecords));
                
                // 触发分析历史更新事件
                const timestamp = Date.now().toString();
                localStorage.setItem('analysisHistoryUpdated', timestamp);
                setTimeout(() => {
                    localStorage.removeItem('analysisHistoryUpdated');
                }, 100);
            } catch (e) {
                // 静默处理错误
            }
        },
        
        // 强制同步所有页面
        forceSync: function() {
            // 使用统一同步系统的触发机制
            if (window.unifiedSyncSystem) {
                try {
                    window.unifiedSyncSystem.triggerSync();
                } catch (e) {
                    // 静默处理错误
                }
            }
            
            // 同时触发旧系统的同步
            try {
                const timestamp = Date.now().toString();
                localStorage.setItem('unified_sync_trigger', timestamp);
            } catch (e) {
                // 静默处理错误
            }
        }
    };
    
    // 添加全局事件转发机制
    window.addEventListener('unifiedProfileUpdated', (e) => {
        // 转发到旧系统事件
        const profile = e.detail?.profile;
        if (profile) {
            // 触发旧系统的更新事件
            localStorage.setItem('userProfileUpdated', Date.now().toString());
            setTimeout(() => {
                localStorage.removeItem('userProfileUpdated');
            }, 100);
        }
    });
    
    // 监听旧系统的更新事件并转发到统一系统
    window.addEventListener('storage', (e) => {
        if (e.key === 'userProfileUpdated' && window.unifiedSyncSystem) {
            // 延迟一下确保数据已保存
            setTimeout(() => {
                window.unifiedSyncSystem.syncUserData();
            }, 50);
        } else if (e.key === 'analysisHistoryUpdated' && window.unifiedSyncSystem) {
            // 延迟一下确保数据已保存
            setTimeout(() => {
                if (typeof window.unifiedSyncSystem.syncAnalysisHistory === 'function') {
                    window.unifiedSyncSystem.syncAnalysisHistory();
                } else {
                    window.unifiedSyncSystem.syncAllData();
                }
            }, 50);
        }
    });
}

// 立即初始化统一同步系统，不等待DOMContentLoaded
async function initializeUnifiedSync() {
    try {
        // 立即加载脚本
        await loadUnifiedSyncScript();
        
        // 等待统一同步系统初始化
        let retries = 0;
        const maxRetries = 5;
        const checkSyncSystem = setInterval(() => {
            if (window.unifiedSyncSystem) {
                clearInterval(checkSyncSystem);
                // 立即同步一次
                window.unifiedSyncSystem.syncAllData();
                
                // 确保本地存储中的用户资料数据同步
                const syncProfile = () => {
                    // 检查是否有用户资料数据
                    const profileKeysToCheck = ['unified_user_profile', 'userProfileData', 'ultimate_user_profile'];
                    for (const key of profileKeysToCheck) {
                        const profileData = localStorage.getItem(key);
                        if (profileData) {
                            try {
                                const profile = JSON.parse(profileData);
                                window.unifiedSyncSystem.saveUserProfile(profile);
                                break;
                            } catch (e) {
                                // 静默处理错误
                            }
                        }
                    }
                };
                
                // 延迟一点时间确保DOM已部分加载
                setTimeout(syncProfile, 300);
            } else if (retries >= maxRetries) {
                clearInterval(checkSyncSystem);
                // 静默处理超时
            } else {
                retries++;
            }
        }, 200);
        
    } catch (error) {
        // 静默处理错误
    }
}

// 主初始化函数
function initializeSyncSystem() {
    if (syncSystemInitialized) {
        return;
    }
    
    syncSystemInitialized = true;
    window._unifiedSyncInitialized = true; // 保持兼容性
    
    // 首先配置同步系统
    disableLegacySyncSystems();
    
    // 设置同步协调机制
    setupSyncCoordination();
    
    // 应用安全修复
    applySecurityFixes();
    
    // 性能优化
    optimizePerformance();
    
    // 立即初始化统一同步系统，不等待DOMContentLoaded
    initializeUnifiedSync();
    
    // 在DOMContentLoaded时再次确认同步系统状态
    document.addEventListener('DOMContentLoaded', () => {
        // 确保统一同步系统已初始化
        if (!window.unifiedSyncSystem) {
            initializeUnifiedSync();
        } else {
            // 再次同步以确保DOM已完全加载后更新UI
            window.unifiedSyncSystem.syncAllData();
        }
        
        // 确保在页面加载完成后也能接收到同步事件
        window.addEventListener('unifiedProfileUpdated', () => {
            // 静默处理
        });
    });
}

// 立即执行初始化，不等待任何事件
initializeSyncSystem();
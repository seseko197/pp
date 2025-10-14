// 本地数据库管理模块 - 使用IndexedDB实现持久化存储

class LocalDB {
    constructor() {
        this.dbName = 'DepressionAnalysisDB';
        this.dbVersion = 1;
        this.db = null;
        this.initPromise = this.init();
        
        // 发布-订阅模式实现页面间数据同步
        this.subscribers = {}
        
        // 监听localStorage变化，实现跨页面通信
        window.addEventListener('storage', (event) => {
            if (event.key === 'userProfileUpdated' && event.newValue === 'true') {
                this.notifySubscribers('profileUpdated');
                // 重置标志位
                localStorage.setItem('userProfileUpdated', 'false');
            }
        });
    }
    
    // 订阅事件
    subscribe(eventName, callback) {
        if (!this.subscribers[eventName]) {
            this.subscribers[eventName] = [];
        }
        this.subscribers[eventName].push(callback);
        return () => this.unsubscribe(eventName, callback);
    }
    
    // 取消订阅
    unsubscribe(eventName, callback) {
        if (this.subscribers[eventName]) {
            this.subscribers[eventName] = this.subscribers[eventName].filter(cb => cb !== callback);
        }
    }
    
    // 通知所有订阅者
    notifySubscribers(eventName, data = null) {
        if (this.subscribers[eventName]) {
            this.subscribers[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('订阅者回调执行失败:', error);
                }
            });
        }
    }
    
    // 触发全局配置更新事件（通知其他页面）
    triggerGlobalUpdate(eventName) {
        // 在当前页面触发通知
        this.notifySubscribers(eventName);
        
        // 通过localStorage通知其他页面
        localStorage.setItem('userProfileUpdated', 'false');
        setTimeout(() => {
            localStorage.setItem('userProfileUpdated', 'true');
        }, 0);
    }

    // 初始化数据库
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建用户资料表
                if (!db.objectStoreNames.contains('userProfile')) {
                    const userStore = db.createObjectStore('userProfile', { keyPath: 'id' });
                    userStore.createIndex('email', 'email', { unique: true });
                }

                // 创建分析历史记录表
                if (!db.objectStoreNames.contains('analysisHistory')) {
                    const historyStore = db.createObjectStore('analysisHistory', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                    historyStore.createIndex('date', 'date', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('数据库初始化成功');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('数据库初始化失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // 等待数据库初始化完成
    async waitForInit() {
        if (!this.initPromise) {
            this.initPromise = this.init();
        }
        return this.initPromise;
    }

    // 执行数据库事务
    async transaction(storeName, mode, callback) {
        await this.waitForInit();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(storeName, mode);
                const store = transaction.objectStore(storeName);
                
                const result = callback(store);
                
                transaction.oncomplete = () => {
                    resolve(result);
                };
                
                transaction.onerror = (event) => {
                    console.error('事务执行失败:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    // ========== 用户资料相关方法 ==========

    // 获取用户资料
    async getUserProfile() {
        return this.transaction('userProfile', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    // 如果有用户资料，返回第一个（默认只有一个用户）
                    resolve(request.result.length > 0 ? request.result[0] : null);
                };
                request.onerror = () => reject(request.error);
            });
        });
    }

    // 保存用户资料
    async saveUserProfile(profile) {
        // 确保profile有id
        const userData = {
            id: 'currentUser',
            ...profile,
            updatedAt: new Date().toISOString()
        };
        
        return this.transaction('userProfile', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.put(userData);
                request.onsuccess = () => {
                    console.log('用户资料保存成功');
                    // 触发全局更新事件，通知所有页面用户资料已更新
                    this.triggerGlobalUpdate('profileUpdated');
                    
                    // 同时使用终极同步系统触发同步
                    if (window.ultimateSyncSystem) {
                        console.log('✅ 通过终极同步系统触发全局更新');
                        window.ultimateSyncSystem.triggerGlobalSync(userData);
                    }
                    
                    resolve(userData);
                };
                request.onerror = () => {
                    console.error('用户资料保存失败:', request.error);
                    reject(request.error);
                };
            });
        });
    }

    // ========== 分析历史相关方法 ==========

    // 获取所有分析历史
    async getAllAnalysisHistory() {
        return this.transaction('analysisHistory', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    // 按时间戳降序排序（最新的在前）
                    const sortedResults = request.result.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(sortedResults);
                };
                request.onerror = () => reject(request.error);
            });
        });
    }

    // 添加分析历史记录
    async addAnalysisRecord(record) {
        const recordData = {
            ...record,
            timestamp: record.timestamp || Date.now(),
            createdAt: new Date().toISOString()
        };
        
        return this.transaction('analysisHistory', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.add(recordData);
                request.onsuccess = () => {
                    console.log('分析记录添加成功');
                    resolve({ id: request.result, ...recordData });
                };
                request.onerror = () => {
                    console.error('分析记录添加失败:', request.error);
                    reject(request.error);
                };
            });
        });
    }

    // 删除分析历史记录
    async deleteAnalysisRecord(id) {
        return this.transaction('analysisHistory', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => {
                    console.log('分析记录删除成功');
                    resolve(true);
                };
                request.onerror = () => {
                    console.error('分析记录删除失败:', request.error);
                    reject(request.error);
                };
            });
        });
    }

    // 批量删除分析历史记录
    async batchDeleteAnalysisRecords(ids) {
        return this.transaction('analysisHistory', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                let deletedCount = 0;
                const totalCount = ids.length;
                
                const checkComplete = () => {
                    if (deletedCount === totalCount) {
                        console.log(`成功删除 ${totalCount} 条记录`);
                        resolve(totalCount);
                    }
                };
                
                ids.forEach(id => {
                    const request = store.delete(id);
                    request.onsuccess = () => {
                        deletedCount++;
                        checkComplete();
                    };
                    request.onerror = (event) => {
                        console.error(`删除记录 ${id} 失败:`, event.target.error);
                        // 继续尝试删除其他记录
                        deletedCount++;
                        checkComplete();
                    };
                });
            });
        });
    }

    // 清空所有分析历史
    async clearAllAnalysisHistory() {
        return this.transaction('analysisHistory', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => {
                    console.log('所有分析历史已清空');
                    resolve(true);
                };
                request.onerror = () => reject(request.error);
            });
        });
    }

    // 从localStorage迁移数据到IndexedDB
    async migrateFromLocalStorage() {
        try {
            // 迁移用户资料（如果有）
            const existingUserProfile = await this.getUserProfile();
            if (!existingUserProfile) {
                // 这里可以添加从localStorage迁移用户资料的逻辑
                // 由于当前应用没有实际保存用户资料到localStorage，暂时跳过
            }

            // 迁移分析历史
            const existingHistory = await this.getAllAnalysisHistory();
            if (existingHistory.length === 0) {
                // 尝试从localStorage读取历史记录，使用正确的键名'analysisHistory'
                const localStorageRecords = localStorage.getItem('analysisHistory');
                if (localStorageRecords) {
                    try {
                        const records = JSON.parse(localStorageRecords);
                        if (Array.isArray(records) && records.length > 0) {
                            console.log(`开始从localStorage迁移 ${records.length} 条分析记录`);
                            for (const record of records) {
                                await this.addAnalysisRecord(record);
                            }
                            console.log('迁移完成');
                        }
                    } catch (e) {
                        console.error('解析localStorage数据失败:', e);
                    }
                }
            }
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }
}

// 创建全局实例
const localDB = new LocalDB();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = localDB;
} else {
    window.localDB = localDB;
}
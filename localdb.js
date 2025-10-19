// 数据库管理模块 - 集成后端API和localStorage备份（已集成到统一同步管理器）
// 功能：提供数据库操作接口，优先使用统一同步管理器，保留降级方案

class DBManager {
    constructor() {
        // 发布-订阅模式实现页面间数据同步
        this.subscribers = {};
        // API服务实例（如果可用）
        this.apiService = window.apiService || null;
        // 是否使用API（默认为true，API不可用时自动降级到localStorage）
        this.useApi = !!this.apiService;
        
        // 监听localStorage变化，实现跨页面通信
        window.addEventListener('storage', (event) => {
            const profileKey = this.getUserSpecificKey('userProfileData');
            const historyKey = this.getUserSpecificKey('analysisHistory');
            
            if (event.key === profileKey) {
                this.notifySubscribers('profileUpdated');
            } else if (event.key === historyKey) {
                this.notifySubscribers('analysisHistoryUpdated');
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
                    // 静默处理
                }
            });
        }
    }
    
    // 触发全局配置更新事件（通知其他页面）
    triggerGlobalUpdate(eventName) {
        // 在当前页面触发通知
        this.notifySubscribers(eventName);
    }

    // ========== 用户资料相关方法 ==========

    // 获取用户资料
    async getUserProfile() {
        try {
            // 优先使用统一同步管理器
            if (window.unifiedSyncManager) {
                console.log('使用统一同步管理器获取用户资料');
                return await window.unifiedSyncManager.getProfile();
            }
            
            // 降级方案：原有的API调用逻辑
            // 优先使用API
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const profile = await this.apiService.getUserProfile();
                    // 同时保存到localStorage作为备份
                    this._saveProfileToLocalStorage(profile);
                    return profile;
                } catch (apiError) {
                    console.warn('API获取用户资料失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 降级方案：从localStorage获取
            const profileKey = this.getUserSpecificKey('userProfileData');
            const profileData = localStorage.getItem(profileKey);
            return profileData ? JSON.parse(profileData) : null;
        } catch (error) {
            console.error('获取用户资料失败:', error);
            return null;
        }
    }

    // 保存用户资料
    async saveUserProfile(profile) {
        try {
            // 优先使用统一同步管理器
            if (window.unifiedSyncManager) {
                console.log('使用统一同步管理器保存用户资料');
                return await window.unifiedSyncManager.saveProfile(profile);
            }
            
            // 降级方案：原有的API调用逻辑
            let savedProfile;
            
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    // 传递所有个人资料字段到API
                    const updateData = {
                        fullname: profile.fullname,
                        avatar: profile.avatar,
                        gender: profile.gender,
                        age: profile.age,
                        occupation: profile.occupation,
                        bio: profile.bio,
                        interests: profile.interests,
                        concerns: profile.concerns
                    };
                    
                    console.log('向API传递的更新数据:', updateData);
                    savedProfile = await this.apiService.updateUserProfile(updateData);
                    console.log('API返回的更新结果:', savedProfile);
                } catch (apiError) {
                    console.warn('API保存用户资料失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 总是保存到localStorage作为备份
            const localProfile = {
                id: savedProfile?.id || 'currentUser',
                ...(savedProfile || profile),
                updatedAt: new Date().toISOString()
            };
            
            this._saveProfileToLocalStorage(localProfile);
            this.triggerGlobalUpdate('profileUpdated');
            
            return savedProfile || localProfile;
        } catch (error) {
            console.error('保存用户资料失败:', error);
            throw error;
        }
    }
    
    // 内部方法：保存用户资料到localStorage
    _saveProfileToLocalStorage(profile) {
        try {
            const profileKey = this.getUserSpecificKey('userProfileData');
            localStorage.setItem(profileKey, JSON.stringify(profile));
        } catch (error) {
            console.error('保存到localStorage失败:', error);
        }
    }

    // 获取用户特定的键名
    getUserSpecificKey(baseKey) {
        try {
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                const user = JSON.parse(currentUser);
                return `${baseKey}_${user.id || user.username || 'default'}`;
            }
        } catch (error) {
            console.error('获取用户特定键名失败:', error);
        }
        return `${baseKey}_default`;
    },
    
    // ========== 分析历史相关方法 ==========

    // 获取所有分析历史
    async getAllAnalysisHistory() {
        try {
            // 优先使用API
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const records = await this.apiService.getAnalysisRecords(100, 0);
                    // 转换API返回的数据格式以匹配前端期望格式
                    const formattedRecords = records.map(record => ({
                        id: record.id,
                        score: record.score,
                        analysisData: record.analysis_data || {},
                        timestamp: record.timestamp
                    }));
                    
                    // 同时保存到localStorage作为备份
                    this._saveHistoryToLocalStorage(formattedRecords);
                    return formattedRecords;
                } catch (apiError) {
                    console.warn('API获取分析历史失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 降级方案：从localStorage获取
            const historyKey = this.getUserSpecificKey('analysisHistory');
            const historyRecords = JSON.parse(localStorage.getItem(historyKey)) || [];
            return historyRecords.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('获取分析历史失败:', error);
            return [];
        }
    }
    
    // 根据ID获取分析记录
    async getAnalysisRecordById(id) {
        try {
            // 优先使用API
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const record = await this.apiService.getAnalysisRecord(id);
                    // 转换API返回的数据格式
                    const formattedRecord = {
                        id: record.id,
                        score: record.score,
                        analysisData: record.analysis_data || {},
                        timestamp: record.timestamp
                    };
                    return formattedRecord;
                } catch (apiError) {
                    console.warn('API获取分析记录失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 降级方案：从localStorage获取
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            
            // 尝试多种匹配方式
            let record = historyRecords.find(r => r.id === id || r.id == id);
            
            // 类型转换匹配
            if (!record) {
                if (typeof id === 'string') {
                    record = historyRecords.find(r => r.id === parseInt(id));
                } else if (typeof id === 'number') {
                    record = historyRecords.find(r => r.id === id.toString());
                }
            }
            
            return record || null;
        } catch (error) {
            console.error('获取分析记录失败:', error);
            return null;
        }
    }
    
    // 内部方法：保存历史记录到localStorage
    _saveHistoryToLocalStorage(records) {
        try {
            const historyKey = this.getUserSpecificKey('analysisHistory');
            localStorage.setItem(historyKey, JSON.stringify(records));
        } catch (error) {
            console.error('保存历史记录到localStorage失败:', error);
        }
    }

    // 添加分析历史记录
    async addAnalysisRecord(record) {
        try {
            let savedRecord;
            
            // 优先使用API
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const apiResult = await this.apiService.addAnalysisRecord({
                        score: record.score,
                        analysisData: record.analysisData || {}
                    });
                    
                    // 转换API返回的数据格式
                    savedRecord = {
                        id: apiResult.record.id,
                        score: apiResult.record.score,
                        analysisData: apiResult.record.analysis_data || {},
                        timestamp: apiResult.record.timestamp,
                        createdAt: new Date().toISOString()
                    };
                } catch (apiError) {
                    console.warn('API添加分析记录失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 如果API失败，使用localStorage
            if (!savedRecord) {
                const recordData = {
                    ...record,
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    timestamp: record.timestamp || Date.now(),
                    createdAt: new Date().toISOString()
                };
                
                const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
                historyRecords.unshift(recordData);
                
                // 限制历史记录数量，最多保存100条
                const limitedRecords = historyRecords.slice(0, 100);
                this._saveHistoryToLocalStorage(limitedRecords);
                
                savedRecord = recordData;
            } else {
                // 如果API成功，同时更新localStorage
                await this.getAllAnalysisHistory(); // 刷新本地缓存
            }
            
            this.triggerGlobalUpdate('analysisHistoryUpdated');
            return savedRecord;
        } catch (error) {
            console.error('添加分析记录失败:', error);
            throw error;
        }
    }

    // 删除分析历史记录
    async deleteAnalysisRecord(id) {
        try {
            // 优先使用API
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const apiResult = await this.apiService.deleteAnalysisRecord(id);
                    if (apiResult.success) {
                        // API成功后更新本地缓存
                        await this.getAllAnalysisHistory(); // 刷新本地缓存
                        this.triggerGlobalUpdate('analysisHistoryUpdated');
                        return true;
                    }
                } catch (apiError) {
                    console.warn('API删除分析记录失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 降级方案：从localStorage删除
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            
            // 使用更灵活的过滤方法，考虑类型不匹配问题
            let updatedRecords = historyRecords.filter(record => record.id !== id);
            
            if (updatedRecords.length === historyRecords.length) {
                updatedRecords = historyRecords.filter(record => record.id != id);
            }
            
            if (updatedRecords.length === historyRecords.length) {
                if (typeof id === 'string') {
                    const numId = parseInt(id);
                    updatedRecords = historyRecords.filter(record => record.id !== numId && record.id != id);
                } else if (typeof id === 'number') {
                    const strId = id.toString();
                    updatedRecords = historyRecords.filter(record => record.id !== strId && record.id != id);
                }
            }
            
            this._saveHistoryToLocalStorage(updatedRecords);
            this.triggerGlobalUpdate('analysisHistoryUpdated');
            
            return updatedRecords.length !== historyRecords.length;
        } catch (error) {
            console.error('删除分析记录失败:', error);
            throw error;
        }
    }

    // 批量删除分析历史记录
    async batchDeleteAnalysisRecords(ids) {
        try {
            // 优先使用API
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const apiResult = await this.apiService.batchDeleteAnalysisRecords(ids);
                    if (apiResult.success) {
                        // API成功后更新本地缓存
                        await this.getAllAnalysisHistory(); // 刷新本地缓存
                        this.triggerGlobalUpdate('analysisHistoryUpdated');
                        return ids.length;
                    }
                } catch (apiError) {
                    console.warn('API批量删除分析记录失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 降级方案：从localStorage批量删除
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            
            // 使用更灵活的过滤方法，考虑类型不匹配问题
            const updatedRecords = historyRecords.filter(record => {
                return !ids.some(id => {
                    if (record.id === id) return true;
                    if (record.id == id) return true;
                    if (typeof record.id === 'number' && typeof id === 'string') {
                        return record.id === parseInt(id);
                    }
                    if (typeof record.id === 'string' && typeof id === 'number') {
                        return record.id === id.toString();
                    }
                    return false;
                });
            });
            
            const deletedCount = historyRecords.length - updatedRecords.length;
            
            // 保存更新后的记录
            this._saveHistoryToLocalStorage(updatedRecords);
            
            // 触发全局更新
            this.triggerGlobalUpdate('analysisHistoryUpdated');
            
            return deletedCount;
        } catch (error) {
            console.error('批量删除分析记录失败:', error);
            throw error;
        }
    }
    
    // 更新分析历史记录
    async updateAnalysisRecord(id, updatedData) {
        try {
            // 优先使用API
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    const apiResult = await this.apiService.updateAnalysisRecord(id, {
                        score: updatedData.score,
                        analysisData: updatedData.analysisData || {}
                    });
                    
                    if (apiResult.record) {
                        // 转换API返回的数据格式
                        const formattedRecord = {
                            id: apiResult.record.id,
                            score: apiResult.record.score,
                            analysisData: apiResult.record.analysis_data || {},
                            timestamp: apiResult.record.timestamp,
                            updatedAt: new Date().toISOString()
                        };
                        
                        // API成功后更新本地缓存
                        await this.getAllAnalysisHistory(); // 刷新本地缓存
                        this.triggerGlobalUpdate('analysisHistoryUpdated');
                        return formattedRecord;
                    }
                } catch (apiError) {
                    console.warn('API更新分析记录失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 降级方案：从localStorage更新
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            
            // 查找要更新的记录 - 考虑可能的类型不匹配
            let recordIndex = -1;
            
            // 尝试使用严格比较
            recordIndex = historyRecords.findIndex(record => record.id === id);
            
            // 如果严格比较失败，尝试使用宽松比较（处理字符串vs数字问题）
            if (recordIndex === -1) {
                recordIndex = historyRecords.findIndex(record => record.id == id);
            }
            
            // 如果仍然未找到，尝试将ID转换为不同类型后再次查找
            if (recordIndex === -1) {
                // 如果ID是字符串，尝试转换为数字
                if (typeof id === 'string') {
                    const numId = parseInt(id);
                    recordIndex = historyRecords.findIndex(record => record.id === numId);
                }
                // 如果ID是数字，尝试转换为字符串
                else if (typeof id === 'number') {
                    const strId = id.toString();
                    recordIndex = historyRecords.findIndex(record => record.id === strId);
                }
            }
            
            if (recordIndex === -1) {
                return null;
            }
            
            // 更新记录，保留原始ID和创建时间，更新其他字段
            const updatedRecord = {
                ...historyRecords[recordIndex],
                ...updatedData,
                updatedAt: new Date().toISOString() // 添加更新时间
            };
            
            // 替换原始记录
            historyRecords[recordIndex] = updatedRecord;
            
            // 保存更新后的记录
            this._saveHistoryToLocalStorage(historyRecords);
            
            // 触发全局更新
            this.triggerGlobalUpdate('analysisHistoryUpdated');
            
            return updatedRecord;
        } catch (error) {
            console.error('更新分析记录失败:', error);
            return null;
        }
    }

    // 清空所有分析历史
    async clearAllAnalysisHistory() {
        try {
            // 优先使用API
            if (this.useApi && this.apiService && this.apiService.isLoggedIn()) {
                try {
                    // 先获取所有记录ID
                    const allRecords = await this.getAllAnalysisHistory();
                    if (allRecords.length > 0) {
                        const recordIds = allRecords.map(record => record.id);
                        // 使用批量删除API
                        await this.apiService.batchDeleteAnalysisRecords(recordIds);
                    }
                    // API成功后更新本地缓存
                    this._saveHistoryToLocalStorage([]);
                    this.triggerGlobalUpdate('analysisHistoryUpdated');
                    return true;
                } catch (apiError) {
                    console.warn('API清空分析历史失败，使用本地备份:', apiError);
                    // API失败时降级到localStorage
                }
            }
            
            // 降级方案：清空localStorage
            this._saveHistoryToLocalStorage([]);
            this.triggerGlobalUpdate('analysisHistoryUpdated');
            return true;
        } catch (error) {
            console.error('清空分析历史记录失败:', error);
            throw error;
        }
    }

    // 从localStorage迁移数据
    async migrateFromLocalStorage() {
        try {
            // 迁移用户资料（如果需要）
            await this.getUserProfile();

            // 迁移分析历史
            const existingHistory = await this.getAllAnalysisHistory();
            if (existingHistory.length === 0) {
                const localStorageRecords = localStorage.getItem('analysisHistory');
                if (localStorageRecords) {
                    try {
                        const records = JSON.parse(localStorageRecords);
                        if (Array.isArray(records) && records.length > 0) {
                            // 检查是否已登录
                            const canMigrateToApi = this.useApi && this.apiService && this.apiService.isLoggedIn();
                            
                            // 如果可以迁移到API，则批量上传
                            if (canMigrateToApi) {
                                console.log('开始将本地分析历史迁移到API...');
                                
                                for (const record of records) {
                                    try {
                                        await this.addAnalysisRecord(record);
                                    } catch (apiError) {
                                        console.warn('迁移单条记录失败:', apiError);
                                    }
                                }
                                
                                console.log('本地分析历史迁移完成');
                            } else {
                                // 未登录时，仅保存到本地
                                for (const record of records) {
                                    await this.addAnalysisRecord(record);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('解析分析历史失败:', e);
                    }
                }
            }
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }
}

// 创建全局实例
const dbManager = new DBManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dbManager;
} else {
    window.localDB = dbManager;
}
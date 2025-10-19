// unified_sync_system.js - 统一的跨页面同步系统
// 精简版：移除冗余代码，保留核心功能

// 定义UnifiedSyncSystem类
class UnifiedSyncSystem {
    constructor() {
        // 统一的存储键名
        this.storageKeys = {
            profile: 'unified_user_profile',
            analysisHistory: 'analysisHistory',
            syncTrigger: 'unified_sync_trigger'
        };

        
        // 配置参数
        this.config = {
            syncInterval: 60000, // 60秒同步一次
            isDevMode: typeof window !== 'undefined' && window.location && 
                      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        };
        
        this.lastSyncTime = 0;
        this.init();
    }
    
    init() {
        // 设置事件监听
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // 立即同步一次
        this.syncAllData();
        
        // 设置定期同步
        setInterval(() => this.syncAllData(), this.config.syncInterval);
    }
    
    handleStorageChange(event) {
        // 只处理重要的存储变化
        if (event.key === this.storageKeys.profile || 
            event.key === this.storageKeys.syncTrigger) {
            this.syncUserData();
        }
        else if (event.key === this.storageKeys.analysisHistory) {
            this.syncAnalysisHistory();
        }
    }
    
    handleVisibilityChange() {
        if (!document.hidden && Date.now() - this.lastSyncTime > 5000) {
            this.syncAllData();
        }
    }
    
    syncAllData() {
        try {
            this.syncUserData();
            this.syncAnalysisHistory();
            this.lastSyncTime = Date.now();
        } catch (error) { 
            // 静默处理：同步失败
        }
    }
    
    syncUserData() {
        try {
            const profile = this.getUserProfile();
            if (profile) {
                this.updateProfileDisplay(profile);
                return true;
            }
            return false;
        } catch (error) { 
            // 静默处理：用户资料同步失败
            return false;
        }
    }
    
    syncAnalysisHistory() {
        try {
            if (typeof syncAnalysisHistory === 'function') {
                syncAnalysisHistory();
            }
        } catch (error) { 
            // 静默处理：分析历史同步失败
        }
    }
    
    getUserProfile() {
        try {
            // 优先使用统一的键名
            let profileData = localStorage.getItem(this.storageKeys.profile);
            
            // 兼容旧系统的键名
            if (!profileData) {
                profileData = localStorage.getItem('userProfileData') || 
                            localStorage.getItem('ultimate_user_profile');
            }
            
            if (profileData) {
                const profile = JSON.parse(profileData);
                // 自动迁移到统一的键名
                if (localStorage.getItem(this.storageKeys.profile) !== profileData) {
                    localStorage.setItem(this.storageKeys.profile, profileData);
                }
                return profile;
            }
            return null;
        } catch (error) { 
            // 静默处理：获取用户资料失败
            return null;
        }
    }
    
    saveUserProfile(profile) {
        try {
            const userData = {
                id: 'currentUser',
                ...profile,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKeys.profile, JSON.stringify(userData));
            this.triggerSync();
            this.updateProfileDisplay(userData);
            
            return userData;
        } catch (error) { 
            // 静默处理：保存用户资料失败
            throw error;
        }
    }
    
    updateProfileDisplay(profile) {
        if (!profile) return;
        
        // 头像使用默认头像，不再从profile更新
        
        // 更新用户名
        if (profile.fullname) {
            const nameElements = document.querySelectorAll('#user-name, #nav-username-desktop, #nav-username-mobile');
            nameElements.forEach(element => {
                if (element.textContent && !element.matches('label, input, textarea, select')) {
                    element.textContent = profile.fullname;
                }
            });
        }
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('unifiedProfileUpdated', { detail: { profile } }));
    }
    
    triggerSync() {
        // 使用时间戳作为触发标志
        const timestamp = Date.now().toString();
        localStorage.setItem(this.storageKeys.syncTrigger, timestamp);
    }
    
    // 分析历史相关方法
    getAllAnalysisHistory() {
        try {
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            return historyRecords.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) { 
            // 静默处理：获取分析历史失败
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
            
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            historyRecords.unshift(recordData);
            
            // 限制历史记录数量
            const limitedRecords = historyRecords.slice(0, 100);
            localStorage.setItem('analysisHistory', JSON.stringify(limitedRecords));
            this.triggerSync();
            
            return recordData;
        } catch (error) { 
            // 静默处理：添加分析记录失败
            throw error;
        }
    }
    
    getAnalysisRecordById(id) {
        try {
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            
            // 尝试多种匹配方式
            let record = historyRecords.find(r => r.id === id);
            if (!record) record = historyRecords.find(r => r.id == id);
            
            // 如果仍然未找到，尝试类型转换
            if (!record && typeof id === 'string') {
                const numId = parseInt(id);
                record = historyRecords.find(r => r.id === numId);
            } else if (!record && typeof id === 'number') {
                const strId = id.toString();
                record = historyRecords.find(r => r.id === strId);
            }
            
            return record || null;
        } catch (error) { 
            // 静默处理：获取记录失败
            return null;
        }
    }
    
    updateAnalysisRecord(id, updatedData) {
        try {
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            let recordIndex = -1;
            
            // 尝试使用严格比较查找记录索引
            recordIndex = historyRecords.findIndex(record => record.id === id);
            
            // 如果严格比较失败，尝试使用宽松比较
            if (recordIndex === -1) {
                recordIndex = historyRecords.findIndex(record => record.id == id);
            }
            
            // 如果仍然未找到，尝试将ID转换为不同类型后再次查找
            if (recordIndex === -1) {
                if (typeof id === 'string') {
                    const numId = parseInt(id);
                    recordIndex = historyRecords.findIndex(record => record.id === numId);
                } else if (typeof id === 'number') {
                    const strId = id.toString();
                    recordIndex = historyRecords.findIndex(record => record.id === strId);
                }
            }
            
            // 如果找不到记录，返回null
            if (recordIndex === -1) {
                // 静默处理：未找到要更新的记录
                return null;
            }
            
            // 更新记录
            const updatedRecord = {
                ...historyRecords[recordIndex],
                ...updatedData,
                updatedAt: new Date().toISOString()
            };
            
            // 保存更新
            historyRecords[recordIndex] = updatedRecord;
            localStorage.setItem('analysisHistory', JSON.stringify(historyRecords));
            this.triggerSync();
            
            return updatedRecord;
        } catch (error) { 
            // 静默处理：更新记录失败
            return null;
        }
    }
    
    deleteAnalysisRecord(id) {
        try {
            const historyRecords = JSON.parse(localStorage.getItem('analysisHistory')) || [];
            const filteredRecords = historyRecords.filter(record => record.id != id);
            
            if (filteredRecords.length !== historyRecords.length) {
                localStorage.setItem('analysisHistory', JSON.stringify(filteredRecords));
                this.triggerSync();
                return true;
            }
            
            return false;
        } catch (error) { 
            // 静默处理：删除记录失败
            return false;
        }
    }
}

// 创建全局实例并提供兼容层
if (!window.unifiedSyncSystem) {
    window.unifiedSyncSystem = new UnifiedSyncSystem();
    
    // 提供兼容层
    window.userProfileSync = {
        syncProfileData: () => window.unifiedSyncSystem.syncUserData(),
        triggerGlobalUpdate: (profileData) => window.unifiedSyncSystem.saveUserProfile(profileData)
    };
    
    // 扩展localDB
    if (!window.localDB) window.localDB = {};
    
    const unifiedSync = window.unifiedSyncSystem;
    window.localDB = {
        ...window.localDB,
        getUserProfile: () => unifiedSync.getUserProfile(),
        saveUserProfile: (profile) => unifiedSync.saveUserProfile(profile),
        getAllAnalysisHistory: () => unifiedSync.getAllAnalysisHistory(),
        getAnalysisRecordById: (id) => unifiedSync.getAnalysisRecordById(id),
        addAnalysisRecord: (record) => unifiedSync.addAnalysisRecord(record),
        updateAnalysisRecord: (id, data) => unifiedSync.updateAnalysisRecord(id, data),
        deleteAnalysisRecord: (id) => unifiedSync.deleteAnalysisRecord(id),
        triggerGlobalUpdate: () => unifiedSync.triggerSync()
    };
}
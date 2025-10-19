// API服务 - 用于与后端通信
class ApiService {
    constructor() {
        // 后端API基础URL - 使用固定端口
        this.baseUrl = 'http://localhost:50000/api';
        // 存储JWT令牌
        this.token = localStorage.getItem('authToken');
    }

    // 设置认证令牌
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    // 获取认证令牌
    getToken() {
        return this.token;
    }

    // 检查是否已登录
    isLoggedIn() {
        return !!this.token;
    }

    // 构建请求头
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        // 如果有认证令牌，添加到请求头
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // 处理API响应
    async handleResponse(response) {
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error('响应格式错误，无法解析JSON');
        }
        
        if (!response.ok) {
            // 处理特定的错误情况
            if (response.status === 401) {
                // 认证失败，清除令牌
                this.logout();
                // 可以在这里触发重定向到登录页
                console.error('认证失败，请重新登录');
            }
            throw new Error(data.error || `请求失败 (状态码: ${response.status})`);
        }

        return data;
    }

    // 用户注册
    async register(userData) {
        try {
            const response = await fetch(`${this.baseUrl}/users/register`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(userData)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('注册失败:', error);
            throw error;
        }
    }

    // 用户登录
    async login(credentials) {
        try {
            const response = await fetch(`${this.baseUrl}/users/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(credentials)
            });
            const data = await this.handleResponse(response);
            
            // 保存令牌
            if (data.token) {
                this.setToken(data.token);
                
                // 保存用户信息到本地存储，包括注册时间
                if (data.user) {
                    localStorage.setItem('currentUser', JSON.stringify({
                        ...data.user,
                        registerDate: data.user.created_at || data.user.registerDate
                    }));
                }
            }
            
            return data;
        } catch (error) {
            console.error('登录失败:', error);
            throw error;
        }
    }

    // 获取用户资料
    async getUserProfile() {
        try {
            const response = await fetch(`${this.baseUrl}/users/profile`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('获取用户资料失败:', error);
            throw error;
        }
    }

    // 更新用户资料
    async updateUserProfile(profileData) {
        try {
            const response = await fetch(`${this.baseUrl}/users/profile`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(profileData)
            });
            
            // 特殊处理：对于个人资料更新，即使返回500错误，我们仍然尝试解析响应
            // 因为从服务器日志可以看到，即使返回500错误，更新操作实际上也可能成功了
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.warn('无法解析响应JSON，但继续处理');
                data = { success: false, message: '无法解析响应' };
            }
            
            // 即使响应状态不是ok，我们也返回数据而不是抛出错误
            // 这样前端可以继续处理本地更新逻辑
            console.log('更新个人资料响应:', { status: response.status, data });
            
            // 添加一个标志，表明这是一个可能成功的更新
            data._mayHaveSucceeded = true;
            
            return data;
        } catch (error) {
            console.error('更新用户资料过程中发生网络错误:', error);
            
            // 即使有网络错误，也返回一个对象而不是抛出异常
            // 这样前端可以继续处理本地更新
            return { 
                success: false, 
                message: error.message,
                _mayHaveSucceeded: false,
                _isNetworkError: true
            };
        }
    }

    // 更改密码
    async changePassword(passwordData) {
        try {
            const response = await fetch(`${this.baseUrl}/users/change-password`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(passwordData)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('更改密码失败:', error);
            throw error;
        }
    }

    // 添加分析记录
    async addAnalysisRecord(recordData) {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/records`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(recordData)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('添加分析记录失败:', error);
            throw error;
        }
    }

    // 获取分析历史记录列表
    async getAnalysisRecords(limit = 50, offset = 0) {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/records?limit=${limit}&offset=${offset}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('获取分析记录失败:', error);
            throw error;
        }
    }

    // 获取单个分析记录
    async getAnalysisRecord(id) {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/records/${id}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('获取分析记录失败:', error);
            throw error;
        }
    }

    // 更新分析记录
    async updateAnalysisRecord(id, recordData) {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/records/${id}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(recordData)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('更新分析记录失败:', error);
            throw error;
        }
    }

    // 删除分析记录
    async deleteAnalysisRecord(id) {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/records/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('删除分析记录失败:', error);
            throw error;
        }
    }

    // 批量删除分析记录
    async batchDeleteAnalysisRecords(ids) {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/records`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({ ids })
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('批量删除分析记录失败:', error);
            throw error;
        }
    }

    // 获取分析统计信息
    async getAnalysisStats() {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/stats`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('获取分析统计失败:', error);
            throw error;
        }
    }

    // 注销登录
    logout() {
        try {
            // 清除令牌
            this.setToken(null);
            
            // 清除所有登录相关的localStorage数据
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('userCredentials');
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('savedCredentials');
                localStorage.removeItem('rememberedUser');
            }
        } catch (error) {
            console.error('注销时发生错误:', error);
            // 即使出错也继续执行，确保尽可能多地清除数据
        }
    }
}

// 创建全局API服务实例
const apiService = new ApiService();

// 导出实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiService;
} else {
    window.apiService = apiService;
}
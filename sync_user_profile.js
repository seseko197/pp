// sync_user_profile.js - 用户资料同步模块（已集成到统一同步管理器）
// 功能：处理用户资料的同步和更新，优先使用统一同步管理器 

 class UserProfileSync { 
     constructor() { 
         this.storageKey = 'userProfileData'; 
         this.syncEventKey = 'userProfileUpdated'; 
         this.init(); 
     } 

     init() { 
         // 监听存储变化事件（跨页面同步） 
         window.addEventListener('storage', this.handleStorageChange.bind(this)); 
         
         // 监听页面可见性变化（当用户切换回页面时检查更新） 
         document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this)); 
         
         // 监听统一同步系统的资料更新事件
         window.addEventListener('unifiedProfileUpdated', (e) => {
             // 静默处理：收到统一同步系统的资料更新事件
             this.syncProfileData();
         });
         
         // 立即检查并同步一次 
         this.syncProfileData(); 
     } 

     // 处理存储变化事件 
     handleStorageChange(event) { 
         // 直接监听userProfileData的变化，而不是事件标志位
         if (event.key === this.storageKey) { 
             // 静默处理：检测到用户资料数据更新，正在同步...
             this.syncProfileData(); 
         } 
     } 

     // 处理页面可见性变化 
     handleVisibilityChange() { 
         if (!document.hidden) { 
             // 页面重新变为可见时同步数据 
             this.syncProfileData(); 
         } 
     } 

     // 同步用户资料数据 
     async syncProfileData() { 
         try { 
             // 优先使用统一同步管理器
             if (window.unifiedSyncManager) {
                 // 使用统一同步管理器获取用户资料
                 const profile = await window.unifiedSyncManager.syncUserData();
                 if (profile) {
                     // 统一同步管理器已经更新了显示，这里可以省略
                     // 静默处理：已通过统一同步管理器获取并更新用户资料
                     return;
                 }
             } else if (window.localDB && typeof window.localDB.getUserProfile === 'function') { 
                 // 降级方案：通过localDB接口获取最新资料
                 const dbProfile = await window.localDB.getUserProfile(); 
                 if (dbProfile) { 
                     await this.updateProfileDisplay(dbProfile); 
                     return; 
                 } 
             } 
                
             // 最后的降级方案：直接从localStorage获取用户资料 
             const profileData = localStorage.getItem(this.storageKey); 
             if (profileData) { 
                 const profile = JSON.parse(profileData); 
                 await this.updateProfileDisplay(profile); 
             } 
         } catch (error) { 
             // 静默处理：同步用户资料失败
         } 
     } 

     // 更新页面显示 
     async updateProfileDisplay(profile) { 
         // 头像使用默认头像，不再从profile更新 
         // 保留其他更新逻辑 

         // 更新所有用户名元素 - 更精确的选择器以避免误替换
         const nameElements = document.querySelectorAll('#nav-username-desktop, #nav-username-mobile, [id="username"], [id="fullname"], [class="username-display"], [class="fullname-display"]');
         nameElements.forEach(element => {
             if (element.textContent && profile.fullname) {
                 element.textContent = profile.fullname;
             }
         }); 

         // 更新导航栏用户信息 
         this.updateNavigationProfile(profile); 

         // 静默处理：用户资料同步完成
     } 

     // 更新导航栏用户信息 
     updateNavigationProfile(profile) { 
         // 桌面端导航栏 
         const navDesktop = document.querySelector('.hidden.md\\:flex.items-center.space-x-6'); 
         if (navDesktop) { 
             const desktopAvatar = navDesktop.querySelector('img'); 
             const desktopName = navDesktop.querySelector('span'); 
             
             if (desktopAvatar && profile.avatar) { 
                 desktopAvatar.src = profile.avatar; 
                 desktopAvatar.alt = profile.fullname; 
             } 
             if (desktopName && profile.fullname) { 
                 desktopName.textContent = profile.fullname; 
             } 
         } 

         // 移动端导航栏 
         const mobileMenu = document.getElementById('mobile-menu'); 
         if (mobileMenu) { 
             const mobileAvatar = mobileMenu.querySelector('img'); 
             const mobileName = mobileMenu.querySelector('span'); 
             
             if (mobileAvatar && profile.avatar) { 
                 mobileAvatar.src = profile.avatar; 
                 mobileAvatar.alt = profile.fullname; 
             } 
             if (mobileName && profile.fullname) { 
                 mobileName.textContent = profile.fullname; 
             } 
         } 
     } 

     // 触发全局更新（在其他页面修改资料后调用） 
     triggerGlobalUpdate(profileData) { 
         // 使用统一同步管理器（如果可用）
         if (window.unifiedSyncManager) {
             // 保存资料到统一同步管理器
             const userData = {
                 id: 'currentUser',
                 ...profileData,
                 updatedAt: new Date().toISOString()
             };
             window.unifiedSyncManager.saveProfile(userData);
         } else {
             // 降级方案：直接保存到localStorage
             localStorage.setItem(this.storageKey, JSON.stringify(profileData));
             
             // 同时设置统一同步系统的键名以确保跨页面同步
             const userData = {
                 id: 'currentUser',
                 ...profileData,
                 updatedAt: new Date().toISOString()
             };
             localStorage.setItem('unified_user_profile', JSON.stringify(userData));
             
             // 触发存储事件通知其他页面 
             localStorage.setItem(this.syncEventKey, Date.now().toString()); 
             
             // 短暂延迟后清除事件标记 
             setTimeout(() => { 
                 localStorage.removeItem(this.syncEventKey); 
             }, 100);
         }
     } 
 } 

 // 创建全局实例 
 const userProfileSync = new UserProfileSync(); 

 // 导出为全局变量 
 window.userProfileSync = userProfileSync;
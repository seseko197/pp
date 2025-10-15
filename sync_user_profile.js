// sync_user_profile.js - 跨页面用户资料同步工具 

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
         
         // 立即检查并同步一次 
         this.syncProfileData(); 
     } 

     // 处理存储变化事件 
     handleStorageChange(event) { 
         if (event.key === this.syncEventKey) { 
             console.log('检测到用户资料更新事件，正在同步...'); 
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
             // 优先从IndexedDB获取最新资料，确保实时性 
             if (window.localDB && typeof window.localDB.getUserProfile === 'function') { 
                 console.log('🔍 尝试从IndexedDB获取最新用户资料'); 
                 const dbProfile = await window.localDB.getUserProfile(); 
                 if (dbProfile) { 
                     // 更新localStorage中的数据 
                     localStorage.setItem(this.storageKey, JSON.stringify(dbProfile)); 
                     // 更新页面显示 
                     await this.updateProfileDisplay(dbProfile); 
                     console.log('✅ 已从IndexedDB获取并更新用户资料'); 
                     return; 
                 } 
             } 
              
             // 如果没有从IndexedDB获取到，再从localStorage获取 
             const profileData = localStorage.getItem(this.storageKey); 
             if (profileData) { 
                 const profile = JSON.parse(profileData); 
                 await this.updateProfileDisplay(profile); 
                 console.log('✅ 已从localStorage获取用户资料'); 
             } else { 
                 console.log('⚠️ 未找到用户资料数据'); 
             } 
         } catch (error) { 
             console.error('同步用户资料失败:', error); 
         } 
     } 

     // 更新页面显示 
     async updateProfileDisplay(profile) { 
         // 更新所有头像元素 
         const avatarElements = document.querySelectorAll('[id*="avatar"], [class*="avatar"]'); 
         avatarElements.forEach(element => { 
             if (element.tagName === 'IMG' && profile.avatar) { 
                 element.src = profile.avatar; 
                 element.alt = profile.fullname || '用户头像'; 
             } 
         }); 

         // 更新所有用户名元素 - 更精确的选择器以避免误替换
         const nameElements = document.querySelectorAll('#nav-username-desktop, #nav-username-mobile, [id="username"], [id="fullname"], [class="username-display"], [class="fullname-display"]');
         nameElements.forEach(element => {
             if (element.textContent && profile.fullname) {
                 element.textContent = profile.fullname;
             }
         }); 

         // 更新导航栏用户信息 
         this.updateNavigationProfile(profile); 

         console.log('用户资料同步完成'); 
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
         // 保存资料到localStorage 
         localStorage.setItem(this.storageKey, JSON.stringify(profileData)); 
         
         // 触发存储事件通知其他页面 
         localStorage.setItem(this.syncEventKey, Date.now().toString()); 
         
         // 短暂延迟后清除事件标记 
         setTimeout(() => { 
             localStorage.removeItem(this.syncEventKey); 
         }, 100); 
     } 
 } 

 // 创建全局实例 
 const userProfileSync = new UserProfileSync(); 

 // 导出为全局变量 
 window.userProfileSync = userProfileSync;
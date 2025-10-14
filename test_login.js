// 登录功能测试脚本
// 在浏览器控制台中运行此脚本以测试登录功能

console.log('开始测试登录功能...');

// 检查必要的DOM元素是否存在
const requiredElements = [
    { id: 'login-form', name: '登录表单' },
    { id: 'login-button', name: '登录按钮' },
    { id: 'username', name: '用户名输入框' },
    { id: 'password', name: '密码输入框' },
    { id: 'remember-me', name: '记住我复选框' }
];

let elementsFound = true;
for (const el of requiredElements) {
    const element = document.getElementById(el.id);
    if (!element) {
        console.error(`未找到${el.name} (ID: ${el.id})`);
        elementsFound = false;
    } else {
        console.log(`找到${el.name} (ID: ${el.id})`);
    }
}

if (!elementsFound) {
    console.error('重要DOM元素缺失，登录功能无法正常工作');
} else {
    console.log('所有必要的DOM元素都已找到');
    
    // 测试模拟用户数据库访问
    try {
        // 模拟在login.html中定义的mockUsers对象
        const mockUsers = {
            'admin': { password: 'admin123', fullname: '管理员', avatar: 'https://picsum.photos/id/1/40/40' },
            'user1': { password: 'user123', fullname: '周光泽', avatar: 'https://picsum.photos/id/91/40/40' },
            'test': { password: 'test123', fullname: '测试用户', avatar: 'https://picsum.photos/id/64/40/40' }
        };
        
        console.log('模拟用户数据库:', mockUsers);
        console.log('可用于测试的用户名:', Object.keys(mockUsers));
    } catch (error) {
        console.error('模拟用户数据库测试失败:', error);
    }
    
    // 测试localStorage访问
    try {
        const testKey = 'test_login_functionality';
        localStorage.setItem(testKey, 'test_value');
        const testValue = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        if (testValue === 'test_value') {
            console.log('localStorage访问测试成功');
        } else {
            console.warn('localStorage访问测试结果不符合预期');
        }
    } catch (error) {
        console.error('localStorage访问测试失败:', error);
        console.warn('这可能导致登录状态无法正常保存');
    }
    
    console.log('\n登录功能测试完成。建议的测试步骤:');
    console.log('1. 打开浏览器开发者工具 (F12)');
    console.log('2. 切换到Console选项卡');
    console.log('3. 尝试使用测试账号登录 (admin/admin123, user1/user123, test/test123)');
    console.log('4. 观察控制台中是否有错误信息');
}
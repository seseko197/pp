import fs from 'fs';
import path from 'path';

// 检查package.json文件的函数
function checkPackageJson(filePath) {
  try {
    console.log(`\n检查文件: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // 检查常见的package.json问题
    const issues = [];
    
    // 检查name字段
    if (!packageJson.name || typeof packageJson.name !== 'string' || packageJson.name.trim() === '') {
      issues.push('缺少或无效的name字段');
    } else if (packageJson.name === 'depression-analysis-frontend' && packageJson.name.includes(' ')) {
      issues.push('name字段不应包含空格');
    }
    
    // 检查version字段
    if (!packageJson.version) {
      issues.push('缺少version字段');
    }
    
    // 检查scripts字段
    if (!packageJson.scripts || typeof packageJson.scripts !== 'object') {
      issues.push('缺少scripts字段');
    }
    
    // 检查dependencies和devDependencies
    if (packageJson.dependencies && typeof packageJson.dependencies !== 'object') {
      issues.push('dependencies应该是一个对象');
    }
    if (packageJson.devDependencies && typeof packageJson.devDependencies !== 'object') {
      issues.push('devDependencies应该是一个对象');
    }
    
    // 检查private字段
    if (!packageJson.private) {
      issues.push('建议添加private: true');
    }
    
    // 检查type字段（针对现代项目）
    const isBackend = filePath.includes('backend');
    if (isBackend && packageJson.type !== 'commonjs') {
      issues.push('后端项目建议设置type: "commonjs"');
    } else if (!isBackend && packageJson.type !== 'module') {
      issues.push('前端项目建议设置type: "module"');
    }
    
    // 显示结果
    if (issues.length > 0) {
      console.log('发现问题:');
      issues.forEach(issue => console.log(`- ${issue}`));
    } else {
      console.log('未发现明显问题');
    }
    
    return issues;
  } catch (error) {
    console.error(`解析文件时出错: ${error.message}`);
    return ['JSON格式错误'];
  }
}

// 获取当前目录
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 检查两个package.json文件
const frontendIssues = checkPackageJson(path.join(__dirname, 'package.json'));
const backendIssues = checkPackageJson(path.join(__dirname, 'backend', 'package.json'));

console.log('\n检查完成!');
console.log(`前端package.json问题数: ${frontendIssues.length}`);
console.log(`后端package.json问题数: ${backendIssues.length}`);
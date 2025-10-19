import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 严格验证JSON文件的函数
function validateJsonFile(filePath) {
  console.log(`\n严格验证文件: ${filePath}`);
  
  try {
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否有尾随逗号
    if (/\,(\s*)}\n*$/.test(content) || /,(\s*)\]\n*$/.test(content)) {
      console.log('⚠️  警告: 可能存在尾随逗号');
    }
    
    // 检查空白字符和格式
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // 检查行尾空格
      if (line.match(/\s+$/)) {
        console.log(`⚠️  警告: 第${index + 1}行存在行尾空格`);
      }
      
      // 检查制表符使用
      if (line.includes('\t')) {
        console.log(`⚠️  警告: 第${index + 1}行使用了制表符而不是空格`);
      }
    });
    
    // 尝试解析JSON
    const parsed = JSON.parse(content);
    console.log('✓ JSON格式有效');
    
    // 检查关键字段格式
    if (parsed.name && typeof parsed.name !== 'string') {
      console.log('⚠️  警告: name字段应该是字符串');
    }
    
    if (parsed.version && !/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/.test(parsed.version)) {
      console.log('⚠️  警告: version字段格式可能不符合语义化版本规范');
    }
    
    // 检查依赖版本格式
    const checkDependencies = (deps, type) => {
      if (deps && typeof deps === 'object') {
        Object.entries(deps).forEach(([name, version]) => {
          if (typeof version !== 'string') {
            console.log(`⚠️  警告: ${type}中的${name}版本不是字符串`);
          }
        });
      }
    };
    
    checkDependencies(parsed.dependencies, 'dependencies');
    checkDependencies(parsed.devDependencies, 'devDependencies');
    
    return true;
  } catch (error) {
    console.error(`❌ JSON解析错误: ${error.message}`);
    return false;
  }
}

// 验证两个package.json文件
console.log('开始严格验证package.json文件...');
const frontendValid = validateJsonFile(path.join(__dirname, 'package.json'));
const backendValid = validateJsonFile(path.join(__dirname, 'backend', 'package.json'));

console.log('\n验证完成!');
console.log(`前端package.json: ${frontendValid ? '有效' : '无效'}`);
console.log(`后端package.json: ${backendValid ? '有效' : '无效'}`);
// 最终验证脚本 - 专注于检查编辑器可能发出警告的问题

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志工具
const log = (message) => console.log(`[VERIFY] ${message}`);

async function runFinalVerification() {
    log('开始最终验证...');
    
    // 1. 检查package.json格式和内容
    await verifyPackageFiles();
    
    // 2. 检查文件编码和行尾
    await checkFileEncoding();
    
    // 3. 检查编辑器配置
    await checkEditorConfig();
    
    log('验证完成！');
}

// 验证package.json文件
async function verifyPackageFiles() {
    log('检查package.json文件...');
    
    const packagePaths = [
        path.join(__dirname, 'package.json'),
        path.join(__dirname, 'backend', 'package.json')
    ];
    
    for (const packagePath of packagePaths) {
        if (!fs.existsSync(packagePath)) {
            log(`跳过不存在的文件: ${packagePath}`);
            continue;
        }
        
        try {
            const content = fs.readFileSync(packagePath, 'utf8');
            
            // 验证JSON格式
            JSON.parse(content);
            log(`✓ ${path.basename(packagePath)} 格式有效`);
            
            // 检查是否有尾随逗号
            if (content.match(/,\s*[}\]]/g)) {
                log(`⚠️ ${path.basename(packagePath)} 可能有尾随逗号`);
            } else {
                log(`✓ ${path.basename(packagePath)} 没有尾随逗号`);
            }
            
            // 检查字段顺序
            const requiredFields = ['name', 'version', 'description', 'main', 'type', 'scripts', 'dependencies', 'devDependencies', 'private'];
            const fields = Object.keys(JSON.parse(content));
            
            // 检查关键字段是否存在且顺序合理
            const missingFields = requiredFields.filter(field => !fields.includes(field));
            if (missingFields.length > 0) {
                log(`⚠️ ${path.basename(packagePath)} 缺少一些常见字段: ${missingFields.join(', ')}`);
            }
            
        } catch (error) {
            log(`❌ 检查 ${path.basename(packagePath)} 时出错: ${error.message}`);
        }
    }
}

// 检查文件编码
async function checkFileEncoding() {
    log('检查文件编码和行尾...');
    
    const testFiles = [
        path.join(__dirname, 'package.json'),
        path.join(__dirname, 'backend', 'package.json'),
        path.join(__dirname, 'api_service.js'),
        path.join(__dirname, 'core_sync_system.js')
    ];
    
    for (const filePath of testFiles) {
        if (!fs.existsSync(filePath)) continue;
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 检查是否有BOM
            if (content.charCodeAt(0) === 0xFEFF) {
                log(`⚠️ ${path.basename(filePath)} 包含BOM标记`);
            }
            
            // 检查行尾
            const crlfCount = (content.match(/\r\n/g) || []).length;
            const lfCount = (content.match(/\r(?!\n)|\n(?!\r)/g) || []).length;
            
            if (crlfCount > 0 && lfCount > 0) {
                log(`⚠️ ${path.basename(filePath)} 混合使用CRLF和LF行尾`);
            } else {
                const eol = crlfCount > 0 ? 'CRLF' : lfCount > 0 ? 'LF' : '未知';
                log(`✓ ${path.basename(filePath)} 使用 ${eol} 行尾`);
            }
            
        } catch (error) {
            log(`❌ 检查 ${path.basename(filePath)} 编码时出错: ${error.message}`);
        }
    }
}

// 检查编辑器配置
async function checkEditorConfig() {
    log('检查编辑器配置...');
    
    const editorConfigPath = path.join(__dirname, '.editorconfig');
    const eslintRcPath = path.join(__dirname, '.eslintrc');
    const prettierRcPath = path.join(__dirname, '.prettierrc');
    
    if (fs.existsSync(editorConfigPath)) {
        log(`✓ 找到 .editorconfig 文件`);
    } else {
        log(`⚠️ 未找到 .editorconfig 文件，这可能导致编辑器警告`);
    }
    
    if (fs.existsSync(eslintRcPath)) {
        log(`⚠️ 找到 .eslintrc 文件但已移除eslint依赖`);
    }
    
    if (fs.existsSync(prettierRcPath)) {
        log(`✓ 找到 .prettierrc 文件`);
    }
    
    // 检查是否有不必要的配置文件
    const possibleConfigFiles = ['.jshintrc', '.jscsrc', '.tslint.json'];
    for (const configFile of possibleConfigFiles) {
        if (fs.existsSync(path.join(__dirname, configFile))) {
            log(`⚠️ 找到可能不必要的配置文件: ${configFile}`);
        }
    }
}

// 运行验证
runFinalVerification();
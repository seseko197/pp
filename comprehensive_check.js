// 全面代码检查脚本
// 用于查找可能导致黄色警告的潜在问题

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志工具
const logger = {
    info: (message) => console.log(`[INFO] ${message}`),
    warn: (message) => console.log(`[WARN] ${message}`),
    error: (message) => console.log(`[ERROR] ${message}`)
};

// 要检查的文件扩展名
const FILE_EXTENSIONS = ['.js', '.html'];

// 要跳过的目录和文件
const SKIP_PATHS = [
    'node_modules',
    'dist',
    'build',
    'comprehensive_check.js', // 跳过自身
    'check_package.js',       // 跳过之前的检查脚本
    'validate_json.js'        // 跳过之前的验证脚本
];

// 主要的检查函数
async function runComprehensiveCheck() {
    logger.info('开始全面代码检查...');
    
    const issues = [];
    
    try {
        // 1. 检查文件结构问题
        await checkFileStructure(__dirname, issues);
        
        // 2. 检查JavaScript语法和可能的问题
        await checkJavaScriptFiles(__dirname, issues);
        
        // 3. 检查HTML文件的常见问题
        await checkHTMLFiles(__dirname, issues);
        
        // 4. 检查文件间的引用关系
        await checkReferences(__dirname, issues);
        
        // 5. 总结结果
        summarizeResults(issues);
        
    } catch (error) {
        logger.error(`检查过程中发生错误: ${error.message}`);
    }
}

// 检查文件结构
async function checkFileStructure(directory, issues) {
    logger.info('检查文件结构...');
    
    const files = await fs.promises.readdir(directory, { withFileTypes: true });
    
    for (const file of files) {
        const fullPath = path.join(directory, file.name);
        
        // 跳过指定的路径
        if (SKIP_PATHS.some(skipPath => fullPath.includes(skipPath))) {
            continue;
        }
        
        if (file.isDirectory()) {
            await checkFileStructure(fullPath, issues);
        } else {
            // 检查文件名是否规范
            if (!/^[a-z0-9._-]+$/i.test(file.name)) {
                issues.push({
                    type: 'naming',
                    severity: 'low',
                    path: fullPath,
                    message: '文件名含有非常规字符'
                });
            }
            
            // 检查文件大小
            const stats = await fs.promises.stat(fullPath);
            if (stats.size > 1000000) { // 1MB
                issues.push({
                    type: 'size',
                    severity: 'medium',
                    path: fullPath,
                    message: `文件过大: ${(stats.size / 1024).toFixed(1)}KB`
                });
            }
        }
    }
}

// 检查JavaScript文件
async function checkJavaScriptFiles(directory, issues) {
    logger.info('检查JavaScript文件...');
    
    const files = await fs.promises.readdir(directory, { withFileTypes: true });
    
    for (const file of files) {
        const fullPath = path.join(directory, file.name);
        
        // 跳过指定的路径
        if (SKIP_PATHS.some(skipPath => fullPath.includes(skipPath))) {
            continue;
        }
        
        if (file.isDirectory()) {
            await checkJavaScriptFiles(fullPath, issues);
        } else if (file.name.endsWith('.js')) {
            try {
                const content = await fs.promises.readFile(fullPath, 'utf8');
                
                // 检查未使用的导入（简单检查）
                const importMatches = content.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g) || [];
                importMatches.forEach(importStmt => {
                    const match = importStmt.match(/import\s+(\w+)\s+from/);
                    if (match && match[1]) {
                        const importName = match[1];
                        // 检查导入的名称是否在代码中使用（简单检查）
                        if (!new RegExp(`\b${importName}\b`, 'g').test(content.replace(/import.*from.*;/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) {
                            issues.push({
                                type: 'import',
                                severity: 'low',
                                path: fullPath,
                                message: `可能存在未使用的导入: ${importName}`
                            });
                        }
                    }
                });
                
                // 检查潜在的未使用变量（简单检查）
                const varDeclarations = content.match(/\b(?:let|const|var)\s+(\w+)/g) || [];
                varDeclarations.forEach(decl => {
                    const varName = decl.match(/\b(?:let|const|var)\s+(\w+)/)[1];
                    // 跳过某些常见的全局变量和特殊变量
                    if (!['_', 'i', 'j', 'k', 'x', 'y', 'z'].includes(varName) && 
                        !/^__/.test(varName)) {
                        const varUsage = content.match(new RegExp(`\b${varName}\b`, 'g'));
                        if (varUsage && varUsage.length <= 1) {
                            issues.push({
                                type: 'variable',
                                severity: 'low',
                                path: fullPath,
                                message: `可能存在未使用的变量: ${varName}`
                            });
                        }
                    }
                });
                
                // 检查重复的函数定义
                const functionDeclarations = content.match(/function\s+(\w+)\s*\(/g) || [];
                const functionNames = {};
                functionDeclarations.forEach(func => {
                    const funcName = func.match(/function\s+(\w+)/)[1];
                    functionNames[funcName] = (functionNames[funcName] || 0) + 1;
                });
                
                for (const [name, count] of Object.entries(functionNames)) {
                    if (count > 1) {
                        issues.push({
                            type: 'function',
                            severity: 'medium',
                            path: fullPath,
                            message: `可能存在重复的函数定义: ${name} (${count}次)`
                        });
                    }
                }
                
            } catch (error) {
                logger.error(`读取文件时出错: ${fullPath}`);
            }
        }
    }
}

// 检查HTML文件
async function checkHTMLFiles(directory, issues) {
    logger.info('检查HTML文件...');
    
    const files = await fs.promises.readdir(directory, { withFileTypes: true });
    
    for (const file of files) {
        const fullPath = path.join(directory, file.name);
        
        // 跳过指定的路径
        if (SKIP_PATHS.some(skipPath => fullPath.includes(skipPath))) {
            continue;
        }
        
        if (file.isDirectory()) {
            await checkHTMLFiles(fullPath, issues);
        } else if (file.name.endsWith('.html')) {
            try {
                const content = await fs.promises.readFile(fullPath, 'utf8');
                
                // 检查内联脚本是否有潜在问题
                const scriptBlocks = content.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
                scriptBlocks.forEach((block, index) => {
                    // 检查脚本中是否有alert或console.log
                    if (block.includes('alert(') || block.includes('console.log(')) {
                        issues.push({
                            type: 'script',
                            severity: 'low',
                            path: `${fullPath} (内联脚本 #${index+1})`,
                            message: '发现可能的调试代码（alert或console.log）'
                        });
                    }
                });
                
                // 检查链接是否正确
                const linkMatches = content.match(/<a[^>]*href=["']([^"']+)["']/g) || [];
                linkMatches.forEach(link => {
                    const href = link.match(/href=["']([^"']+)["']/)[1];
                    // 检查是否是相对链接但文件不存在
                    if (!href.startsWith('http') && !href.startsWith('#') && 
                        !href.startsWith('javascript:') && href !== '') {
                        const linkPath = path.resolve(path.dirname(fullPath), href);
                        // 简单检查文件是否存在（只检查.html文件）
                        if (href.endsWith('.html') && !fs.existsSync(linkPath)) {
                            issues.push({
                                type: 'link',
                                severity: 'medium',
                                path: fullPath,
                                message: `可能存在无效的链接: ${href}`
                            });
                        }
                    }
                });
                
                // 检查脚本引用是否存在
                const scriptRefs = content.match(/<script[^>]*src=["']([^"']+)["']/g) || [];
                scriptRefs.forEach(script => {
                    const src = script.match(/src=["']([^"']+)["']/)[1];
                    // 检查是否是相对链接
                    if (!src.startsWith('http') && !src.startsWith('//')) {
                        const scriptPath = path.resolve(path.dirname(fullPath), src);
                        if (!fs.existsSync(scriptPath)) {
                            issues.push({
                                type: 'script',
                                severity: 'high',
                                path: fullPath,
                                message: `引用的脚本文件不存在: ${src}`
                            });
                        }
                    }
                });
                
            } catch (error) {
                logger.error(`读取文件时出错: ${fullPath}`);
            }
        }
    }
}

// 检查文件间的引用关系
async function checkReferences(directory, issues) {
    logger.info('检查文件间引用关系...');
    
    // 检查package.json中声明的依赖是否在代码中使用
    try {
        const packagePath = path.join(directory, 'package.json');
        if (fs.existsSync(packagePath)) {
            const packageContent = JSON.parse(await fs.promises.readFile(packagePath, 'utf8'));
            const dependencies = {...packageContent.dependencies, ...packageContent.devDependencies};
            
            for (const [depName, version] of Object.entries(dependencies)) {
                // 简单检查依赖是否在代码中使用
                let foundInCode = false;
                
                // 搜索整个代码库
                await searchDependencyInCode(directory, depName, (found) => {
                    foundInCode = found;
                });
                
                if (!foundInCode) {
                    issues.push({
                        type: 'dependency',
                        severity: 'medium',
                        path: packagePath,
                        message: `可能存在未使用的依赖: ${depName}`
                    });
                }
            }
        }
    } catch (error) {
        logger.error('检查依赖时出错:', error.message);
    }
}

// 在代码中搜索依赖的使用
async function searchDependencyInCode(directory, depName, callback) {
    try {
        const files = await fs.promises.readdir(directory, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(directory, file.name);
            
            // 跳过指定的路径
            if (SKIP_PATHS.some(skipPath => fullPath.includes(skipPath))) {
                continue;
            }
            
            if (file.isDirectory()) {
                await searchDependencyInCode(fullPath, depName, callback);
            } else if (FILE_EXTENSIONS.some(ext => file.name.endsWith(ext))) {
                try {
                    const content = await fs.promises.readFile(fullPath, 'utf8');
                    // 检查require或import语句中的依赖
                    if (content.includes(`require('${depName}')`) || 
                        content.includes(`import.*from\s+['"]${depName}['"]`) ||
                        content.includes(`from\s+['"]${depName}['"]`)) {
                        callback(true);
                        return;
                    }
                } catch (error) {
                    // 忽略文件读取错误
                }
            }
        }
    } catch (error) {
        // 忽略目录读取错误
    }
}

// 总结结果
function summarizeResults(issues) {
    logger.info(`\n代码检查完成。发现 ${issues.length} 个潜在问题：\n`);
    
    // 按严重程度分组
    const bySeverity = {
        high: issues.filter(issue => issue.severity === 'high'),
        medium: issues.filter(issue => issue.severity === 'medium'),
        low: issues.filter(issue => issue.severity === 'low')
    };
    
    console.log('严重问题 (High):', bySeverity.high.length);
    bySeverity.high.forEach(issue => {
        console.log(`  - ${issue.path}: ${issue.message}`);
    });
    
    console.log('\n中等问题 (Medium):', bySeverity.medium.length);
    bySeverity.medium.forEach(issue => {
        console.log(`  - ${issue.path}: ${issue.message}`);
    });
    
    console.log('\n轻微问题 (Low):', bySeverity.low.length);
    bySeverity.low.forEach(issue => {
        console.log(`  - ${issue.path}: ${issue.message}`);
    });
    
    if (issues.length === 0) {
        logger.info('未发现明显问题。代码看起来很健康！');
    } else {
        logger.info('\n注意：大多数低严重性问题可能是编辑器警告的来源，但不会影响代码的正常运行。');
    }
}

// 运行检查
runComprehensiveCheck();
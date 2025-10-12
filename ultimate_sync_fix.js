// 终极同步修复工具 - 完全独立的同步逻辑实现
// 这个脚本不依赖于页面上的任何现有函数，直接实现同步的核心功能

function ultimateSyncFix() {
    console.log('=== 终极同步修复工具开始运行 ===');
    
    try {
        // 1. 检查localStorage中的数据
        console.log('\n1. 检查localStorage中的历史记录...');
        const historyRecords = JSON.parse(localStorage.getItem('historyRecords')) || [];
        console.log(`   ✓ 找到 ${historyRecords.length} 条记录`);
        
        if (historyRecords.length === 0) {
            console.log('   ⚠️ 警告: localStorage中没有历史记录！');
            console.log('   正在创建测试记录...');
            
            // 创建测试记录
            const now = new Date();
            const testRecord = {
                date: now.toLocaleDateString('zh-CN'),
                time: now.toLocaleTimeString('zh-CN'),
                model: '终极测试模型',
                healthIndex: 92,
                confidence: '96%',
                details: {
                    '情绪稳定性': 94,
                    '压力水平': 22,
                    '认知功能': 95,
                    '睡眠质量': 90
                },
                advice: '这是通过终极同步修复工具创建的测试记录。',
                timestamp: now.getTime()
            };
            
            // 保存到localStorage
            localStorage.setItem('historyRecords', JSON.stringify([testRecord]));
            console.log('   ✓ 测试记录已创建并保存到localStorage');
            
            // 重新读取
            historyRecords = [testRecord];
        }
        
        // 显示第一条记录的详细信息
        console.log('\n2. 查看第一条记录的详细信息:');
        console.log('   - 日期:', historyRecords[0].date);
        console.log('   - 模型:', historyRecords[0].model);
        console.log('   - 健康指数:', historyRecords[0].healthIndex);
        console.log('   - 时间戳:', historyRecords[0].timestamp);
        
        // 2. 查找历史记录表格
        console.log('\n3. 查找历史记录表格...');
        
        // 尝试多种可能的选择器，确保找到表格
        let tableBody = document.querySelector('#history-table tbody');
        let tableFound = false;
        
        if (tableBody) {
            console.log('   ✓ 成功找到ID为"history-table"的表格');
            tableFound = true;
        } else {
            console.log('   ⚠️ 未找到ID为"history-table"的表格，尝试其他选择器...');
            
            // 尝试通过class查找表格
            const tables = document.querySelectorAll('table.min-w-full');
            if (tables.length > 0) {
                for (let i = 0; i < tables.length; i++) {
                    const tbody = tables[i].querySelector('tbody');
                    if (tbody) {
                        tableBody = tbody;
                        console.log(`   ✓ 找到第${i+1}个表格并使用其tbody`);
                        tableFound = true;
                        break;
                    }
                }
            }
        }
        
        // 如果找不到表格，尝试创建一个临时表格用于测试
        if (!tableFound) {
            console.log('   ⚠️ 未找到任何表格，创建临时测试表格...');
            
            const tempTable = document.createElement('table');
            tempTable.id = 'temp-test-table';
            tempTable.className = 'min-w-full bg-white border border-gray-200 rounded-lg mt-4';
            tempTable.innerHTML = `
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-2 border-b text-left">日期</th>
                        <th class="px-4 py-2 border-b text-left">模型</th>
                        <th class="px-4 py-2 border-b text-left">健康指数</th>
                        <th class="px-4 py-2 border-b text-left">状态</th>
                    </tr>
                </thead>
                <tbody id="temp-table-body"></tbody>
            `;
            
            // 将表格添加到页面中
            const container = document.querySelector('.bg-white.rounded-xl.card-shadow');
            if (container) {
                container.appendChild(tempTable);
                tableBody = document.getElementById('temp-table-body');
                console.log('   ✓ 临时测试表格已创建');
                tableFound = true;
            } else {
                console.error('   ❌ 无法创建临时表格，找不到合适的容器');
                return;
            }
        }
        
        if (!tableBody) {
            console.error('   ❌ 无法找到或创建表格的tbody元素');
            return;
        }
        
        // 3. 获取已有的记录ID
        console.log('\n4. 获取表格中已存在的记录ID...');
        const existingIds = new Set();
        let existingCount = 0;
        
        tableBody.querySelectorAll('tr').forEach((row, index) => {
            // 检查是否有记录ID
            const checkbox = row.querySelector('input.record-checkbox');
            if (checkbox && checkbox.dataset.id) {
                existingIds.add(checkbox.dataset.id);
                existingCount++;
            } else {
                // 也检查行内的文本内容，尝试匹配日期和模型来避免重复
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const dateText = cells[1]?.textContent?.trim() || '';
                    const modelText = cells[2]?.textContent?.trim() || '';
                    if (dateText && modelText) {
                        const textId = `${dateText}-${modelText}`;
                        existingIds.add(textId);
                        existingCount++;
                    }
                }
            }
        });
        
        console.log(`   ✓ 找到 ${existingCount} 条已存在的记录`);
        
        // 4. 添加新记录到表格
        console.log('\n5. 添加新记录到表格...');
        let addedCount = 0;
        
        historyRecords.forEach((record, index) => {
            // 为避免重复，使用多种方式生成ID
            const recordId1 = `record-${record.timestamp}`;
            const recordId2 = `${record.date}-${record.model}`;
            
            // 检查记录是否已存在
            if (!existingIds.has(recordId1) && !existingIds.has(recordId2)) {
                console.log(`   添加记录 ${index+1}: ${record.date} ${record.model} 健康指数:${record.healthIndex}`);
                
                // 创建新行
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition-colors';
                
                // 计算健康状态
                let statusClass = 'bg-yellow-100 text-yellow-800';
                let statusText = '一般';
                if (record.healthIndex >= 80) {
                    statusClass = 'bg-green-100 text-green-800';
                    statusText = '良好';
                } else if (record.healthIndex < 60) {
                    statusClass = 'bg-red-100 text-red-800';
                    statusText = '较差';
                }
                
                // 设置行内容
                row.innerHTML = `
                    <td class="px-4 py-3 whitespace-nowrap">
                        <input type="checkbox" class="record-checkbox rounded text-primary focus:ring-primary" data-id="${recordId1}">
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${record.date}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${record.model}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${record.healthIndex}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${statusText}</span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <a href="#" class="text-primary hover:text-primary/80 mr-4">查看详情</a>
                        <a href="#" class="text-gray-500 hover:text-gray-700 delete-btn">删除</a>
                    </td>
                `;
                
                // 添加到表格顶部
                tableBody.insertBefore(row, tableBody.firstChild);
                addedCount++;
                
                // 更新已存在的记录ID集合
                existingIds.add(recordId1);
                existingIds.add(recordId2);
            }
        });
        
        console.log(`   ✓ 共添加了 ${addedCount} 条新记录到表格`);
        
        // 5. 完成提示
        console.log('\n=== 终极同步修复工具运行完成 ===');
        
        if (addedCount > 0) {
            console.log('✅ 成功同步记录到历史表格！');
            alert(`成功同步了 ${addedCount} 条记录到历史表格！`);
        } else if (historyRecords.length > 0) {
            console.log('ℹ️ 所有记录已经在表格中，无需重复添加。');
            alert('所有记录已经在表格中，无需重复添加。\n请刷新页面后再次检查。');
        } else {
            console.log('⚠️ 未找到任何可同步的记录。');
            alert('未找到任何可同步的记录。\n请先在分析中心完成一次分析。');
        }
        
    } catch (error) {
        console.error('❌ 同步过程中发生错误:', error);
        alert('同步过程中发生错误:\n' + error.message);
    }
}

// 立即执行同步修复
if (typeof window !== 'undefined') {
    // 添加一个小延迟，确保DOM完全加载
    setTimeout(() => {
        ultimateSyncFix();
    }, 500);
}

// 导出函数供其他地方使用
export { ultimateSyncFix };
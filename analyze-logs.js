#!/usr/bin/env node
/**
 * GSI 日志分析工具
 * 用于分析和提取 GSI 数据结构
 */

const fs = require('fs');
const path = require('path');

class GSILogAnalyzer {
  constructor(logFilePath) {
    this.logFilePath = logFilePath;
    this.entries = [];
  }

  /**
   * 读取并解析日志文件
   */
  loadLog() {
    console.log(`📂 读取日志文件: ${this.logFilePath}`);
    
    const content = fs.readFileSync(this.logFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    this.entries = lines.slice(1).map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(e => e !== null);
    
    console.log(`✓ 成功读取 ${this.entries.length} 条记录\n`);
    return this.entries;
  }

  /**
   * 分析数据结构
   */
  analyzeStructure() {
    console.log('=' .repeat(70));
    console.log('📊 数据结构分析');
    console.log('='.repeat(70));
    
    if (this.entries.length === 0) {
      console.log('⚠️  没有数据可分析');
      return;
    }

    // 收集所有字段
    const allFields = new Set();
    const fieldExamples = {};
    const fieldTypes = {};

    this.entries.forEach(entry => {
      if (entry.data) {
        this.collectFields(entry.data, '', allFields, fieldExamples, fieldTypes);
      }
    });

    // 按字段路径排序
    const sortedFields = Array.from(allFields).sort();

    console.log(`\n发现 ${sortedFields.length} 个唯一字段:\n`);
    
    sortedFields.forEach(field => {
      const type = fieldTypes[field] || 'unknown';
      const example = fieldExamples[field];
      const exampleStr = this.formatExample(example);
      console.log(`  ${field}`);
      console.log(`    类型: ${type}`);
      console.log(`    示例: ${exampleStr}\n`);
    });
  }

  /**
   * 递归收集字段
   */
  collectFields(obj, prefix, allFields, fieldExamples, fieldTypes) {
    if (obj === null || obj === undefined) return;

    if (Array.isArray(obj)) {
      const fieldPath = prefix || 'array';
      allFields.add(fieldPath);
      fieldTypes[fieldPath] = 'array';
      if (obj.length > 0) {
        fieldExamples[fieldPath] = obj[0];
        // 分析数组元素
        this.collectFields(obj[0], `${fieldPath}[0]`, allFields, fieldExamples, fieldTypes);
      }
    } else if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        allFields.add(fieldPath);
        fieldExamples[fieldPath] = value;
        
        if (value === null) {
          fieldTypes[fieldPath] = 'null';
        } else if (Array.isArray(value)) {
          fieldTypes[fieldPath] = 'array';
          if (value.length > 0) {
            this.collectFields(value, fieldPath, allFields, fieldExamples, fieldTypes);
          }
        } else if (typeof value === 'object') {
          fieldTypes[fieldPath] = 'object';
          this.collectFields(value, fieldPath, allFields, fieldExamples, fieldTypes);
        } else {
          fieldTypes[fieldPath] = typeof value;
        }
      });
    }
  }

  /**
   * 格式化示例值
   */
  formatExample(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    if (typeof value === 'object') {
      return `{${Object.keys(value).length} keys}`;
    }
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return JSON.stringify(value);
  }

  /**
   * 分析游戏状态变化
   */
  analyzeGameStates() {
    console.log('\n' + '='.repeat(70));
    console.log('🎮 游戏状态变化分析');
    console.log('='.repeat(70) + '\n');

    const states = this.entries
      .filter(e => e.data && e.data.map && e.data.map.game_state)
      .map(e => ({
        seq: e.seq,
        timestamp: e.timestamp,
        state: e.data.map.game_state,
        game_time: e.data.map.game_time
      }));

    if (states.length === 0) {
      console.log('⚠️  没有找到游戏状态数据');
      return;
    }

    // 统计状态出现次数
    const stateCounts = {};
    let lastState = null;
    const stateTransitions = [];

    states.forEach(item => {
      stateCounts[item.state] = (stateCounts[item.state] || 0) + 1;
      
      if (lastState && lastState !== item.state) {
        stateTransitions.push({
          from: lastState,
          to: item.state,
          at: item.game_time
        });
      }
      lastState = item.state;
    });

    console.log('状态统计:');
    Object.entries(stateCounts).forEach(([state, count]) => {
      console.log(`  ${state}: ${count} 次`);
    });

    if (stateTransitions.length > 0) {
      console.log('\n状态转换:');
      stateTransitions.forEach(t => {
        console.log(`  ${t.from} -> ${t.to} (游戏时间: ${t.at}s)`);
      });
    }
  }

  /**
   * 导出完整数据示例
   */
  exportSample(outputPath) {
    if (this.entries.length === 0) {
      console.log('⚠️  没有数据可导出');
      return;
    }

    // 导出第一条完整数据
    const sample = {
      description: '完整的 Dota2 GSI 数据样本',
      timestamp: this.entries[0].timestamp,
      data: this.entries[0].data
    };

    fs.writeFileSync(outputPath, JSON.stringify(sample, null, 2), 'utf-8');
    console.log(`\n✓ 数据样本已导出到: ${outputPath}`);
  }

  /**
   * 生成 TypeScript 接口定义
   */
  generateTypeScript(outputPath) {
    console.log('\n' + '='.repeat(70));
    console.log('📝 生成 TypeScript 接口定义');
    console.log('='.repeat(70) + '\n');

    if (this.entries.length === 0) {
      console.log('⚠️  没有数据可分析');
      return;
    }

    const interfaces = this.generateInterfaces(this.entries[0].data);
    
    const output = `/**
 * Dota2 GSI 数据类型定义
 * 自动生成于: ${new Date().toISOString()}
 */

${interfaces}
`;

    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`✓ TypeScript 定义已导出到: ${outputPath}`);
  }

  /**
   * 生成接口定义（简化版）
   */
  generateInterfaces(obj, interfaceName = 'GSIData') {
    const lines = [`export interface ${interfaceName} {`];
    
    Object.entries(obj).forEach(([key, value]) => {
      let type = 'any';
      
      if (value === null) {
        type = 'null';
      } else if (Array.isArray(value)) {
        type = 'any[]';
      } else if (typeof value === 'object') {
        type = 'object';
      } else if (typeof value === 'string') {
        type = 'string';
      } else if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      }
      
      lines.push(`  ${key}?: ${type};`);
    });
    
    lines.push('}');
    return lines.join('\n');
  }
}

// 主程序
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
用法: node analyze-logs.js <日志文件路径> [选项]

选项:
  --export-sample <文件>  导出完整数据样本
  --export-types <文件>   导出 TypeScript 类型定义

示例:
  node analyze-logs.js gsi-logs/gsi-data-2024-01-01.jsonl
  node analyze-logs.js gsi-logs/gsi-data-2024-01-01.jsonl --export-sample sample.json
  node analyze-logs.js gsi-logs/gsi-data-2024-01-01.jsonl --export-types types.ts
    `);
    process.exit(1);
  }

  const logFile = args[0];
  
  if (!fs.existsSync(logFile)) {
    console.error(`❌ 文件不存在: ${logFile}`);
    process.exit(1);
  }

  const analyzer = new GSILogAnalyzer(logFile);
  analyzer.loadLog();
  analyzer.analyzeStructure();
  analyzer.analyzeGameStates();

  // 处理导出选项
  const exportSampleIndex = args.indexOf('--export-sample');
  if (exportSampleIndex !== -1 && args[exportSampleIndex + 1]) {
    analyzer.exportSample(args[exportSampleIndex + 1]);
  }

  const exportTypesIndex = args.indexOf('--export-types');
  if (exportTypesIndex !== -1 && args[exportTypesIndex + 1]) {
    analyzer.generateTypeScript(args[exportTypesIndex + 1]);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✓ 分析完成！');
  console.log('='.repeat(70));
}

if (require.main === module) {
  main();
}

module.exports = GSILogAnalyzer;


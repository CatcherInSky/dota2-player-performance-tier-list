import * as fs from 'fs';
import * as path from 'path';
import { SteamFinder } from './steam-finder';

/**
 * Dota2 GSI (Game State Integration) 配置管理器
 */
export class CfgManager {
  private static readonly CFG_FILENAME = 'gamestate_integration_performance.cfg';
  private static readonly CFG_TEMPLATE_PATH = path.join(__dirname, '../public', this.CFG_FILENAME);
  
  /**
   * 获取 Dota2 配置目录路径
   * 使用独立的 SteamFinder 模块
   */
  static findDota2CfgPath(): string | null {
    return SteamFinder.findDota2CfgPath();
  }

  /**
   * 获取 WSL IP 地址（如果在 WSL 环境）
   */
  private static getWSLIP(): string | null {
    try {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      
      // 查找 eth0 接口（WSL 通常使用这个）
      if (interfaces.eth0) {
        for (const iface of interfaces.eth0) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }
    return null;
  }

  /**
   * 检测是否在 WSL 环境中运行
   */
  private static isWSL(): boolean {
    try {
      const os = require('os');
      return os.release().toLowerCase().includes('microsoft') || 
             os.release().toLowerCase().includes('wsl');
    } catch {
      return false;
    }
  }

  /**
   * 读取 cfg 模板并替换端口占位符
   */
  private static generateCfgContent(port: number): string {
    if (!fs.existsSync(this.CFG_TEMPLATE_PATH)) {
      throw new Error(`模板文件不存在: ${this.CFG_TEMPLATE_PATH}`);
    }
    
    let template = fs.readFileSync(this.CFG_TEMPLATE_PATH, 'utf-8');
    
    // 如果在 WSL 环境，使用 WSL IP 而不是 localhost
    const wslIP = this.getWSLIP();
    if (this.isWSL() && wslIP) {
      console.log(`⚠️  检测到 WSL 环境，使用 WSL IP: ${wslIP}`);
      template = template.replace('localhost', wslIP);
    }
    
    return template.replace('{{PORT}}', port.toString());
  }

  /**
   * 检查并创建/更新 cfg 文件
   * 没有就创建，不一致就改写，一致则跳过
   */
  static ensureCfgFile(port: number = 3000, customPath?: string): string {
    const cfgDir = customPath || this.findDota2CfgPath();
    
    if (!cfgDir) {
      throw new Error('无法找到 Dota2 配置目录，请确保游戏已安装');
    }

    // 确保目录存在
    if (!fs.existsSync(cfgDir)) {
      console.log(`创建目录: ${cfgDir}`);
      fs.mkdirSync(cfgDir, { recursive: true });
    }

    const cfgFilePath = path.join(cfgDir, this.CFG_FILENAME);
    const expectedContent = this.generateCfgContent(port);

    // 检查文件是否存在
    if (fs.existsSync(cfgFilePath)) {
      const existingContent = fs.readFileSync(cfgFilePath, 'utf-8');
      
      // 检查内容是否一致（忽略空白字符差异）
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
      if (normalize(existingContent) === normalize(expectedContent)) {
        console.log(`✓ 配置文件已存在且内容一致: ${cfgFilePath}`);
        return cfgFilePath;
      } else {
        console.log(`⚠ 配置文件内容不一致，正在更新...`);
        console.log(`\n旧内容关键行:`);
        const oldUri = existingContent.match(/"uri"\s+"([^"]+)"/);
        if (oldUri) console.log(`  uri: ${oldUri[1]}`);
        console.log(`\n新内容关键行:`);
        const newUri = expectedContent.match(/"uri"\s+"([^"]+)"/);
        if (newUri) console.log(`  uri: ${newUri[1]}`);
        
        fs.writeFileSync(cfgFilePath, expectedContent, 'utf-8');
        console.log(`✓ 配置文件已更新: ${cfgFilePath}`);
        return cfgFilePath;
      }
    } else {
      // 创建新文件
      fs.writeFileSync(cfgFilePath, expectedContent, 'utf-8');
      console.log(`✓ 配置文件已创建: ${cfgFilePath}`);
      
      // 显示创建的配置内容
      const uri = expectedContent.match(/"uri"\s+"([^"]+)"/);
      if (uri) {
        console.log(`   URI: ${uri[1]}`);
      }
      
      return cfgFilePath;
    }
  }
}


// 如果直接运行此文件，执行查找
if (require.main === module) {
  console.log('cfg 独立调试模式\n');
  const result = CfgManager.ensureCfgFile();
  console.log(`\n最终结果: ${result}`);
  process.exit(result ? 0 : 1);
}


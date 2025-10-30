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
   * 读取 cfg 模板并替换端口占位符
   */
  private static generateCfgContent(port: number): string {
    if (!fs.existsSync(this.CFG_TEMPLATE_PATH)) {
      throw new Error(`模板文件不存在: ${this.CFG_TEMPLATE_PATH}`);
    }
    
    const template = fs.readFileSync(this.CFG_TEMPLATE_PATH, 'utf-8');
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
      
      // 检查内容是否一致
      if (existingContent === expectedContent) {
        console.log(`✓ 配置文件已存在且内容一致: ${cfgFilePath}`);
        return cfgFilePath;
      } else {
        console.log(`⚠ 配置文件内容不一致，正在更新...`);
        fs.writeFileSync(cfgFilePath, expectedContent, 'utf-8');
        console.log(`✓ 配置文件已更新: ${cfgFilePath}`);
        return cfgFilePath;
      }
    } else {
      // 创建新文件
      fs.writeFileSync(cfgFilePath, expectedContent, 'utf-8');
      console.log(`✓ 配置文件已创建: ${cfgFilePath}`);
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


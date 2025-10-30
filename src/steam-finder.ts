import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/**
 * Steam 路径查找工具
 * 独立模块，方便测试和调试
 */
export class SteamFinder {
  /**
   * 检测是否在 WSL 环境
   */
  static isWSL(): boolean {
    try {
      const release = fs.readFileSync('/proc/version', 'utf-8').toLowerCase();
      return release.includes('microsoft') || release.includes('wsl');
    } catch {
      return false;
    }
  }

  /**
   * 转换 WSL 路径到 Windows 路径
   * /mnt/c/... -> C:\...
   */
  static wslToWindowsPath(wslPath: string): string {
    if (wslPath.startsWith('/mnt/')) {
      const parts = wslPath.split('/');
      const drive = parts[2].toUpperCase();
      const restPath = parts.slice(3).join('\\');
      return `${drive}:\\${restPath}`;
    }
    return wslPath;
  }

  /**
   * 转换 Windows 路径到 WSL 路径
   * C:\... -> /mnt/c/...
   */
  static windowsToWSLPath(winPath: string): string {
    if (winPath.match(/^[A-Z]:\\/i)) {
      const drive = winPath[0].toLowerCase();
      const restPath = winPath.slice(3).replace(/\\/g, '/');
      return `/mnt/${drive}/${restPath}`;
    }
    return winPath;
  }

  /**
   * 在 WSL 环境下执行 Windows 命令
   */
  private static execWindowsCommand(command: string): string {
    try {
      // 在 WSL 中使用 cmd.exe 执行 Windows 命令
      const output = execSync(`cmd.exe /c ${command}`, { 
        encoding: 'utf-8',
        windowsHide: true 
      });
      return output;
    } catch (error) {
      throw new Error(`执行 Windows 命令失败: ${error}`);
    }
  }

  /**
   * 读取 Windows 注册表获取 Steam 安装路径
   * 支持 Windows 和 WSL 环境
   */
  static getSteamPathFromRegistry(): string | null {
    console.log(`[调试] 操作系统: ${process.platform}`);
    console.log(`[调试] 是否为 WSL: ${this.isWSL()}`);

    try {
      let output: string;
      const regQuery = 'reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath';
      
      if (this.isWSL()) {
        console.log('[调试] WSL 环境，使用 cmd.exe 执行注册表查询');
        output = this.execWindowsCommand(regQuery);
      } else if (process.platform === 'win32') {
        console.log('[调试] Windows 环境，直接查询注册表');
        output = execSync(regQuery, { encoding: 'utf-8' });
      } else {
        console.log('[调试] 非 Windows 系统，跳过注册表查询');
        return null;
      }

      console.log('[调试] 注册表查询输出:', output.substring(0, 200));
      
      // 解析输出: InstallPath    REG_SZ    C:\Program Files (x86)\Steam
      const match = output.match(/InstallPath\s+REG_SZ\s+(.+)/);
      if (match && match[1]) {
        const steamPath = match[1].trim().replace(/\r/g, '');
        console.log(`[调试] 解析到 Steam 路径: ${steamPath}`);
        
        // 在 WSL 中转换为 WSL 路径
        if (this.isWSL()) {
          const wslPath = this.windowsToWSLPath(steamPath);
          console.log(`[调试] 转换为 WSL 路径: ${wslPath}`);
          return wslPath;
        }
        
        return steamPath;
      } else {
        console.log('[调试] 无法解析注册表输出');
      }
    } catch (error) {
      console.log('[调试] 注册表查询失败:', error instanceof Error ? error.message : error);
    }
    
    return null;
  }

  /**
   * 解析 Steam 的 libraryfolders.vdf 文件获取所有库文件夹
   */
  static getSteamLibraryFolders(steamPath: string): string[] {
    console.log(`[调试] 查找 libraryfolders.vdf: ${steamPath}`);
    
    const libraryFile = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    
    if (!fs.existsSync(libraryFile)) {
      console.log('[调试] libraryfolders.vdf 不存在，返回主 Steam 路径');
      return [steamPath];
    }

    try {
      const content = fs.readFileSync(libraryFile, 'utf-8');
      console.log(`[调试] libraryfolders.vdf 文件大小: ${content.length} 字节`);
      
      const libraries: string[] = [steamPath];
      
      // 简单的 VDF 解析：匹配 "path" "路径" 格式
      const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/gi);
      
      let matchCount = 0;
      for (const match of pathMatches) {
        if (match[1]) {
          matchCount++;
          // 处理双反斜杠 \\ -> \
          let libraryPath = match[1].replace(/\\\\/g, '\\');
          
          // 在 WSL 中转换 Windows 路径
          if (this.isWSL() && libraryPath.match(/^[A-Z]:\\/i)) {
            libraryPath = this.windowsToWSLPath(libraryPath);
          }
          
          console.log(`[调试] 找到库文件夹 ${matchCount}: ${libraryPath}`);
          libraries.push(libraryPath);
        }
      }
      
      console.log(`[调试] 共找到 ${libraries.length} 个库文件夹`);
      return libraries;
    } catch (error) {
      console.log('[调试] 解析 libraryfolders.vdf 失败:', error);
      return [steamPath];
    }
  }

  /**
   * 查找 Dota2 配置目录
   * 返回详细的调试信息
   */
  static findDota2CfgPath(): string | null {
    console.log('='.repeat(60));
    console.log('开始查找 Dota2 配置目录');
    console.log('='.repeat(60));

    const dota2RelativePath = path.join('steamapps', 'common', 'dota 2 beta', 'game', 'dota', 'cfg', 'gamestate_integration');
    
    // 方法 1: 从注册表获取 Steam 路径
    console.log('\n[方法 1] 从注册表获取 Steam 路径');
    const steamPath = this.getSteamPathFromRegistry();
    
    if (steamPath) {
      console.log(`✓ Steam 路径: ${steamPath}`);
      
      // 获取所有 Steam 库文件夹
      console.log('\n[方法 1.1] 解析库文件夹');
      const libraries = this.getSteamLibraryFolders(steamPath);
      
      // 在每个库文件夹中查找 Dota2
      console.log('\n[方法 1.2] 查找 Dota2');
      for (let i = 0; i < libraries.length; i++) {
        const library = libraries[i];
        const dotaPath = path.join(library, dota2RelativePath);
        console.log(`  检查 [${i + 1}/${libraries.length}]: ${dotaPath}`);
        
        if (fs.existsSync(dotaPath)) {
          console.log('='.repeat(60));
          console.log(`✓✓✓ 找到 Dota2 配置目录！`);
          console.log(`路径: ${dotaPath}`);
          console.log('='.repeat(60));
          return dotaPath;
        } else {
          console.log(`  ✗ 不存在`);
        }
      }
      console.log('✗ 在所有库文件夹中都未找到 Dota2');
    } else {
      console.log('✗ 无法获取 Steam 路径');
    }

    // 方法 2: 尝试常见路径（备用方案）
    console.log('\n[方法 2] 尝试常见安装路径');
    
    let commonPaths: string[];
    
    if (this.isWSL()) {
      // WSL 环境使用 /mnt/ 路径
      commonPaths = [
        path.join('/mnt/c/Program Files (x86)/Steam', dota2RelativePath),
        path.join('/mnt/c/Program Files/Steam', dota2RelativePath),
        path.join('/mnt/d/Steam', dota2RelativePath),
        path.join('/mnt/e/Steam', dota2RelativePath),
      ];
    } else {
      // Windows 环境使用标准路径
      commonPaths = [
        path.join('C:\\Program Files (x86)\\Steam', dota2RelativePath),
        path.join('C:\\Program Files\\Steam', dota2RelativePath),
        path.join('D:\\Steam', dota2RelativePath),
        path.join('E:\\Steam', dota2RelativePath),
        path.join(os.homedir(), 'Steam', dota2RelativePath)
      ];
    }

    for (let i = 0; i < commonPaths.length; i++) {
      const p = commonPaths[i];
      console.log(`  检查 [${i + 1}/${commonPaths.length}]: ${p}`);
      
      if (fs.existsSync(p)) {
        console.log('='.repeat(60));
        console.log(`✓✓✓ 找到 Dota2 配置目录！`);
        console.log(`路径: ${p}`);
        console.log('='.repeat(60));
        return p;
      } else {
        console.log(`  ✗ 不存在`);
      }
    }

    console.log('='.repeat(60));
    console.log('✗✗✗ 未找到 Dota2 配置目录');
    console.log('提示: 请确保 Dota2 已正确安装');
    console.log('='.repeat(60));
    return null;
  }
}

// 如果直接运行此文件，执行查找
if (require.main === module) {
  console.log('Steam Finder 独立调试模式\n');
  const result = SteamFinder.findDota2CfgPath();
  console.log(`\n最终结果: ${result || '未找到'}`);
  process.exit(result ? 0 : 1);
}


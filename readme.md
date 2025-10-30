本仓库核心功能：从夯到拉评价自己在dota2游戏中遇到的队友和对手


技术栈：
electron，所有功能最后会被打包成单个exe文件
typescript，核心语言

前端界面：html+css+js
后端服务：nodejs
数据库：待定

核心原理：
valve官方Game State Integration

使用流程：
1. 打开exe和dota2
2. 在dota2指定目录创建cfg文件（如果事先不存在）
3. 开启后台服务器监听指定端口，并记录所有事件
4. 在选人界面、结算界面根据当前队友对手id，从数据库中寻找记录
5. Overlay显示应用界面
6. 其他时间隐藏界面
7. 可以将所有数据记录导出



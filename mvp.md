这是实现核心功能之前的最小mvp版本

需要以下功能

1. 在dota2指定目录创建cfg文件
1.1 寻找dota2 cfg目录
下面这个文件就是overwolf创建的cfg文件
@c:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\gamestate_integration_overwolf.cfg 
1.2 创建一个cfg文件在public目录作为静态资源，同时也方便我进行调整
1.2.1 cfg文件中监听的端口可以用占位符代替，打开应用的时候再检查判断可用端口
1.3 打开应用的时候检查cfg目录有没有对应cfg文件 文件内容是否一致，没有就创建 不一致就改写 一致则跳过
1.4 package.json新增命令 find-dota 对应1.1的函数 setup-cfg对应1.3的函数

2. 开启后台服务器监听指定端口，并记录所有事件
2.1 这个端口和1.2文件的端口一致
2.2 记录接收到的所有事件并记录
2.3 核心记录逻辑参考https://github.com/pjmagee/dota2-helper


3. 有一个简单的页面展示监听到的事件数据（无需样式，清晰展示数据即可，也不需要overlay能力）
这个页面目前只需要展示2.2记录到的所有数据即可，不需要任何其他多余样式


4. 可以打包成一个exe
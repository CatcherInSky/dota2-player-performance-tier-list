/**
 * 应用说明组件
 * 显示应用使用说明
 */

export function AppGuide() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Dota 2 玩家表现评价系统</h1>
      
      <div className="space-y-4 text-gray-300">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">功能介绍</h2>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>自动记录比赛数据：比赛结束后自动收集比赛信息和玩家数据</li>
            <li>玩家评价系统：为遇到的玩家评分和评论，建立个人数据库</li>
            <li>历史数据查看：查看所有比赛、玩家和评价记录</li>
            <li>胜率统计：计算与玩家的友方/敌方胜率</li>
            <li>词云展示：查看玩家收到的常用评价关键词</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">使用说明</h2>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              <strong>开始游戏：</strong>启动 Dota 2 后，应用会自动检测游戏状态
            </li>
            <li>
              <strong>策略阶段：</strong>在选人阶段，应用会显示玩家简单评价（胜率、评分、词云）
            </li>
            <li>
              <strong>比赛结束：</strong>比赛结束后，可以编辑对每个玩家的评分和评论
            </li>
            <li>
              <strong>查看历史：</strong>在桌面窗口查看所有比赛、玩家和评价记录
            </li>
            <li>
              <strong>账号切换：</strong>如果使用多个账号，可以切换查看不同账号的数据
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">快捷键</h2>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Alt+Shift+D</kbd> - 切换窗口显示/隐藏</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">数据说明</h2>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>所有数据存储在本地 IndexedDB 数据库中</li>
            <li>数据不会上传到服务器，完全本地化</li>
            <li>支持数据导入/导出功能（在设置页面）</li>
          </ul>
        </section>

        <div className="mt-6 p-4 bg-slate-800 rounded border border-slate-700">
          <p className="text-sm text-gray-400">
            <strong>提示：</strong>首次使用需要等待游戏结束后才会开始收集数据。建议先进行一局游戏，然后返回查看数据。
          </p>
        </div>
      </div>
    </div>
  );
}


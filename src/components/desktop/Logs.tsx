import { useMemo } from 'react';

interface LogEntry {
  id: string;
  timestamp: number;
  category: string;
  data: any;
}

interface LogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function Logs({ logs, onClear }: LogsProps) {
  const reversedLogs = useMemo(() => [...logs].reverse(), [logs]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">事件日志</h2>
        <button
          onClick={onClear}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
        >
          清空
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {reversedLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">暂无日志数据</div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-700">
            {reversedLogs.map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>{new Date(log.timestamp).toLocaleString('zh-CN')}</span>
                  <span className="text-blue-300">{log.category}</span>
                </div>
                <pre className="bg-slate-900/60 rounded p-3 text-xs text-gray-200 whitespace-pre-wrap break-all">
{JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



/**
 * 数据导入导出工具
 */

import { db } from '@main/database/db';
import type { ExportData } from '@shared/types/database';

/**
 * 导出数据为 JSON
 */
export async function exportData(): Promise<void> {
  const matches = await db.matches.toArray();
  const players = await db.players.toArray();
  const match_players = await db.match_players.toArray();
  const reviews = await db.reviews.toArray();

  const exportData: ExportData = {
    version: '1.0',
    export_time: Date.now(),
    app_version: '1.0.0',
    data: { matches, players, match_players, reviews },
    metadata: {
      total_matches: matches.length,
      total_players: players.length,
      total_reviews: reviews.length,
    },
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });

  const filename = `dota2-reviews-${new Date().toISOString().slice(0, 10)}.json`;
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导入 JSON 数据
 */
export async function importData(file: File): Promise<{
  success: boolean;
  imported: {
    matches: number;
    players: number;
    reviews: number;
  };
}> {
  const text = await file.text();
  const importData: ExportData = JSON.parse(text);

  // 版本检查
  if (importData.version !== '1.0') {
    throw new Error('不支持的数据版本');
  }

  // 导入数据（使用 bulkPut，相同ID会覆盖）
  await db.transaction(
    'rw',
    [db.matches, db.players, db.match_players, db.reviews],
    async () => {
      await db.matches.bulkPut(importData.data.matches);
      await db.players.bulkPut(importData.data.players);
      await db.match_players.bulkPut(importData.data.match_players);
      await db.reviews.bulkPut(importData.data.reviews);
    }
  );

  return {
    success: true,
    imported: {
      matches: importData.data.matches.length,
      players: importData.data.players.length,
      reviews: importData.data.reviews.length,
    },
  };
}


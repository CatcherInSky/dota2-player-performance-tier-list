/**
 * 数据库操作统一导出
 */

export { db } from './db';
export * from './matches';
export * from './players';
export * from './reviews';

import { db } from './db';

/**
 * 删除所有数据
 */
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.matches, db.players, db.match_players, db.reviews, async () => {
    await db.matches.clear();
    await db.players.clear();
    await db.match_players.clear();
    await db.reviews.clear();
  });
}

/**
 * 导出所有数据
 */
export async function exportAllData() {
  const [matches, players, match_players, reviews] = await Promise.all([
    db.matches.toArray(),
    db.players.toArray(),
    db.match_players.toArray(),
    db.reviews.toArray(),
  ]);

  return {
    version: '1.0.0',
    exported_at: Date.now(),
    data: {
      matches,
      players,
      match_players,
      reviews,
    },
  };
}

/**
 * 导入数据
 */
export async function importAllData(data: any): Promise<{
  imported: { matches: number; players: number; match_players: number; reviews: number };
  errors: string[];
}> {
  const errors: string[] = [];
  let imported = {
    matches: 0,
    players: 0,
    match_players: 0,
    reviews: 0,
  };

  await db.transaction('rw', db.matches, db.players, db.match_players, db.reviews, async () => {
    // 导入比赛
    if (data.data.matches) {
      for (const match of data.data.matches) {
        try {
          await db.matches.put(match);
          imported.matches++;
        } catch (error) {
          errors.push(`Match ${match.id}: ${error}`);
        }
      }
    }

    // 导入玩家
    if (data.data.players) {
      for (const player of data.data.players) {
        try {
          await db.players.put(player);
          imported.players++;
        } catch (error) {
          errors.push(`Player ${player.steam_id}: ${error}`);
        }
      }
    }

    // 导入比赛玩家
    if (data.data.match_players) {
      for (const mp of data.data.match_players) {
        try {
          await db.match_players.put(mp);
          imported.match_players++;
        } catch (error) {
          errors.push(`Match Player ${mp.id}: ${error}`);
        }
      }
    }

    // 导入点评
    if (data.data.reviews) {
      for (const review of data.data.reviews) {
        try {
          await db.reviews.put(review);
          imported.reviews++;
        } catch (error) {
          errors.push(`Review ${review.id}: ${error}`);
        }
      }
    }
  });

  return { imported, errors };
}


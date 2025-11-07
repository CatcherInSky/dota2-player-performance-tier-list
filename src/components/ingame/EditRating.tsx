/**
 * 编辑评价组件（赛后阶段）
 * 编辑即保存，实时保存到 IndexedDB
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ratingsRepository } from '../../db/repositories/ratings.repository';

interface Player {
  playerId?: string | number;
  playerName?: string;
  heroName?: string;
  team?: string;
}

interface EditRatingProps {
  players: Player[];
  matchId?: string | number;
}

interface PlayerRating {
  player: Player;
  score: 1 | 2 | 3 | 4 | 5;
  comment: string;
  saving: boolean;
  saved: boolean;
}


const DEFAULT_ACCOUNT_ID = 'spectator';

export function EditRating({ players, matchId }: EditRatingProps) {
  const [playerRatings, setPlayerRatings] = useState<PlayerRating[]>([]);
  const [matchIdState, setMatchIdState] = useState<string | number | null>(matchId || null);
  const accountIdRef = useRef<string>(DEFAULT_ACCOUNT_ID);

  useEffect(() => {
    // 如果没有 matchId，尝试获取
    if (!matchIdState) {
      getMatchId();
    }
  }, [matchIdState]);

  useEffect(() => {
    // 初始化玩家评分（默认3星）
    if (players.length > 0) {
      setPlayerRatings(
        players.map((player) => ({
          player,
          score: 3,
          comment: '',
          saving: false,
          saved: false,
        }))
      );
    }
  }, [players]);

  const getMatchId = async () => {
    try {
      if (typeof overwolf !== 'undefined') {
        // 尝试从 getInfo 获取
        overwolf.games.events.getInfo((result: any) => {
          if (result && result.res && result.res.match_info) {
            const id = result.res.match_info.pseudo_match_id || result.res.match_info.match_id;
            if (id) {
              setMatchIdState(id);
            }
          }
        });
      }
    } catch (error) {
      console.error('[EditRating] Error getting match_id:', error);
    }
  };

  const handleScoreChange = async (index: number, score: 1 | 2 | 3 | 4 | 5) => {
    const newRatings = [...playerRatings];
    newRatings[index].score = score;
    newRatings[index].saved = false;
    setPlayerRatings(newRatings);

    // 立即保存评分
    await saveRating(index, newRatings[index]);
  };

  const handleCommentChange = (index: number, comment: string) => {
    const newRatings = [...playerRatings];
    newRatings[index].comment = comment;
    newRatings[index].saved = false;
    setPlayerRatings(newRatings);

    // 使用防抖保存评论
    debouncedSaveComment(index, comment);
  };

  // 防抖保存评论的定时器
  const commentSaveTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const debouncedSaveComment = useCallback((index: number, comment: string) => {
    // 清除之前的定时器
    const existingTimer = commentSaveTimers.current.get(index);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      setPlayerRatings((prevRatings) => {
        const currentRating = prevRatings[index];
        if (currentRating && currentRating.comment === comment) {
          saveRating(index, { ...currentRating, comment });
        }
        return prevRatings;
      });
      commentSaveTimers.current.delete(index);
    }, 800);

    commentSaveTimers.current.set(index, timer);
  }, []);

  const saveRating = useCallback(async (index: number, rating: PlayerRating) => {
    // 使用最新的状态值
    const matchId = matchIdState;

    if (!rating.player.playerId) {
      return;
    }

    // 验证 match_id
    let finalMatchId = matchId;
    if (!finalMatchId) {
      console.warn('[EditRating] No match_id, using temp ID');
      finalMatchId = `temp_${Date.now()}`;
    }

    try {
      setPlayerRatings((prevRatings) => {
        const newRatings = [...prevRatings];
        newRatings[index].saving = true;
        return newRatings;
      });

      // 检查是否已存在该评分（同一玩家、同一账户、同一比赛）
      const existing = await ratingsRepository.findByPlayerIdAndAccountIdAndMatchId(
        rating.player.playerId,
        accountIdRef.current,
        finalMatchId
      );

      if (existing && existing.length > 0) {
        // 更新现有评分
        await ratingsRepository.update(existing[0].uuid, {
          score: rating.score,
          comment: rating.comment || undefined,
        });
      } else {
        // 创建新评分
        await ratingsRepository.create({
          player_id: rating.player.playerId,
          account_id: accountIdRef.current,
          match_id: finalMatchId,
          score: rating.score,
          comment: rating.comment || undefined,
          created_at: Math.floor(Date.now() / 1000),
        });
      }

      setPlayerRatings((prevRatings) => {
        const newRatings = [...prevRatings];
        newRatings[index].saving = false;
        newRatings[index].saved = true;
        return newRatings;
      });

      // 2秒后清除保存状态提示
      setTimeout(() => {
        setPlayerRatings((prevRatings) => {
          const updatedRatings = [...prevRatings];
          updatedRatings[index].saved = false;
          return updatedRatings;
        });
      }, 2000);
    } catch (error) {
      console.error('[EditRating] Error saving rating:', error);
      setPlayerRatings((prevRatings) => {
        const newRatings = [...prevRatings];
        newRatings[index].saving = false;
        return newRatings;
      });
    }
  }, [matchIdState]);

  const handleSetAllThreeStars = () => {
    const newRatings = playerRatings.map((pr) => ({ ...pr, score: 3 as const }));
    setPlayerRatings(newRatings);
    // 保存所有评分
    newRatings.forEach((pr, index) => {
      saveRating(index, pr);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">编辑评价</h2>
        <button
          onClick={handleSetAllThreeStars}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
        >
          全部 3 星
        </button>
      </div>

      {playerRatings.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">暂无玩家数据</div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {playerRatings.map((rating, index) => (
            <PlayerRatingCard
              key={index}
              rating={rating}
              onScoreChange={(score) => handleScoreChange(index, score)}
              onCommentChange={(comment) => handleCommentChange(index, comment)}
            />
          ))}
        </div>
      )}

      {!matchIdState && (
        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded text-xs text-yellow-400">
          警告: 未获取到 match_id，将使用临时 ID
        </div>
      )}
    </div>
  );
}

function PlayerRatingCard({
  rating,
  onScoreChange,
  onCommentChange,
}: {
  rating: PlayerRating;
  onScoreChange: (score: 1 | 2 | 3 | 4 | 5) => void;
  onCommentChange: (comment: string) => void;
}) {
  const teamColor = rating.player.team === 'radiant' ? 'border-green-500' : 
                    rating.player.team === 'dire' ? 'border-red-500' : 
                    'border-gray-500';

  return (
    <div className={`p-4 rounded bg-white/10 border-l-2 ${teamColor}`}>
      <div className="mb-3">
        <div className="font-medium text-sm">{rating.player.playerName || '未知玩家'}</div>
        {rating.player.heroName && (
          <div className="text-xs text-gray-400 mt-1">英雄: {rating.player.heroName}</div>
        )}
      </div>

      {/* 评分 */}
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-2">评分:</div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              onClick={() => onScoreChange(score as 1 | 2 | 3 | 4 | 5)}
              className={`w-8 h-8 rounded transition-colors ${
                rating.score >= score
                  ? 'bg-yellow-500 text-black'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* 评论 */}
      <div>
        <div className="text-xs text-gray-400 mb-2">评论:</div>
        <textarea
          value={rating.comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="输入评论（可选）"
          maxLength={500}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
        />
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-gray-500">
            {rating.comment.length}/500
          </div>
          <div className="flex items-center gap-2 text-xs">
            {rating.saving && <span className="text-blue-400">保存中...</span>}
            {rating.saved && <span className="text-green-400">已保存</span>}
          </div>
        </div>
      </div>
    </div>
  );
}


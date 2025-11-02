import React, { useState } from 'react';
import { useDatabase } from '@renderer/shared/hooks/useDatabase';
import { Button } from '@renderer/shared/components/Button';
import { Input } from '@renderer/shared/components/Input';
import { RatingStars } from '@renderer/shared/components/RatingStars';
import type { RosterPlayer } from '@shared/types/gep';
import type { ReviewInput } from '@main/database/reviews';

interface ReviewModeProps {
  rosterPlayers: RosterPlayer[];
  localSteamId: string;
  matchId: string;
  onClose: () => void;
}

export function ReviewMode({
  rosterPlayers,
  localSteamId,
  matchId,
  onClose,
}: ReviewModeProps) {
  const { saveReviewsData } = useDatabase();
  const [reviews, setReviews] = useState<Map<string, ReviewInput>>(new Map());
  const [saving, setSaving] = useState(false);

  // 过滤掉自己
  const otherPlayers = rosterPlayers.filter((p) => p.steamid !== localSteamId);

  const handleRatingChange = (steamId: string, score: number) => {
    setReviews((prev) => {
      const newReviews = new Map(prev);
      const current = newReviews.get(steamId) || { steam_id: steamId };
      newReviews.set(steamId, { ...current, score: score as 1 | 2 | 3 | 4 | 5 });
      return newReviews;
    });
  };

  const handleCommentChange = (steamId: string, comment: string) => {
    setReviews((prev) => {
      const newReviews = new Map(prev);
      const current = newReviews.get(steamId) || { steam_id: steamId };
      newReviews.set(steamId, { ...current, comment });
      return newReviews;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const reviewsArray = Array.from(reviews.values()).filter((r) => r.score);
      await saveReviewsData(matchId, reviewsArray, localSteamId);
      onClose();
    } catch (error) {
      console.error('Failed to save reviews:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">对局点评 - 请为本场玩家评分</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSkip} size="sm">
            跳过
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* 玩家卡片网格 */}
      <div className="grid grid-cols-3 gap-4">
        {otherPlayers.map((player) => (
          <PlayerReviewCard
            key={player.steamid}
            player={player}
            review={reviews.get(player.steamid)}
            onRatingChange={(score) => handleRatingChange(player.steamid, score)}
            onCommentChange={(comment) =>
              handleCommentChange(player.steamid, comment)
            }
          />
        ))}
      </div>

      {/* 提示信息 */}
      <div className="mt-6 text-center text-sm text-gray-400">
        <p>可选择性评价，未评分的玩家不会被记录</p>
      </div>
    </div>
  );
}

function PlayerReviewCard({
  player,
  review,
  onRatingChange,
  onCommentChange,
}: {
  player: RosterPlayer;
  review?: ReviewInput;
  onRatingChange: (score: number) => void;
  onCommentChange: (comment: string) => void;
}) {
  const teamColor =
    player.team === 'radiant'
      ? 'border-radiant text-radiant'
      : 'border-dire text-dire';

  return (
    <div className={`bg-gray-900/90 border-2 rounded-lg p-4 ${teamColor}`}>
      {/* 英雄和玩家信息 */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">{player.hero}</div>
        <div className="text-white font-medium truncate" title={player.player_name}>
          {player.player_name || '匿名玩家'}
        </div>
        <div className="text-xs text-gray-400">
          {player.team === 'radiant' ? '天辉' : '夜魇'}
        </div>
      </div>

      {/* 评分星星 */}
      <div className="flex justify-center mb-3">
        <RatingStars
          value={review?.score || 0}
          onChange={onRatingChange}
          size="md"
        />
      </div>

      {/* 评论输入 */}
      <Input
        placeholder="简短评论（可选）"
        value={review?.comment || ''}
        onChange={(e) => onCommentChange(e.target.value)}
        maxLength={50}
        className="text-sm"
      />
    </div>
  );
}


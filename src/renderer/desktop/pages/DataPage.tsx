import React, { useState, useEffect } from 'react';
import { useDatabase } from '@renderer/shared/hooks/useDatabase';
import { Table } from '@renderer/shared/components/Table';
import { Pagination } from '@renderer/shared/components/Pagination';
import { Select } from '@renderer/shared/components/Select';
import { Input } from '@renderer/shared/components/Input';
import { formatDate, formatDuration, formatRating } from '@renderer/shared/utils/format';
import type { Match, Player, Review } from '@shared/types/database';

type TabType = 'matches' | 'players' | 'reviews';

export function DataPage() {
  const { getAllMatches, getAllPlayers, getAllReviews } = useDatabase();
  const [activeTab, setActiveTab] = useState<TabType>('matches');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 比赛数据
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [matchFilter, setMatchFilter] = useState({ mode: 'all', result: 'all' });

  // 玩家数据
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');

  // 点评数据
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [reviewFilter, setReviewFilter] = useState({ search: '', rating: 'all' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterMatches();
  }, [matches, matchFilter]);

  useEffect(() => {
    filterPlayers();
  }, [players, playerSearch]);

  useEffect(() => {
    filterReviews();
  }, [reviews, reviewFilter]);

  async function loadData() {
    const [matchesData, playersData, reviewsData] = await Promise.all([
      getAllMatches(),
      getAllPlayers(),
      getAllReviews(),
    ]);
    setMatches(matchesData);
    setFilteredMatches(matchesData);
    setPlayers(playersData);
    setFilteredPlayers(playersData);
    setReviews(reviewsData);
    setFilteredReviews(reviewsData);
  }

  function filterMatches() {
    let filtered = [...matches];
    if (matchFilter.mode !== 'all') {
      filtered = filtered.filter((m) => m.game_mode === matchFilter.mode);
    }
    if (matchFilter.result !== 'all') {
      filtered = filtered.filter((m) => m.result === matchFilter.result);
    }
    setFilteredMatches(filtered);
    setCurrentPage(1);
  }

  function filterPlayers() {
    let filtered = [...players];
    if (playerSearch) {
      filtered = filtered.filter((p) =>
        p.current_name.toLowerCase().includes(playerSearch.toLowerCase())
      );
    }
    setFilteredPlayers(filtered);
    setCurrentPage(1);
  }

  function filterReviews() {
    let filtered = [...reviews];
    if (reviewFilter.search) {
      filtered = filtered.filter(
        (r) =>
          r.comment.toLowerCase().includes(reviewFilter.search.toLowerCase())
      );
    }
    if (reviewFilter.rating !== 'all') {
      filtered = filtered.filter((r) => r.score === Number(reviewFilter.rating));
    }
    setFilteredReviews(filtered);
    setCurrentPage(1);
  }

  // 分页逻辑
  const getCurrentPageData = <T,>(data: T[]): T[] => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  };

  const totalPages = Math.ceil(
    (activeTab === 'matches'
      ? filteredMatches.length
      : activeTab === 'players'
      ? filteredPlayers.length
      : filteredReviews.length) / pageSize
  );

  // 表格列定义
  const matchColumns = [
    { key: 'start_time', title: '时间', render: (val: number) => formatDate(val) },
    { key: 'game_mode', title: '模式' },
    {
      key: 'result',
      title: '结果',
      render: (val: string) =>
        val === 'win' ? (
          <span className="text-green-400">胜利</span>
        ) : val === 'lose' ? (
          <span className="text-red-400">失败</span>
        ) : (
          <span className="text-gray-400">未知</span>
        ),
    },
    {
      key: 'duration',
      title: '时长',
      render: (val?: number) => (val ? formatDuration(val) : '-'),
    },
    {
      key: 'radiant_score',
      title: '比分',
      render: (_: any, record: Match) =>
        record.radiant_score !== undefined && record.dire_score !== undefined
          ? `${record.radiant_score} : ${record.dire_score}`
          : '-',
    },
  ];

  const playerColumns = [
    {
      key: 'current_name',
      title: '昵称',
      render: (val: string, record: Player) => (
        <div>
          <div>{val}</div>
          {record.name_history && record.name_history.length > 0 && (
            <div className="text-xs text-gray-500">
              曾用名: {record.name_history.join(', ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'review_count',
      title: '遇到次数',
      render: (val?: number) => val || 0,
    },
    {
      key: 'avg_score',
      title: '平均评分',
      render: (val?: number) =>
        val ? (
          <div className="flex items-center gap-2">
            {formatRating(Math.round(val))}
            <span className="text-sm">{val.toFixed(1)}</span>
          </div>
        ) : (
          '-'
        ),
    },
    {
      key: 'last_seen',
      title: '最后遇到',
      render: (val: number) => formatDate(val),
    },
  ];

  const reviewColumns = [
    {
      key: 'created_at',
      title: '时间',
      render: (val: number) => formatDate(val),
    },
    { key: 'steam_id', title: '玩家ID' },
    {
      key: 'score',
      title: '评分',
      render: (val: number) => (
        <div className="flex items-center gap-2">
          {formatRating(val)}
          <span className="text-sm">{val}</span>
        </div>
      ),
    },
    { key: 'comment', title: '评论' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab 导航 */}
      <div className="flex gap-2 border-b border-gray-800">
        {[
          { key: 'matches' as TabType, label: '比赛' },
          { key: 'players' as TabType, label: '玩家' },
          { key: 'reviews' as TabType, label: '点评' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-4">
        {activeTab === 'matches' && (
          <>
            <Select
              label="游戏模式"
              options={[
                { value: 'all', label: '全部' },
                { value: 'All Pick', label: 'All Pick' },
                { value: 'Ranked', label: '天梯' },
                { value: 'Turbo', label: '快速' },
              ]}
              value={matchFilter.mode}
              onChange={(e) =>
                setMatchFilter({ ...matchFilter, mode: e.target.value })
              }
            />
            <Select
              label="结果"
              options={[
                { value: 'all', label: '全部' },
                { value: 'win', label: '胜利' },
                { value: 'lose', label: '失败' },
              ]}
              value={matchFilter.result}
              onChange={(e) =>
                setMatchFilter({ ...matchFilter, result: e.target.value })
              }
            />
          </>
        )}
        {activeTab === 'players' && (
          <Input
            label="搜索玩家"
            placeholder="输入玩家昵称..."
            value={playerSearch}
            onChange={(e) => setPlayerSearch(e.target.value)}
          />
        )}
        {activeTab === 'reviews' && (
          <>
            <Input
              label="搜索评论"
              placeholder="输入关键词..."
              value={reviewFilter.search}
              onChange={(e) =>
                setReviewFilter({ ...reviewFilter, search: e.target.value })
              }
            />
            <Select
              label="评分"
              options={[
                { value: 'all', label: '全部' },
                { value: '5', label: '5星' },
                { value: '4', label: '4星' },
                { value: '3', label: '3星' },
                { value: '2', label: '2星' },
                { value: '1', label: '1星' },
              ]}
              value={reviewFilter.rating}
              onChange={(e) =>
                setReviewFilter({ ...reviewFilter, rating: e.target.value })
              }
            />
          </>
        )}
      </div>

      {/* 数据表格 */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {activeTab === 'matches' && (
          <Table
            columns={matchColumns}
            data={getCurrentPageData(filteredMatches)}
            keyField="id"
          />
        )}
        {activeTab === 'players' && (
          <Table
            columns={playerColumns}
            data={getCurrentPageData(filteredPlayers)}
            keyField="steam_id"
          />
        )}
        {activeTab === 'reviews' && (
          <Table
            columns={reviewColumns}
            data={getCurrentPageData(filteredReviews)}
            keyField="id"
          />
        )}

        {/* 分页器 */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}


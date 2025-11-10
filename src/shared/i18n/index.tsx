import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { BackgroundApi } from '../api/background'
import { useBackgroundApi } from '../hooks/useBackgroundApi'
import { useBackgroundEvents } from '../hooks/useBackgroundEvents'
import type { SettingsRecord } from '../types/database'

type Language = 'zh-CN' | 'en-US'

type MessageDictionary = Record<Language, Record<string, string>>

const messages: MessageDictionary = {
  'zh-CN': {
    'nav.back': '后退',
    'nav.forward': '前进',
    'nav.home': '主页',
    'nav.settings': '设置',
    'home.matches': '比赛表',
    'home.players': '玩家表',
    'home.comments': '评价表',
    'home.noData': '暂无数据',
    'home.search': '搜索',
    'home.reset': '重置',
    'matches.matchId': '比赛ID',
    'matches.gameMode': '游戏模式',
    'matches.updatedAt': '更新时间',
    'matches.result': '胜负',
    'matches.win': '胜利',
    'matches.lose': '失败',
    'matches.unknown': '未知',
    'matches.filters.time': '时间范围',
    'matches.filters.mode': '模式',
    'matches.filters.result': '胜负',
    'players.name': '名称',
    'players.id': '玩家ID',
    'players.first': '第一次遭遇',
    'players.last': '上次遭遇',
    'players.encounterCount': '遭遇次数',
    'players.averageScore': '平均分',
    'players.filters.keyword': '玩家名称',
    'players.filters.hero': '英雄',
    'players.filters.time': '比赛时间',
    'comments.score': '分数',
    'comments.matchId': '比赛ID',
    'comments.playerName': '玩家',
    'comments.comment': '评论',
    'comments.updatedAt': '更新时间',
    'comments.filters.score': '评分',
    'comments.filters.time': '评价时间',
    'comments.filters.player': '玩家ID',
    'comments.filters.match': '比赛ID',
    'settings.title': '设置',
    'settings.export': '导出数据',
    'settings.import': '导入数据',
    'settings.clear': '清空数据',
    'settings.language': '语言',
    'settings.language.zh': '中文',
    'settings.language.en': '英文',
    'settings.ratingLabels': '评分文案',
    'settings.save': '保存',
    'settings.cancel': '取消',
    'settings.import.placeholder': '粘贴导出的 JSON 数据',
    'settings.import.apply': '导入',
    'settings.import.success': '导入完成',
    'settings.rating.label': '评分 {star}',
    'match.detail.title': '比赛详情',
    'match.detail.score': '比分',
    'match.detail.winner': '胜者',
    'match.detail.players': '玩家列表',
    'player.detail.title': '玩家详情',
    'player.detail.aliases': '曾用名',
    'player.detail.heroes': '英雄',
    'player.detail.matches': '比赛记录',
    'player.detail.comments': '评分记录',
    'ingame.close': '关闭',
    'ingame.toggleHistory': '历史/编辑',
    'ingame.history.title': '评分历史',
    'ingame.edit.title': '更新评分',
    'ingame.comment.placeholder': '输入评价...',
    'ingame.save': '保存',
    'ingame.cancel': '取消',
    'ingame.history.empty': '暂无评分记录',
    'toast.saved': '已保存',
    'toast.failed': '操作失败',
  },
  'en-US': {
    'nav.back': 'Back',
    'nav.forward': 'Forward',
    'nav.home': 'Home',
    'nav.settings': 'Settings',
    'home.matches': 'Matches',
    'home.players': 'Players',
    'home.comments': 'Comments',
    'home.noData': 'No data available',
    'home.search': 'Search',
    'home.reset': 'Reset',
    'matches.matchId': 'Match ID',
    'matches.gameMode': 'Game Mode',
    'matches.updatedAt': 'Updated At',
    'matches.result': 'Result',
    'matches.win': 'Win',
    'matches.lose': 'Lose',
    'matches.unknown': 'Unknown',
    'matches.filters.time': 'Time Range',
    'matches.filters.mode': 'Mode',
    'matches.filters.result': 'Result',
    'players.name': 'Name',
    'players.id': 'Player ID',
    'players.first': 'First Encounter',
    'players.last': 'Last Encounter',
    'players.encounterCount': 'Encounters',
    'players.averageScore': 'Average Score',
    'players.filters.keyword': 'Player Name',
    'players.filters.hero': 'Hero',
    'players.filters.time': 'Match Time',
    'comments.score': 'Score',
    'comments.matchId': 'Match ID',
    'comments.playerName': 'Player',
    'comments.comment': 'Comment',
    'comments.updatedAt': 'Updated At',
    'comments.filters.score': 'Score',
    'comments.filters.time': 'Comment Time',
    'comments.filters.player': 'Player ID',
    'comments.filters.match': 'Match ID',
    'settings.title': 'Settings',
    'settings.export': 'Export Data',
    'settings.import': 'Import Data',
    'settings.clear': 'Clear Data',
    'settings.language': 'Language',
    'settings.language.zh': 'Chinese',
    'settings.language.en': 'English',
    'settings.ratingLabels': 'Rating Labels',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'settings.import.placeholder': 'Paste exported JSON here',
    'settings.import.apply': 'Import',
    'settings.import.success': 'Import complete',
    'settings.rating.label': 'Rating {star}',
    'match.detail.title': 'Match Detail',
    'match.detail.score': 'Score',
    'match.detail.winner': 'Winner',
    'match.detail.players': 'Players',
    'player.detail.title': 'Player Detail',
    'player.detail.aliases': 'Nicknames',
    'player.detail.heroes': 'Heroes',
    'player.detail.matches': 'Matches',
    'player.detail.comments': 'Ratings',
    'ingame.close': 'Close',
    'ingame.toggleHistory': 'History/Edit',
    'ingame.history.title': 'Rating History',
    'ingame.edit.title': 'Update Rating',
    'ingame.comment.placeholder': 'Write your thoughts...',
    'ingame.save': 'Save',
    'ingame.cancel': 'Cancel',
    'ingame.history.empty': 'No ratings yet',
    'toast.saved': 'Saved',
    'toast.failed': 'Action failed',
  },
}

interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language, sync?: boolean) => void
  t: (key: string, fallback?: string) => string
  settings: SettingsRecord | null
  ratingLabels: SettingsRecord['ratingLabels']
  backgroundApi: BackgroundApi | undefined
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const DEFAULT_LABELS: SettingsRecord['ratingLabels'] = {
  1: '拉',
  2: '菜鸟',
  3: 'NPC',
  4: '顶级',
  5: '夯',
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const backgroundApi = useBackgroundApi()
  const [language, setLanguageState] = useState<Language>('zh-CN')
  const [settings, setSettings] = useState<SettingsRecord | null>(null)

  useEffect(() => {
    if (!backgroundApi) return
    backgroundApi.settings
      .get()
      .then((fetched) => {
        setSettings(fetched)
        if (fetched.language) {
          setLanguageState(fetched.language)
        }
      })
      .catch((error) => {
        console.error('[I18n] Failed to load settings', error)
      })
  }, [backgroundApi])

  useBackgroundEvents(backgroundApi, 'settings:updated', (payload) => {
    setSettings(payload)
    if (payload.language) {
      setLanguageState(payload.language as Language)
    }
  })

  const setLanguage = useCallback(
    (lang: Language, sync = true) => {
      setLanguageState(lang)
      if (sync && backgroundApi) {
        void backgroundApi.settings.update({ language: lang })
      }
    },
    [backgroundApi],
  )

  const t = useCallback(
    (key: string, fallback?: string) => {
      const dict = messages[language] ?? {}
      return dict[key] ?? fallback ?? key
    },
    [language],
  )

  const ratingLabels = useMemo(() => settings?.ratingLabels ?? DEFAULT_LABELS, [settings])

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      settings,
      ratingLabels,
      backgroundApi,
    }),
    [language, setLanguage, t, settings, ratingLabels, backgroundApi],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}


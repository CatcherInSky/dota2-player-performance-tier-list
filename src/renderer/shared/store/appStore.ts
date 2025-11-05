/**
 * 全局应用状态管理
 * 使用 Zustand
 */

import { create } from 'zustand';
import type { RosterPlayer } from '@shared/types/gep';

interface AppState {
  // 游戏状态
  isGameRunning: boolean;
  gameState: string;
  matchState: string;
  
  // 玩家数据
  rosterPlayers: RosterPlayer[];
  localSteamId: string;
  localTeam: 'radiant' | 'dire' | '';
  
  // 比赛数据
  currentMatchId: string;
  matchStartTime: number;
  
  // UI 状态
  ingameMode: 'record' | 'review' | null;
  
  // Actions
  setGameRunning: (running: boolean) => void;
  setGameState: (state: string) => void;
  setMatchState: (state: string) => void;
  setRosterPlayers: (players: RosterPlayer[]) => void;
  setLocalPlayer: (steamId: string, team: 'radiant' | 'dire') => void;
  setCurrentMatch: (matchId: string, startTime: number) => void;
  setIngameMode: (mode: 'record' | 'review' | null) => void;
  reset: () => void;
}

const initialState = {
  isGameRunning: false,
  gameState: '',
  matchState: '',
  rosterPlayers: [],
  localSteamId: '',
  localTeam: '' as 'radiant' | 'dire' | '',
  currentMatchId: '',
  matchStartTime: 0,
  ingameMode: null as 'record' | 'review' | null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setGameRunning: (running) => set({ isGameRunning: running }),
  
  setGameState: (state) => set({ gameState: state }),
  
  setMatchState: (state) => set({ matchState: state }),
  
  setRosterPlayers: (players) => set({ rosterPlayers: players }),
  
  setLocalPlayer: (steamId, team) => set({ 
    localSteamId: steamId, 
    localTeam: team 
  }),
  
  setCurrentMatch: (matchId, startTime) => set({ 
    currentMatchId: matchId, 
    matchStartTime: startTime 
  }),
  
  setIngameMode: (mode) => set({ ingameMode: mode }),
  
  reset: () => set(initialState),
}));


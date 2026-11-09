import React from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { HostDashboard } from './HostDashboard';
import { TeamClient } from './TeamClient';
import { ArrowLeft, Monitor, Flame, Zap } from 'lucide-react';

interface SplitSimulationViewProps {
  roomCode: string;
  onExit: () => void;
}

export const SplitSimulationView: React.FC<SplitSimulationViewProps> = ({ roomCode, onExit }) => {
  // Host hook
  const hostHook = useGameSocket({ role: 'host', roomCode });
  // Team 1 hook
  const team1Hook = useGameSocket({ role: 'team1', roomCode });
  // Team 2 hook
  const team2Hook = useGameSocket({ role: 'team2', roomCode });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Simulation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-semibold z-40 sticky top-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Thoát chế độ mô phỏng
          </button>
          <span className="text-amber-400 font-bold hidden sm:inline">
            🛠️ Màn Hình Kiểm Thử 3-Trong-1 (Máy Chủ + Đội 1 + Đội 2)
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1 text-red-400">
            <Flame className="w-3.5 h-3.5" /> Đội 1 (Đỏ)
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-blue-400">
            <Zap className="w-3.5 h-3.5" /> Đội 2 (Xanh)
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-amber-400">
            <Monitor className="w-3.5 h-3.5" /> Máy Chủ
          </span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col divide-y divide-slate-800">
        {/* TOP: HOST SCREEN */}
        <div className="flex-1 min-h-[500px] border-b-4 border-amber-500/40">
          <div className="bg-amber-500/10 text-amber-400 text-xs px-4 py-1 font-bold flex items-center justify-between">
            <span>[MÀN HÌNH 1: MÁY CHỦ CHIẾU RẠP - THẤY CẢ 2 ĐỘI VÀ DÂY THỪNG]</span>
            <span className="text-[11px] text-slate-400">Màn hình điều khiển và ngân hàng câu hỏi</span>
          </div>
          {hostHook.gameState ? (
            <HostDashboard
              gameState={hostHook.gameState}
              questions={hostHook.questions}
              isConnected={hostHook.isConnected}
              lastPullEvent={hostHook.lastPullEvent}
              onStartGame={hostHook.hostStartGame}
              onNextRound={hostHook.hostNextRound}
              onPauseResume={hostHook.hostPauseResume}
              onResetGame={hostHook.hostResetGame}
              onAddQuestion={hostHook.hostAddQuestion}
              onEditQuestion={hostHook.hostEditQuestion}
              onDeleteQuestion={hostHook.hostDeleteQuestion}
              onLoadPreset={hostHook.hostLoadPreset}
              onAdjustRope={hostHook.hostAdjustRope}
              onSetConfig={hostHook.hostSetConfig}
              onUpdateTeamName={hostHook.updateTeamName}
              onRandomizeMembers={hostHook.randomizeMembers}
              onUpdateTeamIcon={hostHook.updateTeamIcon}
            />
          ) : (
            <div className="p-12 text-center text-slate-500">Đang khởi tạo kết nối Máy Chủ...</div>
          )}
        </div>

        {/* BOTTOM: 2 TEAM SCREENS SIDE BY SIDE */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
          {/* BOTTOM LEFT: TEAM 1 SCREEN */}
          <div className="flex-1 min-h-[450px]">
            <div className="bg-red-500/10 text-red-400 text-xs px-4 py-1 font-bold border-b border-red-500/20">
              [MÀN HÌNH 2: MÁY TÍNH ĐỘI 1 (ĐỎ) - CHỈ THẤY NÚT BẤM CỦA MÌNH]
            </div>
            {team1Hook.gameState ? (
              <TeamClient
                teamId="team1"
                gameState={team1Hook.gameState}
                isConnected={team1Hook.isConnected}
                lastPullEvent={team1Hook.lastPullEvent}
                onSubmitAnswer={team1Hook.submitAnswer}
                onUpdateTeamName={team1Hook.updateTeamName}
                onRandomizeMembers={team1Hook.randomizeMembers}
                onUpdateTeamIcon={team1Hook.updateTeamIcon}
                onUpdateMembers={team1Hook.updateMembers}
              />
            ) : (
              <div className="p-8 text-center text-slate-500">Đang kết nối Đội 1...</div>
            )}
          </div>

          {/* BOTTOM RIGHT: TEAM 2 SCREEN */}
          <div className="flex-1 min-h-[450px]">
            <div className="bg-blue-500/10 text-blue-400 text-xs px-4 py-1 font-bold border-b border-blue-500/20">
              [MÀN HÌNH 3: MÁY TÍNH ĐỘI 2 (XANH) - CHỈ THẤY NÚT BẤM CỦA MÌNH]
            </div>
            {team2Hook.gameState ? (
              <TeamClient
                teamId="team2"
                gameState={team2Hook.gameState}
                isConnected={team2Hook.isConnected}
                lastPullEvent={team2Hook.lastPullEvent}
                onSubmitAnswer={team2Hook.submitAnswer}
                onUpdateTeamName={team2Hook.updateTeamName}
                onRandomizeMembers={team2Hook.randomizeMembers}
                onUpdateTeamIcon={team2Hook.updateTeamIcon}
                onUpdateMembers={team2Hook.updateMembers}
              />
            ) : (
              <div className="p-8 text-center text-slate-500">Đang kết nối Đội 2...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

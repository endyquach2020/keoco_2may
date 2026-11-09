import React, { useState, useEffect } from 'react';
import { GameState, Question, PullEvent, TeamMember } from '../types/game';
import { setSoundMuted, getSoundMuted } from '../utils/sound';
import { TEAM_MASCOT_ICONS, STUDENT_ROSTER, FUN_ICONS } from '../data/rosterNames';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Flame,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Edit3,
  Check,
  Sparkles,
  Tag,
  X,
  Shuffle,
  Users,
} from 'lucide-react';

interface TeamClientProps {
  teamId: 'team1' | 'team2';
  gameState: GameState;
  isConnected: boolean;
  lastPullEvent: PullEvent | null;
  onSubmitAnswer: (optionIndex: number) => void;
  onUpdateTeamName: (team: 'team1' | 'team2', name: string) => void;
  onRandomizeMembers?: (team: 'team1' | 'team2') => void;
  onUpdateTeamIcon?: (team: 'team1' | 'team2', icon: string) => void;
  onUpdateMembers?: (team: 'team1' | 'team2', members: TeamMember[]) => void;
  onSwitchView?: (role: string) => void;
}

export const TeamClient: React.FC<TeamClientProps> = ({
  teamId,
  gameState,
  isConnected,
  lastPullEvent,
  onSubmitAnswer,
  onUpdateTeamName,
  onRandomizeMembers,
  onUpdateTeamIcon,
  onUpdateMembers,
  onSwitchView,
}) => {
  const isTeam1 = teamId === 'team1';
  const myTeam = isTeam1 ? gameState.team1 : gameState.team2;

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [memberEditName, setMemberEditName] = useState('');
  const [nameInput, setNameInput] = useState(myTeam.name);
  const [isMuted, setIsMutedState] = useState(getSoundMuted());
  const [nameSavedSuccess, setNameSavedSuccess] = useState(false);

  const {
    roomCode,
    status,
    currentRound,
    totalQuestions,
    roundTimeRemaining,
    roundTotalTime,
    currentQuestion,
    currentStep,
    targetSteps,
    winner,
  } = gameState;

  // Sync team name when it changes from server
  useEffect(() => {
    if (!isRenameModalOpen) {
      setNameInput(myTeam.name);
    }
  }, [myTeam.name, isRenameModalOpen]);

  // Confetti on team win
  useEffect(() => {
    if (status === 'game_over' && winner === teamId) {
      const colors = isTeam1 ? ['#ef4444', '#f97316', '#facc15'] : ['#3b82f6', '#06b6d4', '#60a5fa'];
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors,
      });
    }
  }, [status, winner, teamId, isTeam1]);

  const handleSaveName = (nameToSave?: string) => {
    const finalName = (nameToSave || nameInput).trim();
    if (finalName) {
      onUpdateTeamName(teamId, finalName);
      setNameInput(finalName);
      setIsRenameModalOpen(false);
      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 3000);
    }
  };

  const handleSaveMemberEdit = (idx: number) => {
    if (memberEditName.trim() && myTeam.members) {
      const updated = [...myTeam.members];
      updated[idx] = {
        ...updated[idx],
        name: memberEditName.trim(),
      };
      onUpdateMembers?.(teamId, updated);
      setEditingMemberIndex(null);
      setMemberEditName('');
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMutedState(next);
    setSoundMuted(next);
  };

  const myLeadSteps = isTeam1 ? -currentStep : currentStep;
  const timerPercent = roundTotalTime > 0 ? (roundTimeRemaining / roundTotalTime) * 100 : 0;
  const isTimeCritical = roundTimeRemaining <= 5 && roundTimeRemaining > 0;

  // Suggestions for cool team names
  const teamNameSuggestions = isTeam1
    ? [
        '🔥 Rồng Lửa',
        '⚡ Chiến Binh Đỏ',
        '🦁 Mãnh Hổ',
        '🚀 Tia Chớp',
        '🏆 Bất Khả Chiến Bại',
        '💥 Phượng Hoàng Lửa',
        '🎯 Sát Thủ Tri Thức',
      ]
    : [
        '🌊 Thủy Quái',
        '🦅 Đại Bàng Xanh',
        '⚡ Sấm Sét Vô Cực',
        '❄️ Băng Giá',
        '🛸 Phi Thuyền Xanh',
        '👑 Chiến Thần Tri Thức',
        '🌪️ Cơn Lốc Xanh',
      ];

  const themeClasses = isTeam1
    ? {
        borderGlow: 'border-red-500/50 shadow-red-950/40',
        badgeBg: 'bg-red-500 text-slate-950',
        cardBg: 'from-red-950/50 to-slate-900',
        accentText: 'text-red-400',
        buttonSubmit: 'bg-red-600 hover:bg-red-500 text-white',
        selectedBorder: 'border-red-400 bg-red-950/60',
      }
    : {
        borderGlow: 'border-blue-500/50 shadow-blue-950/40',
        badgeBg: 'bg-blue-500 text-slate-950',
        cardBg: 'from-blue-950/50 to-slate-900',
        accentText: 'text-blue-400',
        buttonSubmit: 'bg-blue-600 hover:bg-blue-500 text-white',
        selectedBorder: 'border-blue-400 bg-blue-950/60',
      };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-6">
      {/* TOP HEADER */}
      <header className={`bg-gradient-to-r ${themeClasses.cardBg} border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shrink-0 ${
            isTeam1 ? 'bg-red-600 text-white shadow-red-600/40' : 'bg-blue-600 text-white shadow-blue-600/40'
          }`}>
            {myTeam.icon || (isTeam1 ? '🔥' : '⚡')}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                isTeam1 ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}>
                {isTeam1 ? 'ĐỘI 1 (ĐỎ)' : 'ĐỘI 2 (XANH)'} • 7 THÀNH VIÊN
              </span>
              <span className="text-xs text-slate-400">Phòng: {roomCode}</span>
            </div>

            {/* Team Name with prominent rename button */}
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate max-w-[180px] sm:max-w-xs">
                {myTeam.name}
              </h1>
              <button
                onClick={() => {
                  setNameInput(myTeam.name);
                  setIsRenameModalOpen(true);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-all border ${
                  isTeam1
                    ? 'bg-red-950/70 hover:bg-red-900 border-red-500/40 text-red-300'
                    : 'bg-blue-950/70 hover:bg-blue-900 border-blue-500/40 text-blue-300'
                }`}
                title="Đổi tên và linh vật đội"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Đổi tên & Icon</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'Đã kết nối' : 'Đang kết nối lại...'}
          </div>

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {onSwitchView && (
            <button
              onClick={() => onSwitchView('')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Đổi vai
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {nameSavedSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xl animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Đã lưu & đồng bộ thông tin đội lên màn hình máy chủ!
          </div>
        )}

        {/* TEAM DASHBOARD METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                ĐIỂM CỦA ĐỘI
              </span>
              <span className={`text-2xl sm:text-3xl font-mono font-black ${themeClasses.accentText}`}>
                {myTeam.score}
              </span>
            </div>
            <div className={`p-2 rounded-xl bg-slate-800/80 ${themeClasses.accentText}`}>
              <Trophy className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                CHUỖI COMBO
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400">
                x{myTeam.streak}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              {isTeam1 ? <Flame className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              TÌNH HÌNH DÂY THỪNG
            </span>
            <div className="text-sm font-bold mt-1">
              {myLeadSteps > 0 ? (
                <span className="text-emerald-400">
                  🎉 Đang dẫn trước +{myLeadSteps} bước!
                </span>
              ) : myLeadSteps < 0 ? (
                <span className="text-rose-400">
                  ⚠️ Bị kéo lùi {Math.abs(myLeadSteps)} bước!
                </span>
              ) : (
                <span className="text-slate-300">⚖️ Đang ở vị trí cân bằng</span>
              )}
            </div>
          </div>
        </div>

        {/* TEAM ROPE MINI RADAR */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={themeClasses.accentText}>Vạch Thắng Đội Bạn</span>
            <span className="text-slate-400 text-[11px]">Cần kéo {targetSteps} bước để giật giải</span>
            <span className="text-slate-500">Đối Thủ</span>
          </div>

          <div className="relative h-4 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex items-center">
            <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-white/70 z-10" />
            <div
              className={`absolute top-0.5 bottom-0.5 w-6 rounded-full transition-all duration-500 shadow-md z-20 flex items-center justify-center text-[9px] font-black ${
                isTeam1 ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
              }`}
              style={{
                left: `calc(${50 + (myLeadSteps / targetSteps) * 45}% - 12px)`,
              }}
            >
              {myLeadSteps > 0 ? `+${myLeadSteps}` : myLeadSteps}
            </div>
          </div>
        </div>

        {/* GAME CONTENT CONTAINER */}
        <div className={`rounded-3xl bg-slate-900 border ${themeClasses.borderGlow} p-5 sm:p-8 shadow-2xl relative overflow-hidden`}>
          {status === 'in_round' && (
            <div className="absolute top-0 inset-x-0 h-2 bg-slate-800">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  isTimeCritical ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-amber-400'
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          )}

          {/* STATE 1: LOBBY */}
          {status === 'lobby' && (
            <div className="py-4 space-y-6">
              {/* Welcome Badge & Title */}
              <div className="text-center space-y-2">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-3xl shadow-xl text-3xl ${
                  isTeam1 ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {myTeam.icon || (isTeam1 ? '🔥' : '⚡')}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Đội Của Bạn: <span className={themeClasses.accentText}>{myTeam.name}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  Đội hình gồm <strong>7 chiến binh kéo co</strong> được chỉ định ngẫu nhiên từ danh sách!
                </p>
              </div>

              {/* 7 TEAM MEMBERS ROSTER DISPLAY */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      7 Chiến Binh Kéo Co Của {isTeam1 ? 'Đội Đỏ' : 'Đội Xanh'}
                    </span>
                  </div>

                  {onRandomizeMembers && (
                    <button
                      onClick={() => onRandomizeMembers(teamId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs transition-all border border-amber-500/40"
                      title="Chọn ngẫu nhiên 7 bạn mới từ danh sách"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Đổi ngẫu nhiên 7 bạn</span>
                    </button>
                  )}
                </div>

                {/* Grid of 7 members */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {(myTeam.members || []).map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col items-center text-center group relative transition-all"
                    >
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                        {m.icon || '🔥'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold block">
                        Số {idx + 1}
                      </span>

                      {editingMemberIndex === idx ? (
                        <div className="flex items-center gap-1 mt-1 w-full">
                          <input
                            type="text"
                            value={memberEditName}
                            onChange={(e) => setMemberEditName(e.target.value)}
                            className="w-full px-1 py-0.5 rounded bg-slate-950 text-white text-[11px] font-bold border border-amber-500 text-center outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveMemberEdit(idx);
                            }}
                          />
                          <button
                            onClick={() => handleSaveMemberEdit(idx)}
                            className="p-1 rounded bg-emerald-600 text-white text-[10px]"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingMemberIndex(idx);
                            setMemberEditName(m.name);
                          }}
                          className="font-bold text-white text-xs truncate max-w-full cursor-pointer hover:text-amber-400"
                          title="Bấm để đổi tên bạn này"
                        >
                          {m.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* DEDICATED TEAM RENAMING BOX & MASCOT PICKER */}
              <div className={`p-4 sm:p-5 rounded-2xl border bg-slate-950/70 ${themeClasses.borderGlow} space-y-3 max-w-xl mx-auto shadow-inner`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-400" />
                    Đổi tên & Icon Linh vật của đội
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">Tối đa 24 ký tự</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={24}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Nhập tên đội của bạn..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                    }}
                  />
                  <button
                    onClick={() => handleSaveName()}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg transition-all shrink-0 ${themeClasses.buttonSubmit}`}
                  >
                    <Check className="w-4 h-4" />
                    Lưu tên
                  </button>
                </div>

                {/* Team Mascot Icon Selection */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                    Chọn Icon Linh vật biểu tượng cho {isTeam1 ? 'Đội Đỏ' : 'Đội Xanh'}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TEAM_MASCOT_ICONS.map((m) => (
                      <button
                        key={m.icon}
                        type="button"
                        onClick={() => onUpdateTeamIcon?.(teamId, m.icon)}
                        className={`px-2.5 py-1 rounded-xl text-base transition-all flex items-center gap-1 border ${
                          myTeam.icon === m.icon
                            ? isTeam1 ? 'bg-red-600 border-red-400 text-white scale-110 shadow-lg' : 'bg-blue-600 border-blue-400 text-white scale-110 shadow-lg'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                        title={m.label}
                      >
                        <span>{m.icon}</span>
                        <span className="text-[10px] font-semibold hidden sm:inline">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name suggestions chips */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Gợi ý tên hay:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {teamNameSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setNameInput(sug);
                          handleSaveName(sug);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-500 text-slate-300 text-[11px] font-semibold transition-all hover:scale-105"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Waiting status pill */}
              <div className="space-y-2 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-semibold bg-amber-500/10 py-3 px-5 rounded-2xl border border-amber-500/20 shadow-md">
                  <Clock className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Đã sẵn sàng! Đang chờ Máy Chủ phát lệnh bắt đầu trận đấu...</span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đã kết nối Internet (Phòng: {roomCode})
                  </span>
                  <span>•</span>
                  <a
                    href={`/?role=host&room=${roomCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 underline font-semibold"
                  >
                    Mở Máy Chủ (Host)
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: COUNTDOWN */}
          {status === 'countdown' && (
            <div className="py-16 text-center space-y-4 animate-in zoom-in duration-300">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                CHUẨN BỊ...
              </span>
              <div className="text-6xl sm:text-8xl font-black text-white font-mono animate-bounce drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                KÉO!
              </div>
              <p className="text-sm text-slate-300">
                Cả 7 chiến binh hãy chuẩn bị tinh thần và chọn đáp án thật nhanh để tạo lực kéo mạnh nhất cho {myTeam.name}!
              </p>
            </div>
          )}

          {/* STATE 3: IN ROUND (ACTIVE QUESTION & 4 ANSWER BUTTONS) */}
          {status === 'in_round' && currentQuestion && (
            <div className="space-y-6">
              {/* Question metadata & timer */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/30">
                    CÂU {currentRound} / {totalQuestions}
                  </span>
                  {currentQuestion.category && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
                      {currentQuestion.category}
                    </span>
                  )}
                </div>

                <div className={`flex items-center gap-2 px-3.5 py-1 rounded-full font-mono font-bold text-sm ${
                  isTimeCritical
                    ? 'bg-red-500/20 text-red-400 border border-red-500 animate-pulse'
                    : 'bg-slate-800 text-amber-400'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>{roundTimeRemaining}s</span>
                </div>
              </div>

              {/* Big Question Text */}
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {currentQuestion.text}
              </h2>

              {/* Answer options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {currentQuestion.options.map((opt, idx) => {
                  const label = ['A', 'B', 'C', 'D'][idx];
                  const isSelected = myTeam.selectedOption === idx;

                  const buttonColors = [
                    'hover:border-amber-500 hover:bg-amber-950/30',
                    'hover:border-blue-500 hover:bg-blue-950/30',
                    'hover:border-emerald-500 hover:bg-emerald-950/30',
                    'hover:border-purple-500 hover:bg-purple-950/30',
                  ][idx];

                  return (
                    <button
                      key={idx}
                      disabled={myTeam.hasAnswered}
                      onClick={() => onSubmitAnswer(idx)}
                      className={`group relative p-4 sm:p-5 rounded-2xl border text-left flex items-center gap-4 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                        isSelected
                          ? `${themeClasses.selectedBorder} border-2 shadow-xl scale-[1.02]`
                          : myTeam.hasAnswered
                          ? 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60'
                          : `bg-slate-800/80 border-slate-700/80 text-slate-100 ${buttonColors} hover:scale-[1.01] active:scale-[0.99]`
                      }`}
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 shadow-md ${
                        isSelected
                          ? isTeam1 ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-200 group-hover:bg-slate-600'
                      }`}>
                        {label}
                      </span>

                      <span className="text-sm sm:text-base font-bold flex-1 leading-snug">
                        {opt}
                      </span>

                      {isSelected && (
                        <CheckCircle2 className={`w-6 h-6 shrink-0 ${isTeam1 ? 'text-red-400' : 'text-blue-400'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {myTeam.hasAnswered && (
                <div className={`p-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold border ${
                  isTeam1 ? 'bg-red-950/60 border-red-500/50 text-red-300' : 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                }`}>
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    Đã ghi nhận câu trả lời phương án {['A', 'B', 'C', 'D'][myTeam.selectedOption ?? 0]}! Đang chờ đối thủ & máy chủ công bố kết quả...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STATE 4: ROUND RESULT */}
          {status === 'round_result' && currentQuestion && (
            <div className="py-6 space-y-6 animate-in fade-in duration-300">
              <div className={`p-6 rounded-2xl text-center space-y-2 border shadow-xl ${
                myTeam.lastAnswerCorrect
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                  : 'bg-red-950/70 border-red-500 text-red-200'
              }`}>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 shadow-md mb-1">
                  {myTeam.lastAnswerCorrect ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400" />
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black uppercase">
                  {myTeam.lastAnswerCorrect
                    ? '🎉 CHÍNH XÁC! BẠN ĐÃ TRẢ LỜI ĐÚNG!'
                    : '❌ RẤT TIẾC! CÂU TRẢ LỜI CHƯA ĐÚNG!'}
                </h3>

                <p className="text-xs sm:text-sm font-medium opacity-90 max-w-md mx-auto">
                  {myTeam.lastAnswerCorrect
                    ? `Cả 7 chiến binh đã kéo thêm 1 bước và mang về 100 điểm cho ${myTeam.name}!`
                    : `Hãy bình tĩnh lấy lại tinh thần để bứt phá ở hiệp đấu tiếp theo nhé!`}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  ĐÁP ÁN CHÍNH XÁC CỦA CÂU HỎI:
                </span>
                <div className="flex items-center gap-3 text-emerald-400 font-bold text-base">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black">
                    {['A', 'B', 'C', 'D'][currentQuestion.correctIndex]}
                  </span>
                  <span>{currentQuestion.options[currentQuestion.correctIndex]}</span>
                </div>

                {currentQuestion.explanation && (
                  <p className="text-xs text-slate-300 pt-1 border-t border-slate-700/60">
                    💡 <strong>Giải thích:</strong> {currentQuestion.explanation}
                  </p>
                )}
              </div>

              <div className="text-center text-xs text-slate-400">
                ⏳ Máy chủ đang chuẩn bị sang câu tiếp theo...
              </div>
            </div>
          )}

          {/* STATE 5: GAME OVER */}
          {status === 'game_over' && (
            <div className="py-10 text-center space-y-5 animate-in zoom-in duration-300">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 shadow-2xl mb-1">
                <Trophy className="w-10 h-10" />
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white uppercase">
                {winner === teamId ? (
                  <span className="text-amber-400">🏆 CHIẾN THẮNG VANG DỘI!</span>
                ) : winner === 'draw' ? (
                  <span className="text-yellow-300">🤝 TRẬN ĐẤU BẤT PHÂN THẮNG BẠI!</span>
                ) : (
                  <span className="text-slate-300">🥈 Á QUÂN XUẤT SẮC!</span>
                )}
              </h2>

              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {winner === teamId
                  ? `Tuyệt vời! Cả 7 chiến binh ${myTeam.name} đã chứng minh sức mạnh trí tuệ và tốc độ đỉnh cao!`
                  : `Đội bạn đã thi đấu hết mình với ${myTeam.score} điểm! Hãy sẵn sàng cho trận phục thù nhé!`}
              </p>

              <div className="inline-block p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-sm font-semibold">
                Tổng điểm đạt được: <span className="text-amber-400 font-mono font-black text-xl">{myTeam.score}</span> điểm
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DEDICATED RENAME & ICON MODAL */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Đổi Tên & Icon Cho {isTeam1 ? 'Đội 1 (Đỏ)' : 'Đội 2 (Xanh)'}
                </h3>
              </div>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Tên đội mới (Tối đa 24 ký tự)
              </label>
              <input
                type="text"
                maxLength={24}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nhập tên đội..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm outline-none focus:border-amber-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
              />
            </div>

            {/* Mascot Icons */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Chọn Icon Linh Vật Đội:
              </label>
              <div className="flex flex-wrap gap-2">
                {TEAM_MASCOT_ICONS.map((m) => (
                  <button
                    key={m.icon}
                    type="button"
                    onClick={() => onUpdateTeamIcon?.(teamId, m.icon)}
                    className={`p-2 rounded-xl text-xl border transition-all ${
                      myTeam.icon === m.icon
                        ? isTeam1 ? 'bg-red-600 border-red-400 scale-110 shadow-lg' : 'bg-blue-600 border-blue-400 scale-110 shadow-lg'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
                    }`}
                    title={m.label}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                Hoặc chọn nhanh gợi ý tên:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {teamNameSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNameInput(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveName()}
                className={`px-5 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 ${themeClasses.buttonSubmit}`}
              >
                <Check className="w-4 h-4" />
                Xác nhận đổi tên
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

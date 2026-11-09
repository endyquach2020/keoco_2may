import React, { useState, useEffect } from 'react';
import { GameState, Question, PullEvent } from '../types/game';
import { TugArena } from './TugArena';
import { QuestionManagerModal } from './QuestionManagerModal';
import { setSoundMuted, getSoundMuted } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  SkipForward,
  Pause,
  Settings,
  Volume2,
  VolumeX,
  Share2,
  Copy,
  ExternalLink,
  Flame,
  Zap,
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Edit3,
  Shuffle,
} from 'lucide-react';

interface HostDashboardProps {
  gameState: GameState;
  questions: Question[];
  isConnected: boolean;
  lastPullEvent: PullEvent | null;
  onStartGame: () => void;
  onNextRound: () => void;
  onPauseResume: () => void;
  onResetGame: () => void;
  onAddQuestion: (q: Omit<Question, 'id'>) => void;
  onEditQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onLoadPreset: (key: string) => void;
  onAdjustRope: (delta: number) => void;
  onSetConfig: (targetSteps?: number, roundDuration?: number) => void;
  onUpdateTeamName?: (team: 'team1' | 'team2', name: string) => void;
  onRandomizeMembers?: (team?: 'team1' | 'team2' | 'both') => void;
  onUpdateTeamIcon?: (team: 'team1' | 'team2', icon: string) => void;
  onSwitchView?: (role: string) => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  gameState,
  questions,
  isConnected,
  lastPullEvent,
  onStartGame,
  onNextRound,
  onPauseResume,
  onResetGame,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onLoadPreset,
  onAdjustRope,
  onSetConfig,
  onUpdateTeamName,
  onRandomizeMembers,
  onUpdateTeamIcon,
  onSwitchView,
}) => {
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMuted, setIsMutedState] = useState(getSoundMuted());
  const [copiedTeam, setCopiedTeam] = useState<string | null>(null);

  const {
    roomCode,
    status,
    currentRound,
    totalQuestions,
    roundTimeRemaining,
    roundTotalTime,
    currentQuestion,
    team1,
    team2,
    isPaused,
    winner,
    targetSteps,
  } = gameState;

  // Trigger celebratory confetti when a game is won
  useEffect(() => {
    if (status === 'game_over' && winner && winner !== 'draw') {
      const colors = winner === 'team1' ? ['#ef4444', '#f97316', '#facc15'] : ['#3b82f6', '#06b6d4', '#60a5fa'];
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors,
      });
      const interval = setInterval(() => {
        confetti({
          particleCount: 60,
          spread: 120,
          origin: { x: Math.random(), y: 0.5 },
          colors,
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [status, winner]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMutedState(next);
    setSoundMuted(next);
  };

  const getTeamUrl = (role: 'team1' | 'team2') => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('role', role);
    url.searchParams.set('room', roomCode);
    return url.toString();
  };

  const handleCopy = (role: 'team1' | 'team2') => {
    const url = getTeamUrl(role);
    navigator.clipboard.writeText(url);
    setCopiedTeam(role);
    setTimeout(() => setCopiedTeam(null), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Timer percentage calculation
  const timerPercent = roundTotalTime > 0 ? (roundTimeRemaining / roundTotalTime) * 100 : 0;
  const isTimeCritical = roundTimeRemaining <= 5 && roundTimeRemaining > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-6">
      {/* TOP MASTER HEADER BAR */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/30 font-black text-xl tracking-tighter">
            KC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                Đại Chiến Kéo Co
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                MÁY CHỦ CHIẾU RẠP
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono font-bold text-slate-300">
                Phòng: <span className="text-amber-400">{roomCode}</span>
              </span>
              <span>•</span>
              <span className={`inline-flex items-center gap-1 font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {isConnected ? 'Máy chủ trực tuyến' : 'Mất kết nối...'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2">
          {/* Quick Team Link Copy Buttons */}
          <button
            onClick={() => handleCopy('team1')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 text-xs font-bold transition-all shadow-sm"
            title="Sao chép link cho Đội 1"
          >
            <Copy className="w-3.5 h-3.5" />
            {copiedTeam === 'team1' ? 'Đã sao chép Link Đỏ!' : 'Link Đội Đỏ'}
          </button>

          <button
            onClick={() => handleCopy('team2')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all shadow-sm"
            title="Sao chép link cho Đội 2"
          >
            <Copy className="w-3.5 h-3.5" />
            {copiedTeam === 'team2' ? 'Đã sao chép Link Xanh!' : 'Link Đội Xanh'}
          </button>

          {/* Share & QR Modal button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Mã QR / Kết nối</span>
          </button>

          {/* Question Manager button */}
          <button
            onClick={() => setIsQuestionModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold border border-amber-500/40 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Ngân hàng câu hỏi ({questions.length})</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Toàn màn hình"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Switch View button */}
          {onSwitchView && (
            <button
              onClick={() => onSwitchView('')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              title="Đổi vai trò"
            >
              Thoát
            </button>
          )}
        </div>
      </header>

      {/* MAIN ARENA & GAMEPLAY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* TOP SCOREBOARD / TEAMS STATUS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* TEAM 1 (RED) CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/70 to-slate-900 border border-red-500/40 shadow-xl flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-white shadow-lg shadow-red-600/40 text-2xl shrink-0">
                {team1.icon || '🔥'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-red-400 tracking-wider">ĐỘI 1 (ĐỎ)</span>
                  {team1.streak >= 2 && (
                    <span className="flex items-center gap-0.5 bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded font-black">
                      <Flame className="w-3 h-3" /> COMBO x{team1.streak}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <h3 className="font-extrabold text-base sm:text-lg text-white truncate max-w-[130px] sm:max-w-[160px]">
                    {team1.name}
                  </h3>
                  {onUpdateTeamName && (
                    <button
                      onClick={() => {
                        const newName = prompt('Đổi tên cho Đội 1 (Đỏ):', team1.name);
                        if (newName && newName.trim()) {
                          onUpdateTeamName('team1', newName.trim());
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Đổi tên Đội 1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 7 Members Preview */}
                <div className="mt-1.5 flex flex-wrap gap-1 max-w-[260px]">
                  {(team1.members || []).map((m, idx) => (
                    <span
                      key={m.id || idx}
                      className="px-1.5 py-0.2 rounded-md bg-slate-900/90 border border-red-500/30 text-[10px] text-red-300 font-bold flex items-center gap-0.5"
                      title={`Chiến binh ${idx + 1}`}
                    >
                      <span>{m.icon}</span>
                      <span className="truncate max-w-[65px]">{m.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 ml-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ĐIỂM SỐ</span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-red-400">{team1.score}</span>
            </div>
          </div>

          {/* CENTER MATCH STATUS / ROUND INDICATOR */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center flex flex-col items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              TRẬN ĐẤU KÉO CO ĐỐ VUI
            </span>
            <div className="text-base sm:text-lg font-black text-amber-400 mt-0.5">
              {status === 'lobby' && 'ĐANG CHỜ BẮT ĐẦU'}
              {status === 'countdown' && 'CHUẨN BỊ... 3, 2, 1!'}
              {status === 'in_round' && `HIỆP ĐẤU: CÂU ${currentRound} / ${totalQuestions}`}
              {status === 'round_result' && `KẾT QUẢ HIỆP ${currentRound}`}
              {status === 'game_over' && 'TRẬN ĐẤU KẾT THÚC!'}
            </div>

            {/* Target steps info */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span>Độ chênh thắng: <strong>{targetSteps} bước</strong></span>
              {isPaused && (
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold text-[10px]">
                  ĐANG TẠM DỪNG
                </span>
              )}
            </div>
          </div>

          {/* TEAM 2 (BLUE) CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-l from-blue-950/70 to-slate-900 border border-blue-500/40 shadow-xl flex items-center justify-between">
            <div className="text-left shrink-0 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ĐIỂM SỐ</span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-blue-400">{team2.score}</span>
            </div>

            <div className="flex items-start gap-3 flex-row-reverse text-right">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-white shadow-lg shadow-blue-600/40 text-2xl shrink-0">
                {team2.icon || '⚡'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 justify-end">
                  {team2.streak >= 2 && (
                    <span className="flex items-center gap-0.5 bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded font-black">
                      <Zap className="w-3 h-3" /> COMBO x{team2.streak}
                    </span>
                  )}
                  <span className="text-xs font-black uppercase text-blue-400 tracking-wider">ĐỘI 2 (XANH)</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  {onUpdateTeamName && (
                    <button
                      onClick={() => {
                        const newName = prompt('Đổi tên cho Đội 2 (Xanh):', team2.name);
                        if (newName && newName.trim()) {
                          onUpdateTeamName('team2', newName.trim());
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Đổi tên Đội 2"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <h3 className="font-extrabold text-base sm:text-lg text-white truncate max-w-[130px] sm:max-w-[160px]">
                    {team2.name}
                  </h3>
                </div>

                {/* 7 Members Preview */}
                <div className="mt-1.5 flex flex-wrap gap-1 justify-end max-w-[260px]">
                  {(team2.members || []).map((m, idx) => (
                    <span
                      key={m.id || idx}
                      className="px-1.5 py-0.2 rounded-md bg-slate-900/90 border border-blue-500/30 text-[10px] text-blue-300 font-bold flex items-center gap-0.5"
                      title={`Chiến binh ${idx + 1}`}
                    >
                      <span className="truncate max-w-[65px]">{m.name}</span>
                      <span>{m.icon}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTRAL GRAND ANIMATED TUG OF WAR ARENA */}
        <TugArena state={gameState} lastPull={lastPullEvent} />

        {/* ACTIVE QUESTION BOARD / SPECTATOR VIEW */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          {/* Timer progress bar during round */}
          {status === 'in_round' && (
            <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-800">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  isTimeCritical ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-amber-400'
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          )}

          {status === 'lobby' ? (
            /* Lobby instructions */
            <div className="py-8 text-center space-y-4 max-w-xl mx-auto">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Share2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Sẵn Sàng Cho Trận Kéo Co Trực Tuyến!
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Máy chủ này dùng để <strong>chiếu rạp cho cả phòng theo dõi 2 đội</strong>. Hãy gửi link hoặc mở mã QR cho Đội 1 và Đội 2 kết nối trên máy tính hoặc điện thoại của họ.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleCopy('team1')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/50 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copiedTeam === 'team1' ? 'Đã sao chép link!' : 'Copy Link Đội 1 (Đỏ)'}
                </button>
                <button
                  onClick={() => handleCopy('team2')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-950/70 hover:bg-blue-900 text-blue-300 border border-blue-500/50 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copiedTeam === 'team2' ? 'Đã sao chép link!' : 'Copy Link Đội 2 (Xanh)'}
                </button>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Mở Mã QR Quét Máy
                </button>
              </div>
            </div>
          ) : currentQuestion ? (
            /* Active Question Display */
            <div className="space-y-5">
              {/* Question Header & Timer */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
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

                {/* Round Timer Badge */}
                {status === 'in_round' && (
                  <div className={`flex items-center gap-2 px-3.5 py-1 rounded-full font-mono font-bold text-sm ${
                    isTimeCritical
                      ? 'bg-red-500/20 text-red-400 border border-red-500 animate-pulse'
                      : 'bg-slate-800 text-amber-400'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span>{roundTimeRemaining}s</span>
                  </div>
                )}

                {status === 'round_result' && (
                  <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                    HIỆP ĐẤU ĐÃ KẾT THÚC
                  </span>
                )}
              </div>

              {/* Big Question Heading */}
              <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">
                {currentQuestion.text}
              </h2>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {currentQuestion.options.map((opt, idx) => {
                  const label = ['A', 'B', 'C', 'D'][idx];
                  const isCorrect = idx === currentQuestion.correctIndex;
                  const isRoundFinished = status === 'round_result' || status === 'game_over';

                  // Indicators of which team picked this
                  const team1Picked = isRoundFinished && team1.selectedOption === idx;
                  const team2Picked = isRoundFinished && team2.selectedOption === idx;

                  let cardStyle = 'bg-slate-800/60 border-slate-700/60 text-slate-200';
                  if (isRoundFinished) {
                    if (isCorrect) {
                      cardStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/50 font-bold';
                    } else if (team1Picked || team2Picked) {
                      cardStyle = 'bg-red-950/40 border-red-500/50 text-red-300 opacity-80';
                    } else {
                      cardStyle = 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-50';
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${cardStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                          isRoundFinished && isCorrect
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-700 text-slate-200'
                        }`}>
                          {label}
                        </span>
                        <span className="text-sm sm:text-base font-semibold">{opt}</span>
                      </div>

                      {/* Badges for answer results */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {team1Picked && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white">
                            🔴 Đội Đỏ
                          </span>
                        )}
                        {team2Picked && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white">
                            🔵 Đội Xanh
                          </span>
                        )}
                        {isRoundFinished && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-1" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation in round_result */}
              {(status === 'round_result' || status === 'game_over') && currentQuestion.explanation && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs sm:text-sm animate-in fade-in duration-300">
                  <strong className="text-amber-400">💡 Giải thích: </strong>
                  {currentQuestion.explanation}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* BOTTOM MASTER GAME CONTROLLER BAR */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          {/* Main Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {status === 'lobby' || status === 'game_over' ? (
              <button
                onClick={onStartGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                BẮT ĐẦU TRẬN ĐẤU
              </button>
            ) : status === 'round_result' ? (
              <button
                onClick={onNextRound}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 animate-pulse"
              >
                <SkipForward className="w-5 h-5 fill-current" />
                CÂU TIẾP THEO
              </button>
            ) : (
              <button
                onClick={onPauseResume}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border ${
                  isPaused
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              </button>
            )}

            <button
              onClick={() => {
                if (confirm('Bạn có muốn bốc ngẫu nhiên 7 thành viên mới cho Đội 1 và 7 thành viên cho Đội 2 từ danh sách?')) {
                  onRandomizeMembers?.('both');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs sm:text-sm font-bold transition-all border border-amber-500/30 flex items-center gap-1.5"
              title="Bốc ngẫu nhiên 7 bạn cho Đội 1 và 7 bạn cho Đội 2 từ danh sách"
            >
              <Shuffle className="w-4 h-4 text-amber-400" />
              <span>Chia 14 bạn ngẫu nhiên</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Bạn có chắc muốn đặt lại toàn bộ trận đấu về ban đầu?')) {
                  onResetGame();
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-colors border border-slate-700 flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Đặt lại trận
            </button>
          </div>

          {/* Quick Referee Manual Rope Adjust */}
          <div className="flex items-center gap-2 text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-semibold hidden sm:inline">Trọng tài can thiệp:</span>
            <button
              onClick={() => onAdjustRope(-1)}
              className="px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-300 font-bold border border-red-500/40 flex items-center gap-1"
              title="Kéo thêm 1 bước về Đội Đỏ"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> +1 Đỏ
            </button>
            <button
              onClick={() => onAdjustRope(1)}
              className="px-2.5 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900 text-blue-300 font-bold border border-blue-500/40 flex items-center gap-1"
              title="Kéo thêm 1 bước về Đội Xanh"
            >
              +1 Xanh <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>

      {/* QUESTION MANAGER MODAL */}
      <QuestionManagerModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        questions={questions}
        onAddQuestion={onAddQuestion}
        onEditQuestion={onEditQuestion}
        onDeleteQuestion={onDeleteQuestion}
        onLoadPreset={onLoadPreset}
      />

      {/* SHARE / QR CODE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-slate-100">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-400" />
              Kết Nối Thiết Bị Thi Đấu 2 Đội
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Mỗi máy của 2 đội khi mở đường dẫn này sẽ chỉ nhìn thấy màn hình điều khiển và câu trả lời của riêng đội mình.
            </p>

            <div className="space-y-4">
              {/* TEAM 1 LINK */}
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                    🔴 Đội 1 (Đội Đỏ): {team1.name}
                  </span>
                  <span className="text-[11px] text-slate-400">{team1.connectedCount} thiết bị online</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getTeamUrl('team1')}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 font-mono select-all outline-none"
                  />
                  <button
                    onClick={() => handleCopy('team1')}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0"
                  >
                    {copiedTeam === 'team1' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                  <a
                    href={getTeamUrl('team1')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                    title="Mở tab mới"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* TEAM 2 LINK */}
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-blue-400 flex items-center gap-1.5">
                    🔵 Đội 2 (Đội Xanh): {team2.name}
                  </span>
                  <span className="text-[11px] text-slate-400">{team2.connectedCount} thiết bị online</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getTeamUrl('team2')}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 font-mono select-all outline-none"
                  />
                  <button
                    onClick={() => handleCopy('team2')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0"
                  >
                    {copiedTeam === 'team2' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                  <a
                    href={getTeamUrl('team2')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                    title="Mở tab mới"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

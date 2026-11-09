import React, { useMemo } from 'react';
import { GameState, PullEvent, TeamMember } from '../types/game';
import { Flame, Zap, Trophy, AlertTriangle } from 'lucide-react';
import { generateRandomTeamMembers } from '../data/rosterNames';

interface TugArenaProps {
  state: GameState;
  lastPull?: PullEvent | null;
  compact?: boolean;
}

export const TugArena: React.FC<TugArenaProps> = ({ state, lastPull, compact = false }) => {
  const { ropePosition, targetSteps, currentStep, team1, team2, status, winner } = state;

  // Calculate visual pixel offset based on percentage (-100 to 100)
  const clampedPosition = Math.max(-100, Math.min(100, ropePosition));
  const offsetPixels = (clampedPosition / 100) * (compact ? 120 : 240);

  // Determine current pulling tension/animation
  const isTeam1Winning = currentStep < 0;
  const isTeam2Winning = currentStep > 0;
  const isPullingActive = status === 'in_round' || status === 'round_result';

  // Fallback to 7 members if not present
  const t1Members: TeamMember[] = useMemo(() => {
    return team1.members && team1.members.length === 7 ? team1.members : generateRandomTeamMembers(7, 0);
  }, [team1.members]);

  const t2Members: TeamMember[] = useMemo(() => {
    return team2.members && team2.members.length === 7 ? team2.members : generateRandomTeamMembers(7, 7);
  }, [team2.members]);

  // Step markers array: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
  const steps = useMemo(() => {
    const list = [];
    for (let i = -targetSteps; i <= targetSteps; i++) {
      list.push(i);
    }
    return list;
  }, [targetSteps]);

  return (
    <div className={`relative w-full overflow-hidden select-none rounded-3xl border border-slate-700/60 shadow-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 ${compact ? 'h-72' : 'h-[400px] sm:h-[440px]'}`}>
      {/* Stadium ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Red side glow */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-red-600/20 rounded-full blur-3xl" />
        {/* Blue side glow */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
        {/* Stadium ground pattern */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-amber-950/40 via-amber-900/15 to-transparent" />
      </div>

      {/* Top Arena Header Info */}
      <div className="absolute top-3 inset-x-4 flex items-center justify-between z-20 text-xs sm:text-sm font-semibold">
        {/* Team 1 status tag */}
        <div className="flex items-center gap-2 bg-red-950/90 border border-red-500/50 px-3 py-1.5 rounded-2xl text-red-300 backdrop-blur-md shadow-lg shadow-red-950/50">
          <span className="text-base">{team1.icon || '🔥'}</span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white truncate max-w-[110px] sm:max-w-[180px]">{team1.name}</span>
              {team1.streak >= 2 && (
                <span className="flex items-center gap-0.5 bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-bounce">
                  <Flame className="w-3 h-3" /> x{team1.streak}
                </span>
              )}
            </div>
            <span className="text-[10px] text-red-400 font-bold">7 Chiến Binh Kéo Co</span>
          </div>
        </div>

        {/* Center Meter summary */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900/90 border border-amber-500/50 px-4 py-1 rounded-full text-amber-300 font-mono font-black text-xs sm:text-sm tracking-wider shadow-inner">
            {currentStep < 0 ? (
              <span className="text-red-400 font-bold">🔴 {team1.name} dẫn {-currentStep} bước</span>
            ) : currentStep > 0 ? (
              <span className="text-blue-400 font-bold">🔵 {team2.name} dẫn {currentStep} bước</span>
            ) : (
              <span className="text-amber-300">⚖️ VỊ TRÍ CÂN BẰNG</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">Mục tiêu: {targetSteps} bước để chiến thắng</span>
        </div>

        {/* Team 2 status tag */}
        <div className="flex items-center gap-2 bg-blue-950/90 border border-blue-500/50 px-3 py-1.5 rounded-2xl text-blue-300 backdrop-blur-md shadow-lg shadow-blue-950/50">
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-1.5 justify-end">
              {team2.streak >= 2 && (
                <span className="flex items-center gap-0.5 bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-bounce">
                  <Zap className="w-3 h-3" /> x{team2.streak}
                </span>
              )}
              <span className="font-black text-white truncate max-w-[110px] sm:max-w-[180px]">{team2.name}</span>
            </div>
            <span className="text-[10px] text-blue-400 font-bold">7 Chiến Binh Kéo Co</span>
          </div>
          <span className="text-base">{team2.icon || '⚡'}</span>
        </div>
      </div>

      {/* Floating pull alert notification banner */}
      {lastPull && (
        <div
          key={lastPull.timestamp}
          className="absolute top-16 inset-x-0 mx-auto max-w-md z-30 flex items-center justify-center pointer-events-none px-4 animate-in fade-in zoom-in duration-300"
        >
          <div className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black shadow-2xl border backdrop-blur-md flex items-center gap-2 ${
            lastPull.team === 'team1'
              ? 'bg-red-600/90 border-red-400 text-white shadow-red-500/40'
              : lastPull.team === 'team2'
              ? 'bg-blue-600/90 border-blue-400 text-white shadow-blue-500/40'
              : 'bg-amber-600/90 border-amber-400 text-white shadow-amber-500/40'
          }`}>
            {lastPull.team === 'team1' ? <Flame className="w-4 h-4" /> : lastPull.team === 'team2' ? <Zap className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="truncate">{lastPull.reason}</span>
          </div>
        </div>
      )}

      {/* Center Mud Pit / Water Hazard Graphic */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-36 sm:w-56 h-12 rounded-[50%] bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border border-amber-800/40 shadow-inner flex items-center justify-center opacity-75">
        <span className="text-[9px] font-black tracking-widest text-amber-500/80 uppercase">VŨNG BÙN TỬ THẦN</span>
        <div className="absolute inset-0 rounded-[50%] border border-amber-600/30 animate-ping opacity-20" />
      </div>

      {/* Step Markers Ruler along the bottom ground */}
      <div className="absolute bottom-2 inset-x-6 sm:inset-x-16 flex justify-between items-end z-10">
        {steps.map((st) => {
          const isCenter = st === 0;
          const isLeftWin = st === -targetSteps;
          const isRightWin = st === targetSteps;
          const isCurrentActive = st === currentStep;

          return (
            <div key={st} className="flex flex-col items-center">
              <div
                className={`w-1 rounded-full transition-all duration-300 ${
                  isCurrentActive
                    ? 'h-6 bg-yellow-400 shadow-[0_0_10px_#facc15]'
                    : isCenter
                    ? 'h-5 bg-white/70'
                    : isLeftWin
                    ? 'h-5 bg-red-500'
                    : isRightWin
                    ? 'h-5 bg-blue-500'
                    : 'h-3 bg-slate-600'
                }`}
              />
              <span
                className={`text-[9px] sm:text-[10px] font-mono mt-0.5 transition-colors ${
                  isCurrentActive
                    ? 'text-yellow-300 font-extrabold scale-110'
                    : isLeftWin
                    ? 'text-red-400 font-bold'
                    : isRightWin
                    ? 'text-blue-400 font-bold'
                    : 'text-slate-500'
                }`}
              >
                {isLeftWin ? 'THẮNG' : isRightWin ? 'THẮNG' : isCenter ? '0' : Math.abs(st)}
              </span>
            </div>
          );
        })}
      </div>

      {/* MAIN INTERACTIVE TUG RIG (ROPE + 14 CHARACTERS) THAT SHIFTS HORIZONTALLY */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out z-10 pt-4"
        style={{ transform: `translateX(${offsetPixels}px)` }}
      >
        {/* ROPE CONTAINER */}
        <div className="relative w-full max-w-6xl flex items-center justify-center px-2">
          {/* THE ROPE SVG */}
          <svg className="w-full h-24 overflow-visible" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ropeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="25%" stopColor="#d97706" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="75%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <filter id="ropeGlow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Shadow rope */}
            <path
              d="M 60 54 Q 500 58 940 54"
              fill="none"
              stroke="#000000"
              strokeWidth="12"
              strokeLinecap="round"
              opacity="0.4"
            />

            {/* Main braided rope */}
            <path
              d="M 60 50 Q 500 54 940 50"
              fill="none"
              stroke="url(#ropeGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              filter="url(#ropeGlow)"
              className={isPullingActive ? 'animate-pulse' : ''}
            />

            {/* Braided texture dashes */}
            <path
              d="M 60 50 Q 500 54 940 50"
              fill="none"
              stroke="#78350f"
              strokeWidth="2"
              strokeDasharray="4 6"
              strokeLinecap="round"
            />

            {/* CENTER RED RIBBON / FLAG ON ROPE */}
            <g transform="translate(500, 50)">
              {/* Ribbon bow */}
              <circle cx="0" cy="0" r="9" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
              {/* Ribbon tails hanging down */}
              <path
                d="M -3 6 L -8 28 L -1 25 L 5 28 L 1 6 Z"
                fill="#ef4444"
                stroke="#b91c1c"
                strokeWidth="1.5"
                className="animate-wiggle"
              />
              <path
                d="M 3 6 L 8 28 L 1 25 L -5 28 L -1 6 Z"
                fill="#dc2626"
                stroke="#991b1b"
                strokeWidth="1.5"
              />
              {/* Golden victory bell */}
              <circle cx="0" cy="3" r="4.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            </g>
          </svg>

          {/* LEFT CHARACTERS: TEAM 1 (7 ATHLETES) */}
          <div className="absolute left-2 sm:left-4 flex items-center -space-x-4 sm:-space-x-5 z-10">
            {t1Members.map((member, idx) => (
              <TugAthlete
                key={member.id || idx}
                member={member}
                memberIndex={idx}
                totalMembers={7}
                team="team1"
                isPulling={isPullingActive}
                isWinning={isTeam1Winning}
                isGameOver={status === 'game_over'}
                isWinner={winner === 'team1'}
              />
            ))}
          </div>

          {/* RIGHT CHARACTERS: TEAM 2 (7 ATHLETES) */}
          <div className="absolute right-2 sm:right-4 flex items-center -space-x-4 sm:-space-x-5 z-10 flex-row-reverse">
            {t2Members.map((member, idx) => (
              <TugAthlete
                key={member.id || idx}
                member={member}
                memberIndex={idx}
                totalMembers={7}
                team="team2"
                isPulling={isPullingActive}
                isWinning={isTeam2Winning}
                isGameOver={status === 'game_over'}
                isWinner={winner === 'team2'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* GAME OVER CELEBRATION OVERLAY */}
      {status === 'game_over' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-40 p-6 text-center animate-in fade-in duration-500">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 shadow-2xl shadow-yellow-500/50 mb-3 animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
            {winner === 'team1' ? (
              <span className="text-red-400">🎉 {team1.name} CHIẾN THẮNG!</span>
            ) : winner === 'team2' ? (
              <span className="text-blue-400">🎉 {team2.name} CHIẾN THẮNG!</span>
            ) : (
              <span className="text-yellow-400">🤝 TRẬN ĐẤU HÒA NHAU!</span>
            )}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-md mt-2 font-medium">
            {winner === 'team1'
              ? `Cả 7 chiến binh của ${team1.name} đã hợp lực phi thường kéo sập đối thủ!`
              : winner === 'team2'
              ? `Cả 7 chiến binh của ${team2.name} đã bứt phá ngoạn mục và giật trọn sợi dây chiến thắng!`
              : 'Cả hai đội đã cống hiến một trận đấu vô cùng kịch tính và bất phân thắng bại!'}
          </p>

          <div className="flex items-center gap-6 mt-4 text-xs sm:text-sm font-semibold">
            <div className="px-4 py-2 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300">
              {team1.name}: <span className="font-mono font-bold text-white text-base">{team1.score}</span> điểm
            </div>
            <div className="px-4 py-2 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-300">
              {team2.name}: <span className="font-mono font-bold text-white text-base">{team2.score}</span> điểm
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// SVG Tug Athlete Character with floating name tag and fun icon
interface TugAthleteProps {
  member: TeamMember;
  memberIndex: number;
  totalMembers: number;
  team: 'team1' | 'team2';
  isPulling: boolean;
  isWinning: boolean;
  isGameOver: boolean;
  isWinner: boolean;
}

const TugAthlete: React.FC<TugAthleteProps> = ({
  member,
  memberIndex,
  team,
  isPulling,
  isWinning,
  isGameOver,
  isWinner,
}) => {
  const isRed = team === 'team1';
  const jerseyColor = isRed ? '#ef4444' : '#3b82f6';
  const jerseyDark = isRed ? '#b91c1c' : '#1d4ed8';
  const headbandColor = isRed ? '#dc2626' : '#2563eb';

  // Back athlete (index 0) anchors deep; Front athlete (index 6) pulls near ribbon
  const isAnchor = memberIndex === 0;
  const isLead = memberIndex === 6;

  // Dynamic lean angle
  let rotationDeg = 0;
  if (isGameOver) {
    rotationDeg = isWinner ? 0 : isRed ? 18 : -18; // Loser slips forward
  } else if (isPulling) {
    const baseLean = isAnchor ? 24 : isLead ? 18 : 20;
    const extraLean = isWinning ? 4 : 0;
    rotationDeg = isRed ? -(baseLean + extraLean) : (baseLean + extraLean);
  }

  const flipStyle = !isRed ? { transform: 'scaleX(-1)' } : undefined;

  return (
    <div
      className="relative flex flex-col items-center transition-transform duration-300 ease-out origin-bottom"
      style={{
        transform: `rotate(${rotationDeg}deg)`,
        animationDelay: `${memberIndex * 0.08}s`,
      }}
    >
      {/* FLOATING MEMBER NAME & FUN ICON BADGE */}
      <div
        className={`mb-1 px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-tight whitespace-nowrap shadow-lg flex items-center gap-1 border backdrop-blur-md z-30 transition-all ${
          isRed
            ? 'bg-red-950/90 border-red-500/70 text-red-200 shadow-red-950/50'
            : 'bg-blue-950/90 border-blue-500/70 text-blue-200 shadow-blue-950/50'
        }`}
        style={{
          transform: !isRed ? 'scaleX(-1)' : undefined, // Keep name readable without flipping
        }}
      >
        <span className="text-[10px]">{member.icon || '🔥'}</span>
        <span className="truncate max-w-[58px] sm:max-w-[70px]">{member.name}</span>
      </div>

      {/* ATHLETE SVG */}
      <svg
        width="68"
        height="100"
        viewBox="0 0 80 110"
        className="overflow-visible filter drop-shadow-md"
        style={flipStyle}
      >
        {/* Shadow on ground */}
        <ellipse cx="40" cy="106" rx="22" ry="5" fill="#000000" opacity="0.35" />

        {/* Dust particles when pulling hard */}
        {isPulling && (
          <g opacity="0.7">
            <circle cx="22" cy="102" r="3" fill="#d97706" className="animate-ping" />
            <circle cx="16" cy="100" r="2" fill="#b45309" />
          </g>
        )}

        {/* Legs: Sturdy back leg & digging front leg */}
        <path
          d="M 32 68 L 22 92 L 14 104 L 26 104"
          fill="none"
          stroke="#334155"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Foot shoe back */}
        <rect x="12" y="100" width="16" height="6" rx="3" fill="#0f172a" />

        <path
          d="M 44 68 L 48 88 L 60 102 L 72 102"
          fill="none"
          stroke="#475569"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Foot shoe front */}
        <rect x="56" y="98" width="18" height="6" rx="3" fill={jerseyDark} />

        {/* Body / Athletic Jersey */}
        <path
          d="M 28 42 L 52 42 L 48 70 L 28 70 Z"
          fill={jerseyColor}
          stroke={jerseyDark}
          strokeWidth="2"
          rx="4"
        />
        {/* Jersey Number */}
        <text
          x="38"
          y="60"
          fill="#ffffff"
          fontSize="11"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {memberIndex + 1}
        </text>

        {/* Arms gripping rope */}
        <path
          d="M 30 46 L 56 52 L 68 56"
          fill="none"
          stroke="#fbcfe8"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="68" cy="56" r="4.5" fill="#f472b6" />

        {/* Head */}
        <circle cx="38" cy="26" r="14" fill="#fed7aa" stroke="#fb923c" strokeWidth="1.5" />

        {/* Headband with tails */}
        <rect x="24" y="16" width="28" height="6" rx="2" fill={headbandColor} />
        <path
          d="M 24 19 Q 12 18 8 26 Q 14 24 24 22 Z"
          fill={headbandColor}
          className="animate-pulse"
        />

        {/* Determined Face */}
        <line x1="36" y1="26" x2="42" y2="28" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="45" y1="28" x2="50" y2="26" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />

        {/* Gritted teeth mouth */}
        <rect x="40" y="32" width="8" height="4" rx="1.5" fill="#ffffff" stroke="#991b1b" strokeWidth="1" />

        {/* Sweat drops when pulling hard */}
        {isPulling && (
          <ellipse cx="52" cy="18" rx="2" ry="3" fill="#67e8f9" opacity="0.8" className="animate-bounce" />
        )}

        {/* Crown for winner */}
        {isGameOver && isWinner && (
          <path
            d="M 28 8 L 33 14 L 38 7 L 43 14 L 48 8 L 47 16 L 29 16 Z"
            fill="#facc15"
            stroke="#ca8a04"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ClientRole } from './types/game';
import { useGameSocket } from './hooks/useGameSocket';
import { HostDashboard } from './components/HostDashboard';
import { TeamClient } from './components/TeamClient';
import { RoleSelect } from './components/RoleSelect';
import { SplitSimulationView } from './components/SplitSimulationView';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export default function App() {
  const [selectedRole, setSelectedRole] = useState<ClientRole | 'split' | null>(null);
  const [roomCode, setRoomCode] = useState<string>('ARENA');

  // Parse initial role and room code from URL parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role')?.toLowerCase();
    const roomParam = params.get('room')?.toUpperCase();

    if (roomParam) {
      setRoomCode(roomParam);
    }

    if (roleParam === 'host') {
      setSelectedRole('host');
    } else if (roleParam === 'team1' || roleParam === 'red' || roleParam === 'team_red') {
      setSelectedRole('team1');
    } else if (roleParam === 'team2' || roleParam === 'blue' || roleParam === 'team_blue') {
      setSelectedRole('team2');
    } else if (roleParam === 'split' || roleParam === 'test') {
      setSelectedRole('split');
    }
  }, []);

  const handleSelectRole = (role: ClientRole | 'split') => {
    setSelectedRole(role);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', role);
      url.searchParams.set('room', roomCode);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleSwitchView = () => {
    setSelectedRole(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.pushState({}, '', url.toString());
    }
  };

  // If in Split Simulation mode
  if (selectedRole === 'split') {
    return <SplitSimulationView roomCode={roomCode} onExit={handleSwitchView} />;
  }

  // If no role is selected yet, render Role Selector
  if (!selectedRole) {
    return (
      <RoleSelect
        onSelectRole={handleSelectRole}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
      />
    );
  }

  // Otherwise, run single-role connection
  return (
    <ActiveGameSession
      role={selectedRole}
      roomCode={roomCode}
      onSwitchView={handleSwitchView}
    />
  );
}

interface ActiveGameSessionProps {
  role: ClientRole;
  roomCode: string;
  onSwitchView: () => void;
}

const ActiveGameSession: React.FC<ActiveGameSessionProps> = ({ role, roomCode, onSwitchView }) => {
  const {
    gameState,
    questions,
    isConnected,
    lastPullEvent,
    toastMessage,
    submitAnswer,
    updateTeamName,
    randomizeMembers,
    updateTeamIcon,
    updateMembers,
    hostStartGame,
    hostNextRound,
    hostPauseResume,
    hostResetGame,
    hostAddQuestion,
    hostEditQuestion,
    hostDeleteQuestion,
    hostLoadPreset,
    hostAdjustRope,
    hostSetConfig,
  } = useGameSocket({ role, roomCode });

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom duration-300">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-2 text-xs sm:text-sm font-semibold ${
              toastMessage.variant === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : toastMessage.variant === 'error'
                ? 'bg-red-950/90 border-red-500 text-red-200'
                : toastMessage.variant === 'warning'
                ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            {toastMessage.variant === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {toastMessage.variant === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            {toastMessage.variant === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {toastMessage.variant === 'info' && <Info className="w-4 h-4 text-sky-400" />}
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}

      {/* Render based on role */}
      {role === 'host' ? (
        gameState ? (
          <HostDashboard
            gameState={gameState}
            questions={questions}
            isConnected={isConnected}
            lastPullEvent={lastPullEvent}
            onStartGame={hostStartGame}
            onNextRound={hostNextRound}
            onPauseResume={hostPauseResume}
            onResetGame={hostResetGame}
            onAddQuestion={hostAddQuestion}
            onEditQuestion={hostEditQuestion}
            onDeleteQuestion={hostDeleteQuestion}
            onLoadPreset={hostLoadPreset}
            onAdjustRope={hostAdjustRope}
            onSetConfig={hostSetConfig}
            onUpdateTeamName={updateTeamName}
            onRandomizeMembers={randomizeMembers}
            onUpdateTeamIcon={updateTeamIcon}
            onSwitchView={onSwitchView}
          />
        ) : (
          <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Đang kết nối Máy Chủ...</span>
          </div>
        )
      ) : role === 'team1' || role === 'team2' ? (
        gameState ? (
          <TeamClient
            teamId={role}
            gameState={gameState}
            isConnected={isConnected}
            lastPullEvent={lastPullEvent}
            onSubmitAnswer={submitAnswer}
            onUpdateTeamName={updateTeamName}
            onRandomizeMembers={randomizeMembers}
            onUpdateTeamIcon={updateTeamIcon}
            onUpdateMembers={updateMembers}
            onSwitchView={onSwitchView}
          />
        ) : (
          <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-slate-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">
              Đang kết nối máy thi đấu {role === 'team1' ? 'Đội 1 (Đỏ)' : 'Đội 2 (Xanh)'}...
            </span>
          </div>
        )
      ) : null}
    </div>
  );
}

export interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number; // 0, 1, 2, 3
  explanation?: string;
  category?: string;
  timeLimit?: number; // seconds, default 20
}

export type ClientRole = 'host' | 'team1' | 'team2' | 'spectator';

export interface TeamMember {
  id: string;
  name: string;
  icon: string; // Fun emoji avatar (🦁, 🐯, 🐼, etc.)
}

export interface TeamState {
  id: 'team1' | 'team2';
  name: string;
  icon: string; // Team badge/mascot (🔥, ⚡, 🦁, etc.)
  color: string;
  score: number;
  streak: number;
  connectedCount: number;
  hasAnswered: boolean;
  selectedOption: number | null; // Sanitized: only visible to team itself or to host after round ends
  lastAnswerCorrect: boolean | null;
  timeTaken: number | null;
  members: TeamMember[]; // 7 members pulling the rope!
}

export type GameStatus = 'lobby' | 'countdown' | 'in_round' | 'round_result' | 'game_over';

export interface PullEvent {
  team: 'team1' | 'team2' | 'tie';
  steps: number; // e.g. -1 (towards team1) or +1 (towards team2)
  reason: string;
  timestamp: number;
}

export interface GameState {
  roomCode: string;
  status: GameStatus;
  ropePosition: number; // -100 to 100 (where negative is team1, positive is team2)
  targetSteps: number; // default 5 steps to win either side
  currentStep: number; // e.g. -5 to +5
  currentRound: number;
  totalQuestions: number;
  roundTimeRemaining: number;
  roundTotalTime: number;
  currentQuestion: Question | null;
  team1: TeamState;
  team2: TeamState;
  winner: 'team1' | 'team2' | 'draw' | null;
  lastPull: PullEvent | null;
  hostConnected: boolean;
  isPaused: boolean;
}

export interface ClientMessage {
  type:
    | 'JOIN'
    | 'SUBMIT_ANSWER'
    | 'UPDATE_TEAM_NAME'
    | 'UPDATE_TEAM_ICON'
    | 'UPDATE_MEMBERS'
    | 'RANDOMIZE_MEMBERS'
    | 'HOST_START_GAME'
    | 'HOST_NEXT_ROUND'
    | 'HOST_PAUSE_RESUME'
    | 'HOST_RESET_GAME'
    | 'HOST_ADD_QUESTION'
    | 'HOST_EDIT_QUESTION'
    | 'HOST_DELETE_QUESTION'
    | 'HOST_LOAD_PRESET'
    | 'HOST_ADJUST_ROPE'
    | 'HOST_SET_CONFIG'
    | 'PING';
  role?: ClientRole;
  teamName?: string;
  teamIcon?: string;
  roomCode?: string;
  optionIndex?: number;
  team?: 'team1' | 'team2' | 'both';
  members?: TeamMember[];
  question?: Question | Omit<Question, 'id'>;
  questionId?: string;
  presetKey?: string;
  delta?: number;
  targetSteps?: number;
  roundDuration?: number;
}

export interface ServerMessage {
  type: 'STATE_UPDATE' | 'QUESTIONS_LIST' | 'PULL_TRIGGER' | 'TOAST' | 'PONG';
  state?: GameState;
  questions?: Question[];
  pullEvent?: PullEvent;
  message?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

import { GameState, Question, PullEvent, ClientMessage } from '../types/game';
import { DEFAULT_QUESTIONS, PRESET_PACKS } from '../data/defaultQuestions';

export class ClientGameEngine {
  public state: GameState;
  public questions: Question[];
  private timerInterval: NodeJS.Timeout | null = null;
  private onStateChange: (state: GameState, pullEvent?: PullEvent) => void;

  constructor(roomCode: string, onStateChange: (state: GameState, pullEvent?: PullEvent) => void) {
    this.questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    this.state = this.createInitialState(roomCode, this.questions.length);
    this.onStateChange = onStateChange;
  }

  private createInitialState(roomCode: string, totalQuestions: number): GameState {
    return {
      roomCode: (roomCode || 'ARENA').toUpperCase().trim(),
      status: 'lobby',
      ropePosition: 0,
      targetSteps: 5,
      currentStep: 0,
      currentRound: 0,
      totalQuestions,
      roundTimeRemaining: 20,
      roundTotalTime: 20,
      currentQuestion: null,
      team1: {
        id: 'team1',
        name: 'Chiến Binh Đỏ',
        color: '#ef4444',
        score: 0,
        streak: 0,
        connectedCount: 1,
        hasAnswered: false,
        selectedOption: null,
        lastAnswerCorrect: null,
        timeTaken: null,
      },
      team2: {
        id: 'team2',
        name: 'Phượng Hoàng Xanh',
        color: '#3b82f6',
        score: 0,
        streak: 0,
        connectedCount: 1,
        hasAnswered: false,
        selectedOption: null,
        lastAnswerCorrect: null,
        timeTaken: null,
      },
      winner: null,
      lastPull: null,
      hostConnected: true,
      isPaused: false,
    };
  }

  public handleClientMessage(msg: ClientMessage) {
    switch (msg.type) {
      case 'JOIN': {
        if (msg.teamName) {
          if (msg.role === 'team1') this.state.team1.name = msg.teamName;
          if (msg.role === 'team2') this.state.team2.name = msg.teamName;
        }
        if (msg.role === 'team1') this.state.team1.connectedCount = Math.max(1, this.state.team1.connectedCount);
        if (msg.role === 'team2') this.state.team2.connectedCount = Math.max(1, this.state.team2.connectedCount);
        this.emitUpdate();
        break;
      }

      case 'UPDATE_TEAM_NAME': {
        if (msg.team === 'team1' && msg.teamName) {
          this.state.team1.name = msg.teamName.trim().slice(0, 24);
        } else if (msg.team === 'team2' && msg.teamName) {
          this.state.team2.name = msg.teamName.trim().slice(0, 24);
        }
        this.emitUpdate();
        break;
      }

      case 'SUBMIT_ANSWER': {
        if (this.state.status !== 'in_round') return;
        if (typeof msg.optionIndex !== 'number') return;

        const team = msg.role === 'team1' || msg.team === 'team1'
          ? this.state.team1
          : msg.role === 'team2' || msg.team === 'team2'
          ? this.state.team2
          : null;

        if (!team || team.hasAnswered) return;

        const timeTaken = this.state.roundTotalTime - this.state.roundTimeRemaining;
        team.hasAnswered = true;
        team.selectedOption = msg.optionIndex;
        team.timeTaken = Math.max(0.1, timeTaken);

        if (this.state.team1.hasAnswered && this.state.team2.hasAnswered) {
          this.evaluateRound();
        } else {
          this.emitUpdate();
        }
        break;
      }

      case 'HOST_START_GAME': {
        this.resetGame();
        this.state.status = 'countdown';
        this.emitUpdate();
        setTimeout(() => {
          this.startRound();
        }, 3000);
        break;
      }

      case 'HOST_NEXT_ROUND': {
        if (this.state.status === 'round_result') {
          this.startRound();
        }
        break;
      }

      case 'HOST_PAUSE_RESUME': {
        this.state.isPaused = !this.state.isPaused;
        this.emitUpdate();
        break;
      }

      case 'HOST_RESET_GAME': {
        this.resetGame();
        break;
      }

      case 'HOST_ADD_QUESTION': {
        if (!msg.question) return;
        const q: Question = {
          id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          text: msg.question.text,
          options: msg.question.options as [string, string, string, string],
          correctIndex: msg.question.correctIndex,
          explanation: msg.question.explanation || '',
          category: msg.question.category || 'Tự tạo',
          timeLimit: msg.question.timeLimit || 20,
        };
        this.questions.push(q);
        this.state.totalQuestions = this.questions.length;
        this.emitUpdate();
        break;
      }

      case 'HOST_EDIT_QUESTION': {
        if (!msg.question || !('id' in msg.question)) return;
        const idx = this.questions.findIndex((q) => q.id === (msg.question as Question).id);
        if (idx !== -1) {
          this.questions[idx] = msg.question as Question;
          this.emitUpdate();
        }
        break;
      }

      case 'HOST_DELETE_QUESTION': {
        if (!msg.questionId) return;
        this.questions = this.questions.filter((q) => q.id !== msg.questionId);
        this.state.totalQuestions = this.questions.length;
        this.emitUpdate();
        break;
      }

      case 'HOST_LOAD_PRESET': {
        if (!msg.presetKey) return;
        const preset = PRESET_PACKS[msg.presetKey];
        if (preset) {
          this.questions = JSON.parse(JSON.stringify(preset.questions));
          this.state.totalQuestions = this.questions.length;
          this.emitUpdate();
        }
        break;
      }

      case 'HOST_ADJUST_ROPE': {
        if (typeof msg.delta !== 'number') return;
        this.state.currentStep = Math.max(-this.state.targetSteps, Math.min(this.state.targetSteps, this.state.currentStep + msg.delta));
        this.state.ropePosition = (this.state.currentStep / this.state.targetSteps) * 100;
        this.emitUpdate();
        break;
      }

      case 'HOST_SET_CONFIG': {
        if (typeof msg.targetSteps === 'number' && msg.targetSteps >= 2 && msg.targetSteps <= 10) {
          this.state.targetSteps = msg.targetSteps;
          this.state.ropePosition = (this.state.currentStep / this.state.targetSteps) * 100;
        }
        this.emitUpdate();
        break;
      }
    }
  }

  private startRound() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.questions.length === 0) {
      this.questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    }

    if (this.state.currentRound >= this.questions.length) {
      this.state.status = 'game_over';
      this.emitUpdate();
      return;
    }

    const question = this.questions[this.state.currentRound];
    const duration = question.timeLimit || 20;

    this.state.currentQuestion = question;
    this.state.currentRound += 1;
    this.state.totalQuestions = this.questions.length;
    this.state.roundTimeRemaining = duration;
    this.state.roundTotalTime = duration;
    this.state.status = 'in_round';
    this.state.isPaused = false;

    this.state.team1.hasAnswered = false;
    this.state.team1.selectedOption = null;
    this.state.team1.lastAnswerCorrect = null;
    this.state.team1.timeTaken = null;

    this.state.team2.hasAnswered = false;
    this.state.team2.selectedOption = null;
    this.state.team2.lastAnswerCorrect = null;
    this.state.team2.timeTaken = null;

    this.emitUpdate();

    this.timerInterval = setInterval(() => {
      if (this.state.isPaused) return;

      this.state.roundTimeRemaining -= 1;

      if (this.state.roundTimeRemaining <= 0) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.evaluateRound();
      } else {
        this.emitUpdate();
      }
    }, 1000);
  }

  private evaluateRound() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const currentQ = this.state.currentQuestion;
    if (!currentQ) return;

    const t1 = this.state.team1;
    const t2 = this.state.team2;

    const t1Correct = t1.selectedOption === currentQ.correctIndex;
    const t2Correct = t2.selectedOption === currentQ.correctIndex;

    t1.lastAnswerCorrect = t1Correct;
    t2.lastAnswerCorrect = t2Correct;

    if (t1Correct) {
      t1.score += 100;
      t1.streak += 1;
    } else {
      t1.streak = 0;
    }

    if (t2Correct) {
      t2.score += 100;
      t2.streak += 1;
    } else {
      t2.streak = 0;
    }

    let stepDelta = 0;
    let reason = '';
    let winningTeam: 'team1' | 'team2' | 'tie' = 'tie';

    if (t1Correct && !t2Correct) {
      stepDelta = -1;
      reason = `${t1.name} trả lời đúng và kéo 1 bước!`;
      winningTeam = 'team1';
    } else if (!t1Correct && t2Correct) {
      stepDelta = 1;
      reason = `${t2.name} trả lời đúng và kéo 1 bước!`;
      winningTeam = 'team2';
    } else if (t1Correct && t2Correct) {
      const t1Time = t1.timeTaken ?? 999;
      const t2Time = t2.timeTaken ?? 999;

      if (t1Time < t2Time - 0.2) {
        stepDelta = -1;
        reason = `Cả 2 đều đúng! Nhưng ${t1.name} nhanh tay hơn (${t1Time.toFixed(1)}s vs ${t2Time.toFixed(1)}s)!`;
        winningTeam = 'team1';
      } else if (t2Time < t1Time - 0.2) {
        stepDelta = 1;
        reason = `Cả 2 đều đúng! Nhưng ${t2.name} nhanh tay hơn (${t2Time.toFixed(1)}s vs ${t1Time.toFixed(1)}s)!`;
        winningTeam = 'team2';
      } else {
        stepDelta = 0;
        reason = 'Cả hai đội đều xuất sắc trả lời đúng và ngang sức!';
        winningTeam = 'tie';
      }
    } else {
      stepDelta = 0;
      reason = 'Cả hai đội đều chưa chính xác! Dây thừng giữ nguyên vị trí.';
      winningTeam = 'tie';
    }

    if (winningTeam === 'team1' && t1.streak >= 2) {
      stepDelta = -1.5;
      reason += ` 🔥 COMBO x${t1.streak}! Kéo cực mạnh!`;
    } else if (winningTeam === 'team2' && t2.streak >= 2) {
      stepDelta = 1.5;
      reason += ` 🔥 COMBO x${t2.streak}! Kéo cực mạnh!`;
    }

    this.state.currentStep = Math.max(-this.state.targetSteps, Math.min(this.state.targetSteps, this.state.currentStep + stepDelta));
    this.state.ropePosition = (this.state.currentStep / this.state.targetSteps) * 100;

    const pullEvent: PullEvent = {
      team: winningTeam,
      steps: stepDelta,
      reason,
      timestamp: Date.now(),
    };
    this.state.lastPull = pullEvent;
    this.state.status = 'round_result';

    if (this.state.currentStep <= -this.state.targetSteps) {
      this.state.status = 'game_over';
      this.state.winner = 'team1';
    } else if (this.state.currentStep >= this.state.targetSteps) {
      this.state.status = 'game_over';
      this.state.winner = 'team2';
    } else if (this.state.currentRound >= this.questions.length) {
      this.state.status = 'game_over';
      if (this.state.currentStep < 0) {
        this.state.winner = 'team1';
      } else if (this.state.currentStep > 0) {
        this.state.winner = 'team2';
      } else {
        this.state.winner = 'draw';
      }
    }

    this.emitUpdate(pullEvent);
  }

  private resetGame() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const prevT1 = this.state.team1.name;
    const prevT2 = this.state.team2.name;

    this.state = this.createInitialState(this.state.roomCode, this.questions.length);
    this.state.team1.name = prevT1;
    this.state.team2.name = prevT2;

    this.emitUpdate();
  }

  private emitUpdate(pullEvent?: PullEvent) {
    this.onStateChange(JSON.parse(JSON.stringify(this.state)), pullEvent);
  }

  public destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

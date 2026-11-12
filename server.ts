import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_QUESTIONS, PRESET_PACKS } from './src/data/defaultQuestions.js';
import { generateRandomTeamMembers } from './src/data/rosterNames.js';
import { Question, GameState, ClientMessage, ServerMessage, ClientRole, PullEvent } from './src/types/game.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

interface ClientConnection {
  ws: WebSocket;
  role: ClientRole;
  roomCode: string;
  isAlive: boolean;
}

const clients = new Map<WebSocket, ClientConnection>();

// Game Room Management
interface Room {
  code: string;
  state: GameState;
  questions: Question[];
  timerInterval: NodeJS.Timeout | null;
  autoNextTimeout: NodeJS.Timeout | null;
}

const rooms = new Map<string, Room>();

function createInitialState(roomCode: string, totalQuestions: number): GameState {
  const t1Members = generateRandomTeamMembers(7, 0);
  const t2Members = generateRandomTeamMembers(7, 7);

  return {
    roomCode,
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
      icon: '🔥',
      color: '#ef4444',
      score: 0,
      streak: 0,
      connectedCount: 0,
      hasAnswered: false,
      selectedOption: null,
      lastAnswerCorrect: null,
      timeTaken: null,
      members: t1Members,
    },
    team2: {
      id: 'team2',
      name: 'Phượng Hoàng Xanh',
      icon: '⚡',
      color: '#3b82f6',
      score: 0,
      streak: 0,
      connectedCount: 0,
      hasAnswered: false,
      selectedOption: null,
      lastAnswerCorrect: null,
      timeTaken: null,
      members: t2Members,
    },
    winner: null,
    lastPull: null,
    hostConnected: false,
    isPaused: false,
  };
}

function getOrCreateRoom(roomCode: string): Room {
  const code = (roomCode || 'arena').toUpperCase().trim();
  let room = rooms.get(code);
  if (!room) {
    const questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    room = {
      code,
      questions,
      state: createInitialState(code, questions.length),
      timerInterval: null,
      autoNextTimeout: null,
    };
    rooms.set(code, room);
  }
  return room;
}

function countRoomClients(roomCode: string) {
  let hostCount = 0;
  let team1Count = 0;
  let team2Count = 0;

  for (const client of clients.values()) {
    if (client.roomCode === roomCode) {
      if (client.role === 'host') hostCount++;
      if (client.role === 'team1') team1Count++;
      if (client.role === 'team2') team2Count++;
    }
  }

  const room = rooms.get(roomCode);
  if (room) {
    room.state.hostConnected = hostCount > 0;
    room.state.team1.connectedCount = team1Count;
    room.state.team2.connectedCount = team2Count;
  }
}

function sanitizeStateForClient(state: GameState, role: ClientRole): GameState {
  const clone: GameState = JSON.parse(JSON.stringify(state));

  // If in round, protect the correct answer from teams
  if (clone.status === 'in_round' && clone.currentQuestion) {
    if (role === 'team1' || role === 'team2') {
      clone.currentQuestion.correctIndex = -1;
    }
  }

  // Hide opponent's selection during round
  if (clone.status === 'in_round') {
    if (role === 'team1') {
      clone.team2.selectedOption = null;
    } else if (role === 'team2') {
      clone.team1.selectedOption = null;
    }
  }

  return clone;
}

function broadcastRoom(room: Room, pullEvent?: PullEvent) {
  countRoomClients(room.code);

  for (const [ws, client] of clients.entries()) {
    if (client.roomCode === room.code && ws.readyState === WebSocket.OPEN) {
      const sanitized = sanitizeStateForClient(room.state, client.role);
      const msg: ServerMessage = {
        type: 'STATE_UPDATE',
        state: sanitized,
        pullEvent,
      };
      ws.send(JSON.stringify(msg));
    }
  }
}

function sendQuestionsToHost(room: Room) {
  for (const [ws, client] of clients.entries()) {
    if (client.roomCode === room.code && client.role === 'host' && ws.readyState === WebSocket.OPEN) {
      const msg: ServerMessage = {
        type: 'QUESTIONS_LIST',
        questions: room.questions,
      };
      ws.send(JSON.stringify(msg));
    }
  }
}

function sendToast(ws: WebSocket, message: string, variant: 'info' | 'success' | 'warning' | 'error' = 'info') {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'TOAST', message, variant } as ServerMessage));
  }
}

function evaluateRound(room: Room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  const currentQ = room.state.currentQuestion;
  if (!currentQ) return;

  const t1 = room.state.team1;
  const t2 = room.state.team2;

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

  let stepDelta = 0; // Negative = toward Team 1, Positive = toward Team 2
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

  // Streak combo bonus
  if (winningTeam === 'team1' && t1.streak >= 2) {
    stepDelta = -1.5;
    reason += ` 🔥 COMBO x${t1.streak}! Kéo cực mạnh!`;
  } else if (winningTeam === 'team2' && t2.streak >= 2) {
    stepDelta = 1.5;
    reason += ` 🔥 COMBO x${t2.streak}! Kéo cực mạnh!`;
  }

  room.state.currentStep = Math.max(-room.state.targetSteps, Math.min(room.state.targetSteps, room.state.currentStep + stepDelta));
  room.state.ropePosition = (room.state.currentStep / room.state.targetSteps) * 100;

  const pullEvent: PullEvent = {
    team: winningTeam,
    steps: stepDelta,
    reason,
    timestamp: Date.now(),
  };
  room.state.lastPull = pullEvent;
  room.state.status = 'round_result';

  // Check game over
  if (room.state.currentStep <= -room.state.targetSteps) {
    room.state.status = 'game_over';
    room.state.winner = 'team1';
  } else if (room.state.currentStep >= room.state.targetSteps) {
    room.state.status = 'game_over';
    room.state.winner = 'team2';
  } else if (room.state.currentRound >= room.questions.length) {
    room.state.status = 'game_over';
    if (room.state.currentStep < 0) {
      room.state.winner = 'team1';
    } else if (room.state.currentStep > 0) {
      room.state.winner = 'team2';
    } else {
      room.state.winner = 'draw';
    }
  }

  broadcastRoom(room, pullEvent);
}

function startRound(room: Room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.autoNextTimeout) {
    clearTimeout(room.autoNextTimeout);
    room.autoNextTimeout = null;
  }

  if (room.questions.length === 0) {
    room.questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
  }

  if (room.state.currentRound >= room.questions.length) {
    room.state.status = 'game_over';
    broadcastRoom(room);
    return;
  }

  const question = room.questions[room.state.currentRound];
  const duration = question.timeLimit || 20;

  room.state.currentQuestion = question;
  room.state.currentRound += 1;
  room.state.totalQuestions = room.questions.length;
  room.state.roundTimeRemaining = duration;
  room.state.roundTotalTime = duration;
  room.state.status = 'in_round';
  room.state.isPaused = false;

  // Reset team round states
  room.state.team1.hasAnswered = false;
  room.state.team1.selectedOption = null;
  room.state.team1.lastAnswerCorrect = null;
  room.state.team1.timeTaken = null;

  room.state.team2.hasAnswered = false;
  room.state.team2.selectedOption = null;
  room.state.team2.lastAnswerCorrect = null;
  room.state.team2.timeTaken = null;

  broadcastRoom(room);

  const roundStartTime = Date.now();

  room.timerInterval = setInterval(() => {
    if (room.state.isPaused) return;

    room.state.roundTimeRemaining -= 1;

    if (room.state.roundTimeRemaining <= 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      room.timerInterval = null;
      evaluateRound(room);
    } else {
      broadcastRoom(room);
    }
  }, 1000);
}

function resetGame(room: Room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.autoNextTimeout) {
    clearTimeout(room.autoNextTimeout);
    room.autoNextTimeout = null;
  }

  const prevT1Name = room.state.team1.name;
  const prevT2Name = room.state.team2.name;

  room.state = createInitialState(room.code, room.questions.length);
  room.state.team1.name = prevT1Name;
  room.state.team2.name = prevT2Name;

  broadcastRoom(room);
  sendQuestionsToHost(room);
}

// WebSocket Event Handling
wss.on('connection', (ws: WebSocket) => {
  const clientInfo: ClientConnection = {
    ws,
    role: 'spectator',
    roomCode: 'ARENA',
    isAlive: true,
  };
  clients.set(ws, clientInfo);

  ws.on('pong', () => {
    clientInfo.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const data: ClientMessage = JSON.parse(raw.toString());
      const room = getOrCreateRoom(data.roomCode || clientInfo.roomCode);

      switch (data.type) {
        case 'JOIN': {
          if (data.role) clientInfo.role = data.role;
          if (data.roomCode) clientInfo.roomCode = data.roomCode.toUpperCase().trim();

          if (data.teamName) {
            if (clientInfo.role === 'team1') room.state.team1.name = data.teamName;
            if (clientInfo.role === 'team2') room.state.team2.name = data.teamName;
          }

          broadcastRoom(room);
          if (clientInfo.role === 'host') {
            sendQuestionsToHost(room);
          }
          break;
        }

        case 'UPDATE_TEAM_NAME': {
          if (data.team === 'team1' && data.teamName) {
            room.state.team1.name = data.teamName.trim().slice(0, 24);
          } else if (data.team === 'team2' && data.teamName) {
            room.state.team2.name = data.teamName.trim().slice(0, 24);
          }
          broadcastRoom(room);
          break;
        }

        case 'UPDATE_TEAM_ICON': {
          if (data.team === 'team1' && data.teamIcon) {
            room.state.team1.icon = data.teamIcon;
          } else if (data.team === 'team2' && data.teamIcon) {
            room.state.team2.icon = data.teamIcon;
          }
          broadcastRoom(room);
          break;
        }

        case 'UPDATE_MEMBERS': {
          if (data.team === 'team1' && data.members) {
            room.state.team1.members = data.members;
          } else if (data.team === 'team2' && data.members) {
            room.state.team2.members = data.members;
          }
          broadcastRoom(room);
          break;
        }

        case 'RANDOMIZE_MEMBERS': {
          if (data.team === 'team1' || data.team === 'both') {
            room.state.team1.members = generateRandomTeamMembers(7, Math.floor(Math.random() * 10));
          }
          if (data.team === 'team2' || data.team === 'both') {
            room.state.team2.members = generateRandomTeamMembers(7, Math.floor(Math.random() * 10) + 7);
          }
          broadcastRoom(room);
          break;
        }

        case 'SUBMIT_ANSWER': {
          if (room.state.status !== 'in_round') return;
          if (typeof data.optionIndex !== 'number') return;

          const team = clientInfo.role === 'team1' ? room.state.team1 : clientInfo.role === 'team2' ? room.state.team2 : null;
          if (!team || team.hasAnswered) return;

          const timeTaken = room.state.roundTotalTime - room.state.roundTimeRemaining;
          team.hasAnswered = true;
          team.selectedOption = data.optionIndex;
          team.timeTaken = Math.max(0.1, timeTaken);

          // If both teams have submitted answers, evaluate immediately without waiting for timer
          if (room.state.team1.hasAnswered && room.state.team2.hasAnswered) {
            evaluateRound(room);
          } else {
            broadcastRoom(room);
          }
          break;
        }

        case 'HOST_START_GAME': {
          if (clientInfo.role !== 'host') return;
          resetGame(room);
          room.state.status = 'countdown';
          broadcastRoom(room);

          setTimeout(() => {
            startRound(room);
          }, 3000);
          break;
        }

        case 'HOST_NEXT_ROUND': {
          if (clientInfo.role !== 'host') return;
          if (room.state.status === 'round_result') {
            startRound(room);
          }
          break;
        }

        case 'HOST_PAUSE_RESUME': {
          if (clientInfo.role !== 'host') return;
          room.state.isPaused = !room.state.isPaused;
          broadcastRoom(room);
          break;
        }

        case 'HOST_RESET_GAME': {
          if (clientInfo.role !== 'host') return;
          resetGame(room);
          break;
        }

        case 'HOST_ADD_QUESTION': {
          if (clientInfo.role !== 'host' || !data.question) return;
          const q: Question = {
            id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            text: data.question.text,
            options: data.question.options as [string, string, string, string],
            correctIndex: data.question.correctIndex,
            explanation: data.question.explanation || '',
            category: data.question.category || 'Tự tạo',
            timeLimit: data.question.timeLimit || 20,
          };
          room.questions.push(q);
          room.state.totalQuestions = room.questions.length;
          sendQuestionsToHost(room);
          broadcastRoom(room);
          sendToast(ws, 'Đã thêm câu hỏi mới thành công!', 'success');
          break;
        }

        case 'HOST_EDIT_QUESTION': {
          if (clientInfo.role !== 'host' || !data.question || !('id' in data.question)) return;
          const idx = room.questions.findIndex((q) => q.id === (data.question as Question).id);
          if (idx !== -1) {
            room.questions[idx] = data.question as Question;
            sendQuestionsToHost(room);
            broadcastRoom(room);
            sendToast(ws, 'Đã cập nhật câu hỏi thành công!', 'success');
          }
          break;
        }

        case 'HOST_DELETE_QUESTION': {
          if (clientInfo.role !== 'host' || !data.questionId) return;
          room.questions = room.questions.filter((q) => q.id !== data.questionId);
          room.state.totalQuestions = room.questions.length;
          sendQuestionsToHost(room);
          broadcastRoom(room);
          sendToast(ws, 'Đã xóa câu hỏi khỏi ngân hàng!', 'info');
          break;
        }

        case 'HOST_LOAD_PRESET': {
          if (clientInfo.role !== 'host' || !data.presetKey) return;
          const preset = PRESET_PACKS[data.presetKey];
          if (preset) {
            room.questions = JSON.parse(JSON.stringify(preset.questions));
            room.state.totalQuestions = room.questions.length;
            sendQuestionsToHost(room);
            broadcastRoom(room);
            sendToast(ws, `Đã nạp bộ câu hỏi: ${preset.name}`, 'success');
          }
          break;
        }

        case 'HOST_ADJUST_ROPE': {
          if (clientInfo.role !== 'host' || typeof data.delta !== 'number') return;
          room.state.currentStep = Math.max(-room.state.targetSteps, Math.min(room.state.targetSteps, room.state.currentStep + data.delta));
          room.state.ropePosition = (room.state.currentStep / room.state.targetSteps) * 100;
          broadcastRoom(room);
          break;
        }

        case 'HOST_SET_CONFIG': {
          if (clientInfo.role !== 'host') return;
          if (typeof data.targetSteps === 'number' && data.targetSteps >= 2 && data.targetSteps <= 10) {
            room.state.targetSteps = data.targetSteps;
            room.state.ropePosition = (room.state.currentStep / room.state.targetSteps) * 100;
          }
          broadcastRoom(room);
          break;
        }

        case 'PING': {
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info) {
      clients.delete(ws);
      const room = rooms.get(info.roomCode);
      if (room) {
        countRoomClients(room.code);
        broadcastRoom(room);
      }
    }
  });
});

// Heartbeat to keep connections alive
setInterval(() => {
  for (const [ws, client] of clients.entries()) {
    if (!client.isAlive) {
      ws.terminate();
      clients.delete(ws);
      continue;
    }
    client.isAlive = false;
    ws.ping();
  }
}, 30000);

// API Endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI Question Generation endpoint with Gemini API
app.post('/api/generate-questions', async (req: Request, res: Response) => {
  try {
    const { topic = 'Đố vui trí tuệ và kiến thức tổng hợp', count = 5 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm câu hỏi thủ công hoặc dùng các bộ câu hỏi có sẵn.',
      });
    }

    const ai = new GoogleGenAI();
    const prompt = `Bạn là chuyên gia soạn thảo câu hỏi đố vui cho game Kéo Co Trực Tuyến.
Hãy tạo ${count} câu hỏi trắc nghiệm tiếng Việt cực kỳ thú vị, hấp dẫn, ngắn gọn, phù hợp thi đấu đối kháng nhanh.
Chủ đề yêu cầu: "${topic}".
Mỗi câu hỏi có 4 phương án lựa chọn A, B, C, D (chỉ có duy nhất 1 đáp án đúng).
Trả về kết quả dưới định dạng JSON là một mảng các đối tượng câu hỏi với schema sau:
[
  {
    "text": "Nội dung câu hỏi ngắn gọn",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correctIndex": 0, // chỉ số 0, 1, 2, hoặc 3 tương ứng với phương án đúng trong mảng options
    "explanation": "Giải thích ngắn gọn hài hước hoặc thông tin thú vị",
    "category": "${topic}",
    "timeLimit": 20
  }
]
Chỉ trả về JSON thuần túy, không có markdown formatting, không có backticks \`\`\`json.`;

    const response = await ai.models.generateContent({
      model: 'models/gemini-2.5-flash',
      contents: prompt,
    });

    let rawText = response.text || '';
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedQuestions = JSON.parse(rawText);
    const formatted = parsedQuestions.map((q: any, i: number) => ({
      id: 'ai_' + Date.now() + '_' + i,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation || '',
      category: q.category || topic,
      timeLimit: q.timeLimit || 20,
    }));

    return res.json({ success: true, questions: formatted });
  } catch (error: any) {
    console.error('Failed to generate questions with AI:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi tạo câu hỏi bằng AI' });
  }
});

// Setup Vite in Dev or Static files in Production
const isProduction = process.env.NODE_ENV === 'production';

// AI Studio dev server must always listen on port 3000 (port 8080 is reserved for Nginx reverse proxy)
let portToListen = 3000;
const portArgIdx = process.argv.indexOf('--port');
if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
  portToListen = Number(process.argv[portArgIdx + 1]) || 3000;
} else if (process.env.PORT && process.env.PORT !== '8080') {
  portToListen = Number(process.env.PORT) || 3000;
}
const PORT = portToListen;

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

server.on('error', (err: any) => {
  console.error('Server error:', err);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Kéo Co Server running on http://0.0.0.0:${PORT}`);
});


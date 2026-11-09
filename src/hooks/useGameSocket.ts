import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, ClientRole, Question, PullEvent, ServerMessage, ClientMessage } from '../types/game';
import { playPullSound, playWhistle, playCorrectSound, playWrongSound, playVictorySound, playTickSound } from '../utils/sound';
import { CloudRelay } from '../utils/cloudRelay';
import { ClientGameEngine } from '../utils/clientGameEngine';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';

interface UseGameSocketOptions {
  role: ClientRole;
  roomCode?: string;
  initialTeamName?: string;
}

export function useGameSocket({ role, roomCode = 'ARENA', initialTeamName }: UseGameSocketOptions) {
  const normalizedRoom = (roomCode || 'ARENA').toUpperCase().trim();

  // Create immediate default fallback state so the UI renders instantly without being stuck on a spinner!
  const createFallbackState = useCallback((): GameState => ({
    roomCode: normalizedRoom,
    status: 'lobby',
    ropePosition: 0,
    targetSteps: 5,
    currentStep: 0,
    currentRound: 0,
    totalQuestions: DEFAULT_QUESTIONS.length,
    roundTimeRemaining: 20,
    roundTotalTime: 20,
    currentQuestion: null,
    team1: {
      id: 'team1',
      name: role === 'team1' && initialTeamName ? initialTeamName : 'Chiến Binh Đỏ',
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
      name: role === 'team2' && initialTeamName ? initialTeamName : 'Phượng Hoàng Xanh',
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
    hostConnected: role === 'host',
    isPaused: false,
  }), [normalizedRoom, role, initialTeamName]);

  const [gameState, setGameState] = useState<GameState>(createFallbackState);
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [isConnected, setIsConnected] = useState(false);
  const [transportMode, setTransportMode] = useState<'ws' | 'relay' | 'local'>('relay');
  const [lastPullEvent, setLastPullEvent] = useState<PullEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; variant: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const cloudRelayRef = useRef<CloudRelay | null>(null);
  const clientEngineRef = useRef<ClientGameEngine | null>(null);
  const prevRoundRef = useRef<number>(-1);
  const prevStatusRef = useRef<string>('');
  const prevTimeRef = useRef<number>(-1);

  // Sound & notification effects on state change
  const handleStateEffects = useCallback((newState: GameState, pullEvent?: PullEvent) => {
    if (pullEvent && pullEvent.team !== 'tie') {
      playPullSound(pullEvent.team);
    }

    if (prevStatusRef.current === 'countdown' && newState.status === 'in_round') {
      playWhistle();
    }

    if (newState.status === 'in_round' && newState.roundTimeRemaining <= 5 && newState.roundTimeRemaining > 0) {
      if (prevTimeRef.current !== newState.roundTimeRemaining) {
        playTickSound(true);
      }
    }

    if (prevStatusRef.current === 'in_round' && newState.status === 'round_result') {
      if (role === 'team1') {
        if (newState.team1.lastAnswerCorrect) playCorrectSound();
        else playWrongSound();
      } else if (role === 'team2') {
        if (newState.team2.lastAnswerCorrect) playCorrectSound();
        else playWrongSound();
      } else if (role === 'host') {
        playWhistle();
      }
    }

    if (prevStatusRef.current !== 'game_over' && newState.status === 'game_over') {
      playVictorySound();
    }

    prevStatusRef.current = newState.status;
    prevRoundRef.current = newState.currentRound;
    prevTimeRef.current = newState.roundTimeRemaining;
  }, [role]);

  // Sanitize state for player teams so answers aren't leaked in DOM
  const sanitizeForRole = useCallback((state: GameState): GameState => {
    const clone: GameState = JSON.parse(JSON.stringify(state));
    if (clone.status === 'in_round' && clone.currentQuestion) {
      if (role === 'team1' || role === 'team2') {
        clone.currentQuestion.correctIndex = -1;
      }
    }
    if (clone.status === 'in_round') {
      if (role === 'team1') {
        clone.team2.selectedOption = null;
      } else if (role === 'team2') {
        clone.team1.selectedOption = null;
      }
    }
    return clone;
  }, [role]);

  // Initialize Cloud Relay (for Vercel & serverless environments)
  const initCloudRelay = useCallback(() => {
    if (cloudRelayRef.current) return;

    setTransportMode('relay');

    // If host on Vercel, host runs the client engine locally and broadcasts to teams
    if (role === 'host' && !clientEngineRef.current) {
      clientEngineRef.current = new ClientGameEngine(normalizedRoom, (newState, pullEv) => {
        setGameState(newState);
        setQuestions(clientEngineRef.current?.questions || DEFAULT_QUESTIONS);
        handleStateEffects(newState, pullEv);
        cloudRelayRef.current?.publishState(newState, pullEv);
      });
      setQuestions(clientEngineRef.current.questions);
      setGameState(clientEngineRef.current.state);
    }

    const relay = new CloudRelay({
      roomCode: normalizedRoom,
      role,
      onConnect: () => {
        setIsConnected(true);
        // If host, announce initial state
        if (role === 'host' && clientEngineRef.current) {
          relay.publishState(clientEngineRef.current.state);
        }
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onMessage: (topic, payload) => {
        if (topic.endsWith('/state') && payload.state) {
          // If not host (team client), apply state
          if (role !== 'host') {
            const sanitized = sanitizeForRole(payload.state);
            setGameState(sanitized);
            if (payload.pullEvent) {
              setLastPullEvent(payload.pullEvent);
            }
            handleStateEffects(payload.state, payload.pullEvent);
          }
        } else if (topic.endsWith('/action') && payload) {
          // If host, receive action from teams
          if (role === 'host' && clientEngineRef.current) {
            clientEngineRef.current.handleClientMessage(payload);
          }
        } else if (topic.endsWith('/presence') && payload.role) {
          // Track connected team count
          if (role === 'host' && clientEngineRef.current) {
            if (payload.role === 'team1') {
              clientEngineRef.current.state.team1.connectedCount = Math.max(1, clientEngineRef.current.state.team1.connectedCount);
            } else if (payload.role === 'team2') {
              clientEngineRef.current.state.team2.connectedCount = Math.max(1, clientEngineRef.current.state.team2.connectedCount);
            }
          }
        }
      },
    });

    cloudRelayRef.current = relay;
  }, [normalizedRoom, role, sanitizeForRole, handleStateEffects]);

  // Connect to local WebSocket or Cloud Relay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    // On Vercel or Netlify, there is no persistent Node WebSocket server on the same domain
    const isServerlessHosting = hostname.includes('vercel.app') || hostname.includes('netlify.app') || hostname.includes('github.io');

    if (isServerlessHosting) {
      // Immediately use Cloud Relay for 0ms delay on Vercel!
      initCloudRelay();
      return;
    }

    // Otherwise, try local WebSocket first with fallback
    let fallbackTimeout: NodeJS.Timeout | null = null;
    let didConnectWs = false;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      fallbackTimeout = setTimeout(() => {
        if (!didConnectWs) {
          console.log('[Connection] Local WS timeout. Switching to Cloud Relay...');
          try { ws.close(); } catch (_) {}
          initCloudRelay();
        }
      }, 2500);

      ws.onopen = () => {
        didConnectWs = true;
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        setIsConnected(true);
        setTransportMode('ws');

        const joinMsg: ClientMessage = {
          type: 'JOIN',
          role,
          roomCode: normalizedRoom,
          teamName: initialTeamName,
        };
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (event) => {
        try {
          const data: ServerMessage = JSON.parse(event.data);
          if (data.type === 'STATE_UPDATE' && data.state) {
            setGameState(data.state);
            if (data.pullEvent) setLastPullEvent(data.pullEvent);
            handleStateEffects(data.state, data.pullEvent);
          } else if (data.type === 'QUESTIONS_LIST' && data.questions) {
            setQuestions(data.questions);
          } else if (data.type === 'TOAST' && data.message) {
            setToastMessage({ message: data.message, variant: data.variant || 'info' });
            setTimeout(() => setToastMessage(null), 4000);
          }
        } catch (e) {
          console.warn('WS parse error:', e);
        }
      };

      ws.onerror = () => {
        if (!didConnectWs) {
          if (fallbackTimeout) clearTimeout(fallbackTimeout);
          initCloudRelay();
        }
      };

      ws.onclose = () => {
        if (!didConnectWs) {
          initCloudRelay();
        } else {
          setIsConnected(false);
        }
      };
    } catch (e) {
      initCloudRelay();
    }

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (wsRef.current) wsRef.current.close();
      if (cloudRelayRef.current) cloudRelayRef.current.destroy();
      if (clientEngineRef.current) clientEngineRef.current.destroy();
    };
  }, [normalizedRoom, role, initialTeamName, initCloudRelay, handleStateEffects]);

  // Dispatch actions through active transport (Local WS or Cloud Relay)
  const dispatchAction = useCallback((msg: ClientMessage) => {
    // If local WS is connected, send via WS
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ ...msg, roomCode: normalizedRoom }));
      return;
    }

    // Otherwise send via Cloud Relay / Client Engine
    if (role === 'host' && clientEngineRef.current) {
      clientEngineRef.current.handleClientMessage(msg);
      return;
    }

    if (cloudRelayRef.current) {
      cloudRelayRef.current.publishAction({ ...msg, roomCode: normalizedRoom, role });
    }
  }, [normalizedRoom, role]);

  // Actions
  const submitAnswer = useCallback((optionIndex: number) => {
    dispatchAction({ type: 'SUBMIT_ANSWER', optionIndex, team: role === 'team1' ? 'team1' : 'team2' });
  }, [dispatchAction, role]);

  const updateTeamName = useCallback((team: 'team1' | 'team2', name: string) => {
    dispatchAction({ type: 'UPDATE_TEAM_NAME', team, teamName: name });
  }, [dispatchAction]);

  const hostStartGame = useCallback(() => {
    dispatchAction({ type: 'HOST_START_GAME' });
  }, [dispatchAction]);

  const hostNextRound = useCallback(() => {
    dispatchAction({ type: 'HOST_NEXT_ROUND' });
  }, [dispatchAction]);

  const hostPauseResume = useCallback(() => {
    dispatchAction({ type: 'HOST_PAUSE_RESUME' });
  }, [dispatchAction]);

  const hostResetGame = useCallback(() => {
    dispatchAction({ type: 'HOST_RESET_GAME' });
  }, [dispatchAction]);

  const hostAddQuestion = useCallback((question: Omit<Question, 'id'>) => {
    dispatchAction({ type: 'HOST_ADD_QUESTION', question });
  }, [dispatchAction]);

  const hostEditQuestion = useCallback((question: Question) => {
    dispatchAction({ type: 'HOST_EDIT_QUESTION', question });
  }, [dispatchAction]);

  const hostDeleteQuestion = useCallback((questionId: string) => {
    dispatchAction({ type: 'HOST_DELETE_QUESTION', questionId });
  }, [dispatchAction]);

  const hostLoadPreset = useCallback((presetKey: string) => {
    dispatchAction({ type: 'HOST_LOAD_PRESET', presetKey });
  }, [dispatchAction]);

  const hostAdjustRope = useCallback((delta: number) => {
    dispatchAction({ type: 'HOST_ADJUST_ROPE', delta });
  }, [dispatchAction]);

  const hostSetConfig = useCallback((targetSteps?: number, roundDuration?: number) => {
    dispatchAction({ type: 'HOST_SET_CONFIG', targetSteps, roundDuration });
  }, [dispatchAction]);

  return {
    gameState,
    questions,
    isConnected,
    transportMode,
    lastPullEvent,
    toastMessage,
    submitAnswer,
    updateTeamName,
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
  };
}

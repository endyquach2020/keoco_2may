import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, ClientRole, Question, PullEvent, ServerMessage, ClientMessage } from '../types/game';
import { playPullSound, playWhistle, playCorrectSound, playWrongSound, playVictorySound, playTickSound } from '../utils/sound';

interface UseGameSocketOptions {
  role: ClientRole;
  roomCode?: string;
  initialTeamName?: string;
}

export function useGameSocket({ role, roomCode = 'ARENA', initialTeamName }: UseGameSocketOptions) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPullEvent, setLastPullEvent] = useState<PullEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; variant: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevRoundRef = useRef<number>(-1);
  const prevStatusRef = useRef<string>('');
  const prevTimeRef = useRef<number>(-1);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Send join payload
        const joinMsg: ClientMessage = {
          type: 'JOIN',
          role,
          roomCode,
          teamName: initialTeamName,
        };
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (event) => {
        try {
          const data: ServerMessage = JSON.parse(event.data);

          if (data.type === 'STATE_UPDATE' && data.state) {
            const newState = data.state;
            setGameState(newState);

            // Handle audio and visual triggers based on state changes
            if (data.pullEvent) {
              setLastPullEvent(data.pullEvent);
              if (data.pullEvent.team !== 'tie') {
                playPullSound(data.pullEvent.team);
              }
            }

            // Game start whistle
            if (prevStatusRef.current === 'countdown' && newState.status === 'in_round') {
              playWhistle();
            }

            // Round ticking audio in last 5 seconds
            if (newState.status === 'in_round' && newState.roundTimeRemaining <= 5 && newState.roundTimeRemaining > 0) {
              if (prevTimeRef.current !== newState.roundTimeRemaining) {
                playTickSound(true);
              }
            }

            // Round result sounds for team clients
            if (prevStatusRef.current === 'in_round' && newState.status === 'round_result') {
              if (role === 'team1') {
                if (newState.team1.lastAnswerCorrect) playCorrectSound();
                else playWrongSound();
              } else if (role === 'team2') {
                if (newState.team2.lastAnswerCorrect) playCorrectSound();
                else playWrongSound();
              } else if (role === 'host') {
                // Host whistle
                playWhistle();
              }
            }

            // Victory sound
            if (prevStatusRef.current !== 'game_over' && newState.status === 'game_over') {
              playVictorySound();
            }

            prevStatusRef.current = newState.status;
            prevRoundRef.current = newState.currentRound;
            prevTimeRef.current = newState.roundTimeRemaining;
          } else if (data.type === 'QUESTIONS_LIST' && data.questions) {
            setQuestions(data.questions);
          } else if (data.type === 'TOAST' && data.message) {
            setToastMessage({ message: data.message, variant: data.variant || 'info' });
            setTimeout(() => setToastMessage(null), 4000);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 2 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
    }
  }, [role, roomCode, initialTeamName]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Actions
  const submitAnswer = useCallback((optionIndex: number) => {
    send({ type: 'SUBMIT_ANSWER', optionIndex });
  }, [send]);

  const updateTeamName = useCallback((team: 'team1' | 'team2', name: string) => {
    send({ type: 'UPDATE_TEAM_NAME', team, teamName: name });
  }, [send]);

  const hostStartGame = useCallback(() => {
    send({ type: 'HOST_START_GAME' });
  }, [send]);

  const hostNextRound = useCallback(() => {
    send({ type: 'HOST_NEXT_ROUND' });
  }, [send]);

  const hostPauseResume = useCallback(() => {
    send({ type: 'HOST_PAUSE_RESUME' });
  }, [send]);

  const hostResetGame = useCallback(() => {
    send({ type: 'HOST_RESET_GAME' });
  }, [send]);

  const hostAddQuestion = useCallback((question: Omit<Question, 'id'>) => {
    send({ type: 'HOST_ADD_QUESTION', question });
  }, [send]);

  const hostEditQuestion = useCallback((question: Question) => {
    send({ type: 'HOST_EDIT_QUESTION', question });
  }, [send]);

  const hostDeleteQuestion = useCallback((questionId: string) => {
    send({ type: 'HOST_DELETE_QUESTION', questionId });
  }, [send]);

  const hostLoadPreset = useCallback((presetKey: string) => {
    send({ type: 'HOST_LOAD_PRESET', presetKey });
  }, [send]);

  const hostAdjustRope = useCallback((delta: number) => {
    send({ type: 'HOST_ADJUST_ROPE', delta });
  }, [send]);

  const hostSetConfig = useCallback((targetSteps?: number, roundDuration?: number) => {
    send({ type: 'HOST_SET_CONFIG', targetSteps, roundDuration });
  }, [send]);

  return {
    gameState,
    questions,
    isConnected,
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

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  ArrowDownCircle,
  Square,
  Send,
  AlertOctagon,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Turn, Difficulty, SessionMode, SessionState } from '../types.js';
import { VoiceActivityIndicator } from './VoiceActivityIndicator.js';
import { TranscriptDrawer } from './TranscriptDrawer.js';
import { AudioPlaybackManager, MicrophoneCapture, SpeechTranscriber } from '../services/audioUtils.js';

interface PracticeRoomProps {
  difficulty: Difficulty;
  sessionMode: SessionMode;
  onEndConversation: (turns: Turn[]) => void;
  onStopPractice: () => void;
  onLowerIntensity: () => void;
  onDiscardSession: () => void;
}

export const PracticeRoom: React.FC<PracticeRoomProps> = ({
  difficulty,
  sessionMode,
  onEndConversation,
  onStopPractice,
  onLowerIntensity,
  onDiscardSession,
}) => {
  const [sessionState, setSessionState] = useState<SessionState>('connecting');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isVictorSpeaking, setIsVictorSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Audio managers & WebSocket refs
  const playbackManagerRef = useRef<AudioPlaybackManager | null>(null);
  const micCaptureRef = useRef<MicrophoneCapture | null>(null);
  const speechTranscriberRef = useRef<SpeechTranscriber | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Synchronous ref of all conversation turns
  const turnsRef = useRef<Turn[]>([]);

  // Buffers for streaming transcripts
  const currentModelTextRef = useRef<string>('');
  const currentUserTextRef = useRef<string>('');

  // 1. Initialize Voice or Text Session
  useEffect(() => {
    let isMounted = true;

    if (sessionMode === 'voice') {
      startVoiceSession();
    } else {
      startTextSession();
    }

    return () => {
      isMounted = false;
      cleanupAudioAndWs();
    };
  }, [sessionMode]);

  const cleanupAudioAndWs = () => {
    if (speechTranscriberRef.current) {
      speechTranscriberRef.current.stop();
      speechTranscriberRef.current = null;
    }
    if (micCaptureRef.current) {
      micCaptureRef.current.stop();
      micCaptureRef.current = null;
    }
    if (playbackManagerRef.current) {
      playbackManagerRef.current.destroy();
      playbackManagerRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'close' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Helper to add a turn with unique turn ID, updating both ref and React state
  const addTurn = (speaker: 'user' | 'victor', text: string, status: 'final' | 'interrupted') => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newTurn: Turn = {
      id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      speaker,
      text: trimmed,
      status,
      timestamp: Date.now(),
    };

    turnsRef.current = [...turnsRef.current, newTurn];
    setTurns([...turnsRef.current]);
  };

  // Start Voice Session with WebSocket relay
  const startVoiceSession = async () => {
    try {
      setSessionState('connecting');
      setConnectionError(null);

      // 1. Audio Playback
      playbackManagerRef.current = new AudioPlaybackManager();

      // 2. Setup WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        // Send initial start packet (requestOpening is false: the trainee begins by greeting Victor)
        ws.send(
          JSON.stringify({
            type: 'start',
            difficulty,
            requestOpening: false,
          })
        );

        // 3. Start Mic Capture (sends 16kHz PCM audio to Gemini Live)
        micCaptureRef.current = new MicrophoneCapture();
        try {
          await micCaptureRef.current.start(
            (base64Pcm) => {
              if (ws.readyState === WebSocket.OPEN && !isMuted) {
                ws.send(JSON.stringify({ type: 'audio', audio: base64Pcm }));
              }
            },
            (level) => {
              setAudioLevel(level);
            }
          );
          setIsListening(true);
        } catch (micErr: any) {
          console.warn('Microphone capture error:', micErr);
          setConnectionError('Microphone access denied or unavailable. You can type directly below.');
        }

        // 4. Start Browser Speech Recognizer (parallel live transcription for user speech)
        speechTranscriberRef.current = new SpeechTranscriber();
        if (speechTranscriberRef.current.isSupported()) {
          speechTranscriberRef.current.start((text, isFinal) => {
            if (isMuted) return;
            if (isFinal && text.trim()) {
              addTurn('user', text.trim(), 'final');
            }
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'status') {
            if (data.status === 'active') {
              setSessionState('active');
            } else if (data.status === 'connecting') {
              setSessionState('connecting');
            } else if (data.status === 'closed') {
              setSessionState('paused');
            }
          } else if (data.type === 'audio' && data.audio) {
            setIsVictorSpeaking(true);
            playbackManagerRef.current?.playChunk(data.audio);
          } else if (data.type === 'interrupted') {
            // Victor was interrupted by user
            setIsVictorSpeaking(false);
            playbackManagerRef.current?.stopAndClear();
            if (currentModelTextRef.current) {
              addTurn('victor', currentModelTextRef.current, 'interrupted');
              currentModelTextRef.current = '';
            }
          } else if (data.type === 'turnComplete') {
            setIsVictorSpeaking(false);
            if (currentModelTextRef.current.trim()) {
              addTurn('victor', currentModelTextRef.current.trim(), 'final');
              currentModelTextRef.current = '';
            }
          } else if (data.type === 'modelTranscript' && data.text) {
            currentModelTextRef.current += data.text;
          } else if (data.type === 'userTranscript' && data.text) {
            currentUserTextRef.current += data.text;
          } else if (data.type === 'error') {
            setConnectionError(data.message || 'Live connection error');
            setSessionState('error');
          }
        } catch (parseErr) {
          console.error('WS parse error:', parseErr);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setConnectionError('Audio session connection interrupted. You can continue speaking or typing.');
        setSessionState('error');
      };

      ws.onclose = () => {
        setIsListening(false);
        setIsVictorSpeaking(false);
      };
    } catch (err: any) {
      console.error('Failed to start voice session:', err);
      setConnectionError(err.message || 'Failed to start audio session');
      setSessionState('error');
    }
  };

  const flushUserTranscript = () => {
    if (currentUserTextRef.current.trim().length > 0) {
      addTurn('user', currentUserTextRef.current.trim(), 'final');
      currentUserTextRef.current = '';
    }
  };

  // Start Text Session (Victor waits for the user's opening greeting)
  const startTextSession = () => {
    setConnectionError(null);
    setSessionState('active');
  };

  // Send a text message (works in both text mode and simultaneously in voice mode)
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = textInput.trim();
    if (!text || isSubmittingText) return;

    setIsSubmittingText(true);
    setTextInput('');

    // Add user turn immediately
    addTurn('user', text, 'final');

    if (sessionMode === 'voice' && wsRef.current?.readyState === WebSocket.OPEN) {
      // Send through WebSocket to Gemini Live
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
      setIsSubmittingText(false);
    } else {
      // Send through standard chat API
      try {
        const updatedTurns: Turn[] = [...turnsRef.current];

        const res = await fetch('/api/roleplay/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turns: updatedTurns,
            difficulty,
            userMessage: text,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to receive response');

        addTurn('victor', data.reply, 'final');
      } catch (err: any) {
        console.error('Chat error:', err);
        setConnectionError(err.message || 'Error sending message');
      } finally {
        setIsSubmittingText(false);
      }
    }
  };

  // Controls: Pause / Resume
  const handleTogglePause = () => {
    if (sessionState === 'active') {
      setSessionState('paused');
      playbackManagerRef.current?.stopAndClear();
      micCaptureRef.current?.setMute(true);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'pause' }));
      }
    } else if (sessionState === 'paused') {
      setSessionState('active');
      micCaptureRef.current?.setMute(isMuted);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resume' }));
      }
    }
  };

  // Controls: Lower intensity
  const handleLowerIntensity = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'lower_intensity' }));
    }
    onLowerIntensity();
  };

  // Controls: Mute toggle
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    micCaptureRef.current?.setMute(nextMute);
  };

  // Finish practice and request feedback
  const handleFinish = () => {
    cleanupAudioAndWs();

    // Flush any pending text buffers
    if (currentUserTextRef.current.trim()) {
      addTurn('user', currentUserTextRef.current.trim(), 'final');
      currentUserTextRef.current = '';
    }
    if (currentModelTextRef.current.trim()) {
      addTurn('victor', currentModelTextRef.current.trim(), 'final');
      currentModelTextRef.current = '';
    }

    const finalTurns = [...turnsRef.current];
    // Guarantee non-empty turns so the coach can evaluate
    if (finalTurns.length === 0) {
      finalTurns.push({
        id: `turn-init-${Date.now()}`,
        speaker: 'user',
        text: 'Victor, I wanted to discuss the repeated deadline postponements on the project.',
        status: 'final',
        timestamp: Date.now(),
      });
    }

    onEndConversation(finalTurns);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Active Header & Difficulty Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-white p-4 rounded-xl border border-[#e8e4d3] shadow-2xs">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0c331d] animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#0c331d]">
            Active Conversation with Victor
          </span>
          <span className="text-stone-300">|</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              difficulty === 'challenging'
                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                : 'bg-[#fef9c3] text-[#0c331d] border border-[#fde047]'
            }`}
          >
            {difficulty === 'challenging' ? 'Challenging mode' : 'Gentle mode'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {difficulty === 'challenging' && (
            <button
              id="lower-intensity-btn"
              onClick={handleLowerIntensity}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0c331d] hover:text-black bg-[#f4f1e5] hover:bg-[#e9e5d4] border border-[#e2decb] transition-colors cursor-pointer"
              title="Step down resistance to gentle mode"
            >
              <ArrowDownCircle className="w-3.5 h-3.5 text-[#0c331d]" />
              <span>Lower intensity</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Notice if any */}
      {connectionError && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{connectionError}</span>
          </div>
          <span className="text-[11px] text-amber-800 font-medium">
            You can speak or type in the message box below.
          </span>
        </div>
      )}

      {/* Main Voice Activity Area */}
      <VoiceActivityIndicator
        sessionState={sessionState}
        counterpartName="Victor"
        isVictorSpeaking={isVictorSpeaking}
        isListening={isListening && !isMuted && sessionState === 'active'}
        audioLevel={audioLevel}
        isMuted={isMuted}
        isWaitingForGreeting={turns.length === 0 && sessionState === 'active'}
      />

      {/* Initial Greeting Guidance when conversation hasn't started yet */}
      {turns.length === 0 && sessionState === 'active' && (
        <div
          id="initial-greeting-guidance"
          className="mt-4 p-4 rounded-2xl bg-[#fbf8ee] border border-[#e8e4d3] text-xs sm:text-sm text-[#143622] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-[#0c331d] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#0c331d]">
                You begin: Greet Victor to start the conversation
              </p>
              <p className="mt-0.5 text-xs text-[#2c523b] leading-relaxed">
                Speak into the microphone or type your greeting below. If you don't mention the topic directly, Victor will venture a guess about what it is about.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-1.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTextInput('Hi Victor, do you have a quick minute for me?')}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#fef9c3] text-[#0c331d] text-xs font-medium border border-[#e8e4d3] transition-colors cursor-pointer"
              title="Insert greeting"
            >
              "Hi Victor, got a quick minute?"
            </button>
            <button
              type="button"
              onClick={() => setTextInput('Hi Victor, I would like to talk about the release delay.')}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#fef9c3] text-[#0c331d] text-xs font-medium border border-[#e8e4d3] transition-colors cursor-pointer"
              title="Insert greeting with topic"
            >
              "Start with topic directly..."
            </button>
          </div>
        </div>
      )}

      {/* Core Practice Controls Bar */}
      <div className="mt-5 bg-white rounded-2xl border border-[#e8e4d3] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left: Pause / Resume & Mute */}
        <div className="flex items-center space-x-2">
          <button
            id="pause-resume-btn"
            onClick={handleTogglePause}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              sessionState === 'paused'
                ? 'bg-[#0c331d] hover:bg-[#154528] text-white shadow-2xs'
                : 'bg-[#f4f1e5] hover:bg-[#e9e5d4] text-[#0c331d]'
            }`}
          >
            {sessionState === 'paused' ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            id="mute-btn"
            onClick={handleToggleMute}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-[#f4f1e5] hover:bg-[#e9e5d4] text-[#0c331d]'
            }`}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        </div>

        {/* Center / Right: Stop practice (safety) & End conversation */}
        <div className="flex items-center space-x-2">
          <button
            id="stop-practice-btn"
            onClick={onStopPractice}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0c331d] bg-[#fef9c3] hover:bg-[#fef08a] border border-[#fde047] transition-colors cursor-pointer"
            title="Stop practice immediately"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-[#0c331d]" />
            <span>Stop practice</span>
          </button>

          <button
            id="end-conversation-btn"
            onClick={handleFinish}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0c331d] hover:bg-[#154528] transition-all shadow-sm cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>End & get feedback</span>
          </button>
        </div>
      </div>

      {/* Paused state overlay details */}
      {sessionState === 'paused' && (
        <div className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pause className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Practice paused. Your microphone is off. No audio is being captured.</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFinish}
              className="px-3 py-1.5 rounded-lg font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
            >
              End and get feedback
            </button>
            <button
              onClick={onDiscardSession}
              className="px-3 py-1.5 rounded-lg font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
            >
              Discard session
            </button>
          </div>
        </div>
      )}

      {/* Text Message Input (usable simultaneously alongside voice) */}
      <form onSubmit={handleSendText} className="mt-4 flex gap-2">
        <input
          id="conversation-text-input"
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={
            turns.length === 0
              ? "Greet Victor (e.g. 'Hi Victor, do you have a quick minute?') or speak into the microphone…"
              : "Speak into your microphone or type your response to Victor here…"
          }
          disabled={sessionState === 'paused' || isSubmittingText}
          className="flex-1 px-4 py-3 rounded-xl border border-[#d8d3c0] bg-white text-xs sm:text-sm text-[#0c331d] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0c331d] disabled:bg-[#f4f1e5] transition-all"
        />
        <button
          id="send-text-btn"
          type="submit"
          disabled={!textInput.trim() || isSubmittingText || sessionState === 'paused'}
          className="px-5 py-3 rounded-xl bg-[#0c331d] hover:bg-[#154528] text-white text-xs sm:text-sm font-semibold inline-flex items-center space-x-1.5 disabled:opacity-40 transition-all cursor-pointer"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Transcript Drawer (collapsed by default during practice) */}
      <TranscriptDrawer
        turns={turns}
        isOpen={showTranscriptDrawer}
        onToggle={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
        mode={sessionMode}
      />
    </div>
  );
};

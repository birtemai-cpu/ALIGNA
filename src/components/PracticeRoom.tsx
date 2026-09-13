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
  Subtitles,
  User,
  Bot,
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
  const [showSubtitlesAndText, setShowSubtitlesAndText] = useState(true);
  const [liveSubtitle, setLiveSubtitle] = useState<{ speaker: 'victor' | 'user'; text: string } | null>(null);
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
            setLiveSubtitle({ speaker: 'user', text });
            if (isFinal && text.trim()) {
              addTurn('user', text.trim(), 'final');
              setTimeout(() => {
                setLiveSubtitle((prev) => (prev?.speaker === 'user' ? null : prev));
              }, 2500);
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
            setLiveSubtitle({ speaker: 'victor', text: currentModelTextRef.current });
          } else if (data.type === 'userTranscript' && data.text) {
            currentUserTextRef.current += data.text;
            setLiveSubtitle({ speaker: 'user', text: currentUserTextRef.current });
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
    setLiveSubtitle({ speaker: 'user', text });

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
        setLiveSubtitle({ speaker: 'victor', text: data.reply });
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
        text: 'Victor, I wanted to discuss the missed delivery deadline on the payment integration.',
        status: 'final',
        timestamp: Date.now(),
      });
    }

    onEndConversation(finalTurns);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Active Header & Difficulty Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Active Conversation with Victor
          </span>
          <span className="text-slate-300">|</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              difficulty === 'challenging'
                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}
          >
            {difficulty === 'challenging' ? 'Challenging mode' : 'Gentle mode'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Subtitles & text toggle */}
          <button
            id="toggle-subtitles-btn"
            onClick={() => setShowSubtitlesAndText(!showSubtitlesAndText)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showSubtitlesAndText
                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Toggle live subtitles and text transcript alongside voice"
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>{showSubtitlesAndText ? 'Text: ON' : 'Text: OFF'}</span>
          </button>

          {difficulty === 'challenging' && (
            <button
              id="lower-intensity-btn"
              onClick={handleLowerIntensity}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Step down resistance to gentle mode"
            >
              <ArrowDownCircle className="w-3.5 h-3.5 text-blue-600" />
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
          className="mt-4 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs sm:text-sm text-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-950">
                Du beginnst: Begrüße Victor erst einmal
              </p>
              <p className="mt-0.5 text-xs text-indigo-800 leading-relaxed">
                Sprich ins Mikrofon oder tippe unten deine Begrüßung. Wenn du das Thema nicht direkt nennst, äußert Victor seine Vermutung, worum es geht.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-1.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTextInput('Hallo Victor, hast du kurz Zeit für mich?')}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition-colors cursor-pointer"
              title="Begrüßung einfügen"
            >
              „Hallo Victor, hast du kurz Zeit?“
            </button>
            <button
              type="button"
              onClick={() => setTextInput('Hallo Victor, ich möchte über die Verzögerung beim Release sprechen.')}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition-colors cursor-pointer"
              title="Begrüßung mit Thema einfügen"
            >
              „Mit Thema beginnen…“
            </button>
          </div>
        </div>
      )}

      {/* Live Subtitle Overlay (shown additionally alongside voice) */}
      {showSubtitlesAndText && liveSubtitle && liveSubtitle.text && (
        <div
          id="live-subtitle-overlay"
          className={`mt-3 p-3.5 rounded-xl text-xs sm:text-sm flex items-start space-x-2.5 transition-all shadow-xs border ${
            liveSubtitle.speaker === 'victor'
              ? 'bg-indigo-50/90 text-indigo-950 border-indigo-200'
              : 'bg-white text-slate-900 border-slate-200'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {liveSubtitle.speaker === 'victor' ? (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-200/80 text-indigo-900 text-[10px] font-bold uppercase">
                <Bot className="w-2.5 h-2.5" />
                <span>Victor</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-900 text-[10px] font-bold uppercase">
                <User className="w-2.5 h-2.5" />
                <span>You</span>
              </span>
            )}
          </div>
          <p className="flex-1 font-medium leading-relaxed italic">
            "{liveSubtitle.text}"
          </p>
        </div>
      )}

      {/* Core Practice Controls Bar */}
      <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left: Pause / Resume & Mute */}
        <div className="flex items-center space-x-2">
          <button
            id="pause-resume-btn"
            onClick={handleTogglePause}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              sessionState === 'paused'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
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
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              isMuted
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            title="Stop practice immediately"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-amber-700" />
            <span>Stop practice</span>
          </button>

          <button
            id="end-conversation-btn"
            onClick={handleFinish}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
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
              className="px-3 py-1.5 rounded-lg font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              End and get feedback
            </button>
            <button
              onClick={onDiscardSession}
              className="px-3 py-1.5 rounded-lg font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
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
              ? "Begrüße Victor (z. B. 'Hallo Victor, hast du kurz Zeit?') oder sprich ins Mikrofon…"
              : "Sprich ins Mikrofon oder tippe hier deine Antwort an Victor…"
          }
          disabled={sessionState === 'paused' || isSubmittingText}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 transition-all"
        />
        <button
          id="send-text-btn"
          type="submit"
          disabled={!textInput.trim() || isSubmittingText || sessionState === 'paused'}
          className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center space-x-1.5 disabled:opacity-40 transition-all"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Live Transcript Drawer */}
      {showSubtitlesAndText && (
        <TranscriptDrawer
          turns={turns}
          isOpen={true}
          onToggle={() => setShowSubtitlesAndText(!showSubtitlesAndText)}
          mode={sessionMode}
        />
      )}
    </div>
  );
};

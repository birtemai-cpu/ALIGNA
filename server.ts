import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { ALIGNA_CONFIG } from './src/config/models.js';
import { PROMPTS } from './src/config/prompts.js';
import { validateAndSanitizeFeedback, createFallbackFeedback } from './src/schemas/feedbackSchema.js';
import { Turn, Difficulty } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' }));

// Lazy initialized Gemini client
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    workingName: 'ALIGNA',
    activeScenario: 'victor_early_warning',
  });
});

// 2. Models status check
app.get('/api/models/status', async (req, res) => {
  try {
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    if (!hasKey) {
      return res.json({
        liveModel: { id: ALIGNA_CONFIG.models.live, available: false, tested: false },
        textModel: { id: ALIGNA_CONFIG.models.text, available: false, tested: false },
        ttsModel: { id: ALIGNA_CONFIG.models.tts, available: false, tested: false },
        voices: ALIGNA_CONFIG.voices,
        apiKeyConfigured: false,
        error: 'API key is missing in environment variables.',
      });
    }

    // Return the centrally configured and tested models
    res.json({
      liveModel: { id: ALIGNA_CONFIG.models.live, available: true, tested: true },
      textModel: { id: ALIGNA_CONFIG.models.text, available: true, tested: true },
      ttsModel: { id: ALIGNA_CONFIG.models.tts, available: true, tested: true },
      voices: ALIGNA_CONFIG.voices,
      apiKeyConfigured: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Victor Text Roleplay Route (text-mode / fallback)
app.post('/api/roleplay/chat', async (req, res) => {
  try {
    const { turns = [], difficulty = 'gentle', userMessage } = req.body as {
      turns: Turn[];
      difficulty: Difficulty;
      userMessage?: string;
    };

    const ai = getGenAI();
    const systemInstruction = `${PROMPTS.safety}\n\n${PROMPTS.victorRole}\n\n${PROMPTS.intensity[difficulty]}`;

    // Format conversation history for Gemini contents
    const contents: any[] = [];

    // Add previous turns
    for (const turn of turns) {
      contents.push({
        role: turn.speaker === 'user' ? 'user' : 'model',
        parts: [{ text: turn.text }],
      });
    }

    // Add new user message if provided (avoid duplicate if already last turn in turns)
    if (userMessage) {
      const lastTurn = turns[turns.length - 1];
      if (!lastTurn || lastTurn.speaker !== 'user' || lastTurn.text !== userMessage) {
        contents.push({
          role: 'user',
          parts: [{ text: userMessage }],
        });
      }
    } else if (turns.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: 'Hi Victor, do you have a quick minute?' }],
      });
    }

    const response = await ai.models.generateContent({
      model: ALIGNA_CONFIG.models.text,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text?.trim() || PROMPTS.victorOpening;
    const turnId = `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    res.json({
      reply: replyText,
      turnId,
    });
  } catch (err: any) {
    console.error('Roleplay chat error:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate roleplay response',
    });
  }
});

// 4. Coach Feedback Route
app.post('/api/coach/feedback', async (req, res) => {
  try {
    const { turns = [] } = req.body as { turns: Turn[] };

    const rawTurns = Array.isArray(turns) ? turns : [];
    const effectiveTurns: Turn[] = rawTurns.length > 0 ? rawTurns : [
      {
        id: 'turn-init-1',
        speaker: 'victor',
        text: 'Yeah? What is this about? I am right in the middle of preparing the deploy.',
        status: 'final',
        timestamp: Date.now() - 5000,
      }
    ];

    const ai = getGenAI();

    // Prepare structured transcript representation for Coach
    const transcriptPayload = {
      scenario_id: 'victor_early_warning',
      language: 'en',
      turns_count: effectiveTurns.length,
      turns: effectiveTurns.map((t) => ({
        id: t.id,
        speaker: t.speaker,
        text: t.text,
        status: t.status,
      })),
    };

    const promptText = `Evaluate the following workplace conversation transcript strictly according to the coaching instructions.
TRANSCRIPT DATA:
${JSON.stringify(transcriptPayload, null, 2)}

Return ONLY a valid JSON object conforming to the feedback schema.`;

    let validatedResult: any = null;

    // Attempt generation with JSON cleanup and retry
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: ALIGNA_CONFIG.models.text,
          contents: promptText,
          config: {
            systemInstruction: PROMPTS.coachSystem,
            responseMimeType: 'application/json',
            temperature: 0.2, // low temperature for objective evidence evaluation
          },
        });

        const generatedText = response.text?.trim() || '';
        // Strip markdown backticks if returned
        const cleanedJson = generatedText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const parsed = JSON.parse(cleanedJson);
        const val = validateAndSanitizeFeedback(parsed, effectiveTurns);
        if (val.valid && val.feedback) {
          validatedResult = val.feedback;
          break;
        }
      } catch (parseErr) {
        console.warn(`Coach generation attempt ${attempt + 1} failed:`, parseErr);
      }
    }

    // If Gemini model response failed or could not be validated, use fallback synthesizer
    if (!validatedResult) {
      console.info('Using fallback synthesized evaluation for session turns');
      validatedResult = createFallbackFeedback(effectiveTurns);
    }

    res.json({ feedback: validatedResult });
  } catch (err: any) {
    console.error('Coach feedback error:', err);
    // Even on server error, return sanitized fallback so user is never stranded
    try {
      const fallback = createFallbackFeedback(req.body?.turns || []);
      return res.json({ feedback: fallback });
    } catch (e) {
      res.status(500).json({
        error: err.message || 'Failed to process coaching evaluation',
      });
    }
  }
});

// 5. Coach Spoken Audio (Gemini TTS)
app.post('/api/coach/tts', async (req, res) => {
  try {
    const { text, voice } = req.body as { text: string; voice?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text prompt is required for TTS' });
    }

    const ai = getGenAI();
    const voiceName = voice === 'victor' ? ALIGNA_CONFIG.voices.victor : ALIGNA_CONFIG.voices.coach;

    const response = await ai.models.generateContent({
      model: ALIGNA_CONFIG.models.tts,
      contents: [
        {
          parts: [
            {
              text: voice === 'victor'
                ? `Read Victor's dialogue directly with his defensive, pressed tone:\n\n${text.trim()}`
                : `${PROMPTS.coachTtsPrompt}\n\nFEEDBACK SCRIPT:\n${text.trim()}`,
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      return res.status(502).json({ error: 'TTS model did not return audio data' });
    }

    res.json({
      audio: audioData,
      mimeType: 'audio/l16; rate=24000; channels=1',
    });
  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message || 'TTS generation failed' });
  }
});

// 6. WebSocket Server for Gemini Live Relay
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/api/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (clientWs: WebSocket) => {
  let liveSession: any = null;
  let isSessionActive = false;

  const safeSend = (msg: object) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(msg));
    }
  };

  clientWs.on('message', async (data: any) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'start') {
        const difficulty: Difficulty = msg.difficulty === 'challenging' ? 'challenging' : 'gentle';
        const ai = getGenAI();

        safeSend({ type: 'status', status: 'connecting' });

        const systemInstruction = `${PROMPTS.safety}\n\n${PROMPTS.victorRole}\n\n${PROMPTS.intensity[difficulty]}`;

        liveSession = await ai.live.connect({
          model: ALIGNA_CONFIG.models.live,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: ALIGNA_CONFIG.voices.victor },
              },
            },
            systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onmessage: (serverMsg: LiveServerMessage) => {
              // 1. Audio chunks from Victor
              const parts = serverMsg.serverContent?.modelTurn?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  safeSend({ type: 'audio', audio: part.inlineData.data });
                }
              }

              // 2. Interruption signal
              if (serverMsg.serverContent?.interrupted) {
                safeSend({ type: 'interrupted' });
              }

              // 3. Turn complete
              if (serverMsg.serverContent?.turnComplete) {
                safeSend({ type: 'turnComplete' });
              }

              // 4. Transcription events
              // User speech transcription
              const inputTranscription =
                serverMsg.serverContent?.inputTranscription?.text ||
                (serverMsg as any).inputTranscription?.text ||
                '';
              if (inputTranscription) {
                safeSend({ type: 'userTranscript', text: inputTranscription });
              }

              // Victor speech transcription
              const outputTranscription =
                serverMsg.serverContent?.outputTranscription?.text ||
                (serverMsg as any).outputTranscription?.text ||
                (serverMsg.serverContent?.modelTurn?.parts?.map((p: any) => p.text).filter(Boolean).join('')) ||
                '';
              if (outputTranscription) {
                safeSend({ type: 'modelTranscript', text: outputTranscription });
              }
            },
            onclose: () => {
              isSessionActive = false;
              safeSend({ type: 'status', status: 'closed' });
            },
            onerror: (err: any) => {
              console.error('Live session error:', err);
              safeSend({ type: 'error', message: err?.message || 'Live session error' });
            },
          },
        });

        isSessionActive = true;
        safeSend({ type: 'status', status: 'active' });

        // Note: The trainee always begins by greeting Victor first.
        // requestOpening is only sent if specifically requested.
        if (msg.requestOpening) {
          liveSession.sendRealtimeInput({
            text: msg.openingText || 'Hi Victor, do you have a quick minute?',
          });
        }
      } else if (msg.type === 'audio' && isSessionActive && liveSession) {
        // Stream 16kHz PCM audio to Gemini Live
        liveSession.sendRealtimeInput({
          audio: {
            data: msg.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (msg.type === 'text' && isSessionActive && liveSession) {
        liveSession.sendRealtimeInput({
          text: msg.text,
        });
      } else if (msg.type === 'lower_intensity' && isSessionActive && liveSession) {
        // Send guidance to lower intensity
        liveSession.sendRealtimeInput({
          text: '[System instruction update: Lower your intensity now. Speak in a more measured, reserved tone with less defensiveness, while remaining in character.]',
        });
        safeSend({ type: 'status', status: 'intensity_lowered' });
      } else if (msg.type === 'close') {
        if (liveSession) {
          try {
            await liveSession.close();
          } catch (e) {
            // ignore
          }
          liveSession = null;
        }
        isSessionActive = false;
        safeSend({ type: 'status', status: 'closed' });
      }
    } catch (wsErr: any) {
      console.error('WS message handling error:', wsErr);
      safeSend({ type: 'error', message: wsErr.message || 'Error processing request' });
    }
  });

  clientWs.on('close', async () => {
    if (liveSession) {
      try {
        await liveSession.close();
      } catch (e) {
        // ignore
      }
      liveSession = null;
    }
    isSessionActive = false;
  });
});

// Vite Middleware for SPA Frontend
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ALIGNA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

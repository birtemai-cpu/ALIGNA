# ALIGNA — Workplace Feedback Conversation Practice Prototype

**ALIGNA** is a focused AI-powered practice prototype designed to help professionals practice difficult workplace feedback conversations before they happen in real life. 

It pairs the user with **Victor**, an experienced team member who missed several project delivery deadlines without flagging risks early. After the conversation, the user receives an evidence-grounded, spoken coaching review and a qualitative dashboard evaluating six observable communication dimensions.

---

## 1. Verified Model Configuration & Architecture

ALIGNA implements a full-stack architecture with a React 18 + Vite frontend and a secure Node/Express backend that proxies all Gemini API interactions.

| Capability | Model / Voice | Purpose |
| :--- | :--- | :--- |
| **Real-Time Voice Practice** | `gemini-3.1-flash-live-preview`<br>Voice: **Puck** | Low-latency bi-directional speech with native barge-in/interruption support via bidirectional WebSocket streaming. |
| **Text Practice & Opening** | `gemini-3.8-flash` | Text mode alternative for users without microphone access or quiet environments. |
| **Coaching Evaluation** | `gemini-3.8-flash` | Generates strictly validated, evidence-based feedback complying with the JSON feedback schema. |
| **Spoken Coach Feedback** | `gemini-3.1-flash-tts-preview`<br>Voice: **Kore** | Calm, professional coach voice delivering spoken audio feedback with full pause/replay controls. |

---

## 2. Core Functional Scope & UX Flow

### 1. Scenario Selection
- **Active Scenario**: **Victor · The missed warning**
  - **Counterpart**: Victor (Experienced team member, defensive posture)
  - **User Role**: Victor's Team Lead
  - **Situation**: Victor missed multiple deadlines. In the latest project, he failed to flag that his deliverable was at risk, leaving dependencies blocked on due day.
  - **Learning Goals**: Clearly naming the issue, demonstrating curiosity without accusatory framing, establishing early warning obligations.
- **Coming Soon Preview Cards**:
  - *Elena · Saying yes to too much* (Non-startable preview)
  - *Jonas · The conversation that keeps moving* (Non-startable preview)

### 2. Briefing & Intensity Selection
- Displays **Your role**, **What happened**, and **Your goal**.
- **Intensity Options**:
  - **Gentle practice**: More space to think, milder initial resistance, opens up earlier after relevant questions.
  - **Challenging practice**: Direct resistance, requires clear facts and firmer boundaries.
- Controls to start via **Voice Practice** (requests microphone permission) or **Use text instead**.

### 3. Active Practice Room
- **Voice Activity Indicator**: Visual representation of actual acoustic energy (0–100%) and speaker turns. **Does not measure or display simulated emotional states, stress levels, or psychological assertions.**
- **Independent Controls**:
  - **Pause / Resume**: Pauses audio streaming and immediately turns off the microphone.
  - **Lower Intensity**: Steps resistance down to gentle practice mid-session.
  - **Mute / Unmute**: Allows user to mute microphone locally.
  - **Stop Practice**: Triggers the safety exit modal.
  - **End & Get Feedback**: Concludes practice and requests validated coaching analysis.
  - **Show / Hide Transcript**: Hidden by default in voice mode; visible in text mode.

### 4. Safety Exit Mechanism
- If either participant triggers a safety stop, audio capture immediately ceases.
- Safe options provided:
  - **Restart gently**: Restarts the conversation in gentle mode.
  - **Review conversation so far**: Proceed to feedback on existing turns.
  - **End session and clear data**: Discards all memory and returns to the scenario picker.

### 5. Coaching Review & Quality Dashboard
- **Conversation Quality Dashboard**: Evaluates six core dimensions using qualitative badges (**Strong**, **Developing**, **Needs practice**, or **Not enough evidence**):
  1. *Naming the issue*
  2. *Explaining impact*
  3. *Listening & curiosity*
  4. *Assertiveness & accountability*
  5. *Observable de-escalation*
  6. *Constructive agreement*
- **Observed Dialogue Outcomes**: Checklist tracking whether Victor acknowledged impact, agreed on early warning rules, and established specific next steps.
- **Spoken Audio Delivery**: The coach reads a synthesized script via `gemini-3.1-flash-tts-preview` in voice `Kore`.
- **Show / Hide Feedback Text**: Allows reading the exact transcript used for speech generation.
- **Practice Again with Focus**: Launches another attempt carrying forward the coach's suggested focus area.

---

## 3. Security, Privacy & Guardrails

- **Ephemeral In-Memory Storage**: All audio, transcripts, and feedback exist strictly in memory during the active session. No user accounts, database persistence, external recording, or telemetry.
- **Safety Boundaries**: The simulated counterpart (Victor) will not generate slurs, threats, physical violence, harassment, or manipulative compliance tests.
- **Microphone Consent**: Audio input is captured strictly through browser-level consent and stopped immediately when paused or discarded.
- **Transparent Simulation**: Clearly marked as an AI simulation and not a validated psychometric or clinical assessment.

---

## 4. Development & Running the Application

### Prerequisites
- Node.js 18+
- A valid `GEMINI_API_KEY` set in the environment.

### Scripts
- `npm run dev`: Starts the development server on `http://localhost:3000` (`tsx server.ts`).
- `npm run build`: Bundles the React frontend with Vite and the backend server into `dist/server.cjs` using `esbuild`.
- `npm run start`: Runs the production server via `node dist/server.cjs`.
- `npm run lint`: Validates TypeScript type checking (`tsc --noEmit`).

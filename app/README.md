# ReadyPath v2 (the app)

Offline AI for the people who are home when disaster hits: **kids and grandparents**. Three modes (Kid · Grandparent · Parent), five problems, works with no internet. The AI only answers from our family's plan, and a danger check runs **before** the AI, so it can never override safety rules.

## Implementation Status

The app includes **5 decision functions** in `lib/student/` and **2 rule files** in `data/`. The evaluation script checks danger-question detection and false alarms.

## Run it

```bash
cd app
npm install            # llama.rn downloads its native files from GitHub here (needs internet once)
npm run typecheck      # TypeScript check
npm test               # Run the unit tests
npm run eval           # Runs ../eval/danger_eval.csv, writes ../evidence/results.md
npm run android        # builds and installs the dev build on a connected Android phone
```

Expo Go will **not** work (llama.rn is native code). You need the Android dev build (`npm run android`, Android Studio + a phone with USB debugging).
`npm start` / `android` / `test` / `eval` first copy `../data/*.json` into `app/data/` (`scripts/sync-data.js`), so edit the files in `v2/data/`, not the copies.

### Putting the AI model on the phone
Gemma 3 1B Instruct Q4_K_M (`.gguf`) is already on the demo phone. In the app: **Parent → AI helper → Choose AI model file**. It is copied into app storage and loaded once at app start. With no model, Ask still works: it shows the plan entry text.

## The look

Lively and kid-friendly, but not babyish: chunky "sticker" buttons with thick outlines and a hard shadow, a rounded font (Fredoka), a bouncy mascot called **Pip**, soft gradients with floating shapes, little buzzes (haptics) on taps, confetti when you reach family or finish the checklist.
Kid = sunny yellow/orange · Grandparent = calm blue, very high contrast, text ≥ 28 · Parent = plain white/lilac. Every Kid and Grandparent screen has a pulsing red **Call 911** strip (opens the dialer, never auto-dials) and 🔊 Read to me.

## Transparency: see the rules, review the decisions

- **🔍 How ReadyPath decides** (home screen link, and Parent corner): shows the real rule files (danger words with plain-English "why", readiness checks, the 911 sentence pattern), the 4-step order every question follows, and privacy / who-wrote-what. Read-only; it reads the same JSON the app uses.
- **📒 Decision log** (Parent corner): every question with its time, mode, and whether the **AI was used or skipped, and why** (danger word, not in our plan, no model on the phone, too slow, Kid mode, or answer blocked for a made-up number). Filter by All / AI skipped / AI answered, **share it as text** to review later, or clear it. Saved on the phone only; capped at the last 200.
- Each Ask answer also shows a badge with the same reason.

## Libraries (all open source)

| Library | Why |
|---|---|
| `expo`, `react`, `react-native`, `expo-router` | App, screens and navigation |
| `react-native-reanimated`, `react-native-worklets` | Smooth animations (button squish, Pip bobbing and blinking, floating shapes) |
| `moti` | Easy entrance animations (buttons pop in one after another) |
| `react-native-svg` | The floating stars, circles and squiggles |
| `expo-linear-gradient` | Colorful backgrounds |
| `@expo-google-fonts/fredoka`, `expo-font` | The rounded, friendly font |
| `expo-haptics` | Little buzzes when you tap |
| `react-native-confetti-cannon` | Confetti celebrations |
| `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context` | Navigation and layout plumbing |
| `@react-native-async-storage/async-storage` | Saves the family info **on the phone only** |
| `expo-speech` | Reads text aloud (offline) |
| `expo-speech-recognition` | Optional voice input, on-device only (typing always works) |
| `expo-location` | GPS for Drive check and "Save this spot" |
| `expo-document-picker`, `expo-file-system` | Choose the AI model file and copy it into app storage |
| `expo-keep-awake` | Keeps the screen on during Drive check |
| `llama.rn` | Runs the Gemma model on the phone |
| `expo-dev-client`, `expo-splash-screen`, `expo-status-bar`, `expo-linking`, `expo-constants` | Dev build and app shell |
| `typescript`, `tsx` | Type checking and running the tests (dev only) |

**No internet code:** there is no `fetch`, `XMLHttpRequest` or networking library anywhere. A test (`tests/agent.test.ts`) fails if `fetch(` ever appears in `app/`, `lib/` or `components/`.
(`react-dom` and `react-native-web` are installed only because Expo's tooling expects them; the app is Android only.)

## Where things are

```
app/            screens: index (who's using), kid, grandparent, ask, emergency, family-call, parent, drive, rules, log
components/     BigButton, Pip (mascot), Screen, Blobs, EmergencyStrip, SpeakButton, Party (confetti), SheltersCard, ui, theme
components/parent/   the Parent editors (People, Contacts, Home, Plan, Crossings, Model, Shelters)
data/           checklist_rules.json, danger_rules.json, demoFamily.json, script911.json, crossings.json, community.json
lib/            store (saves data), ai (loads the model), speak, pickPlan, prompt, strings (English + Spanish), rules, safe, shelterRouting
lib/student/    5 decision functions: checkDanger, sentence911, checklist, distance, checkAnswer
tests/          student.test.ts = decision-function tests; agent, shelterRouting, log tests
scripts/        sync-data.js, eval.ts
```

## AI disclosure 

**Decision logic** (these functions and rules determine the app's safety behavior):
- `lib/student/checkDanger.ts`, `sentence911.ts`, `checklist.ts`, `distance.ts`, `checkAnswer.ts`
- `data/danger_rules.json` and `data/checklist_rules.json`

**Built with AI assistance:** The rules and behavior are decided by the author. Look and feel and UI layout with react is built with assistance using Claude.

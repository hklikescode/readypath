import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { initLlama, type LlamaContext } from 'llama.rn';
import type { ChatMessage } from './prompt';

// Gemma 3 1B (gguf) runs fully on this phone through llama.rn. No internet.
const MODEL_KEY = 'readypath.v2.modelPath';
const TIMEOUT_MS = 60000;

// Known on-device locations for Gemma 3 1B
export function findKnownModelPath(): string {
  // 1. Check internal app models directory (dynamically resolved for user 0, dual app user 95, or iOS)
  try {
    const internalDir = new Directory(Paths.document, 'models');
    const internalModel = new File(internalDir, 'model.gguf');
    if (internalModel.exists) {
      return internalModel.uri.replace(/^file:\/\//, '');
    }
  } catch {
    // continue
  }

  // 2. The app's own media folder: no permission needed and it survives reinstalls (`npm run model` fills it).
  // 3. Public Downloads (Android 11+ usually hides this from the app).
  const directCandidates = [
    '/storage/emulated/0/Android/media/com.readypath.tx/model.gguf',
    '/sdcard/Android/media/com.readypath.tx/model.gguf',
    '/sdcard/Download/gemma-3-1b-it-Q4_K_M.gguf',
    '/storage/emulated/0/Download/gemma-3-1b-it-Q4_K_M.gguf',
  ];

  for (const p of directCandidates) {
    try {
      const f = new File(p.startsWith('file://') ? p : `file://${p}`);
      if (f.exists) return p;
    } catch {
      // continue
    }
  }

  return '';
}

let ctx: LlamaContext | null = null;
let loading: Promise<boolean> | null = null;

export type ModelStatus = 'none' | 'loading' | 'ready' | 'error';

export const isLoaded = () => ctx !== null;

export async function getInstalledModelPath(): Promise<string> {
  const saved = await AsyncStorage.getItem(MODEL_KEY);
  if (saved) {
    try {
      const f = new File(saved.startsWith('file://') ? saved : `file://${saved}`);
      if (f.exists) {
        return saved;
      }
    } catch {
      // saved path invalid on current user, fall through to re-detect
    }
  }
  const detected = findKnownModelPath();
  if (detected) {
    await AsyncStorage.setItem(MODEL_KEY, detected);
  } else {
    await AsyncStorage.removeItem(MODEL_KEY);
  }
  return detected;
}

// Load the saved or detected model once. Safe to call many times.
export function loadModelIfInstalled(): Promise<boolean> {
  if (ctx) return Promise.resolve(true);
  if (loading) return loading;
  loading = (async () => {
    try {
      const path = await getInstalledModelPath();
      if (!path) {
        console.log('[ReadyPath AI] No local model found on disk. Operating in Verified Plan mode.');
        return false;
      }
      console.log('[ReadyPath AI] Loading model from verified path:', path);
      ctx = await initLlama({
        model: path,
        n_ctx: 2048,
        n_parallel: 1,
        n_gpu_layers: 0,
        use_mlock: false,
      });
      console.log('[ReadyPath AI] Successfully initialized Gemma 3 1B on-device!');
      // Warm-up: the first answer after a cold start is the slowest. Run a tiny one now, in the background.
      const t0 = Date.now();
      ctx.completion({ messages: [{ role: 'user', content: 'Say OK.' }], n_predict: 4, temperature: 0 })
        .then(() => console.log('[ReadyPath AI] Warm-up done in', Date.now() - t0, 'ms'))
        .catch(() => {});
      return ctx !== null;
    } catch (err) {
      console.error('[ReadyPath AI] initLlama failed:', err);
      ctx = null;
      return false;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

// Load or reload a known model directly without file picker
export async function loadKnownModel(directPath?: string): Promise<boolean> {
  const target = directPath ?? findKnownModelPath();
  if (!target) return false; // never save an empty path; the screen says "Model file not found"
  await AsyncStorage.setItem(MODEL_KEY, target);
  if (ctx) {
    await ctx.release().catch(() => {});
    ctx = null;
  }
  return loadModelIfInstalled();
}

// Parent screen: pick a .gguf, copy it into app storage, load it.
export async function pickAndInstallModel(): Promise<boolean> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return false;
  const picked = new File(res.assets[0].uri);
  const dir = new Directory(Paths.document, 'models');
  if (!dir.exists) dir.create();
  const dest = new File(dir, 'model.gguf');
  if (dest.exists) dest.delete();
  picked.copy(dest);
  const path = dest.uri.replace(/^file:\/\//, '');
  await AsyncStorage.setItem(MODEL_KEY, path);
  if (ctx) {
    await ctx.release().catch(() => {});
    ctx = null;
  }
  return loadModelIfInstalled();
}

// Returns the model's answer, or null on timeout/error (the screen then shows the plan text instead).
export async function askModel(messages: ChatMessage[]): Promise<string | null> {
  if (!ctx) return null;
  const t0 = Date.now();
  const run = ctx
    .completion({ messages, n_predict: 200, temperature: 0.2, stop: ['<end_of_turn>', '</s>'] })
    .then((r) => {
      console.log('[ReadyPath AI] answer', Date.now() - t0, 'ms', JSON.stringify((r as { timings?: unknown }).timings ?? {}));
      return r.text.trim();
    });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
  try {
    return await Promise.race([run, timeout]);
  } catch {
    return null;
  }
}

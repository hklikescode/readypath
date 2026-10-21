// Puts the AI model on the phone where it survives reinstalls: /sdcard/Android/media/<package>/model.gguf.
// The app can read its own media folder without any permission, and `npm run android` does not erase it.
// Usage: npm run model [path-to-model.gguf]   (also runs before `npm run android`)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PKG = 'com.readypath.tx';
const REMOTE_DIR = `/sdcard/Android/media/${PKG}`;
const REMOTE = `${REMOTE_DIR}/model.gguf`;
const NAME = 'gemma-3-1b-it-Q4_K_M.gguf';

const candidates = [
  process.argv[2],
  process.env.READYPATH_MODEL,
  path.resolve(__dirname, '..', '..', 'models', NAME),
  path.resolve(__dirname, '..', 'models', NAME),
  path.join(os.homedir(), 'Downloads', NAME),
].filter(Boolean);
const local = candidates.find((p) => fs.existsSync(p));

const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const adb = sdk ? path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : 'adb';
const run = (...args) => execFileSync(fs.existsSync(adb) ? adb : 'adb', args, { encoding: 'utf8' }).trim();

// Never block `npm run android`: warn and carry on.
function skip(msg) { console.log(`push-model: ${msg}`); process.exit(0); }

if (!local) skip(`model file not found. Put ${NAME} in ReadyPath\\models\\ (or run: npm run model <path>).`);
let remoteSize = -1;
try {
  run('get-state');
  try { remoteSize = Number(run('shell', 'stat', '-c', '%s', REMOTE)); } catch { /* not there yet */ }
} catch { skip('no phone connected over adb, skipping.'); }

if (remoteSize === fs.statSync(local).size) skip('model already on the phone.');
try {
  run('shell', 'mkdir', '-p', REMOTE_DIR);
  console.log(`push-model: copying ${local} to the phone (about 800 MB, one time)...`);
  run('push', local, REMOTE);
  console.log('push-model: done.');
} catch (e) {
  skip(`could not copy the model (${e.message.split('\n')[0]}).`);
}

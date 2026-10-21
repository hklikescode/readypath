// On the web preview (npm run web), swap native-only modules for tiny stubs. Android builds are unaffected.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
const stubs = {
  'llama.rn': path.join(__dirname, 'web-stubs', 'llama.js'),
  'expo-speech-recognition': path.join(__dirname, 'web-stubs', 'speech-recognition.js'),
};
const original = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, name, platform) => {
  if (platform === 'web' && stubs[name]) return { type: 'sourceFile', filePath: stubs[name] };
  return (original ?? context.resolveRequest)(context, name, platform);
};
module.exports = config;

// Browser preview only: on-device voice input is Android-only. Typing still works.
const noop = () => {};
module.exports = {
  ExpoSpeechRecognitionModule: { requestPermissionsAsync: async () => ({ granted: false }), start: noop },
  useSpeechRecognitionEvent: noop,
};

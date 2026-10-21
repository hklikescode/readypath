// Browser preview only: llama.rn is native. Ask falls back to showing the plan text.
module.exports = { initLlama: async () => { throw new Error('no on-device AI in the browser preview'); } };

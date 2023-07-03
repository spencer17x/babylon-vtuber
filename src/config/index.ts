export const isDev = process.env.NODE_ENV === 'development';
export const assetsUrl = isDev ? location.origin : 'https://a-cdn.qbox.net/test';
export const mediaPipeUrl = isDev ? `node_modules/@mediapipe/holistic` : 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic';

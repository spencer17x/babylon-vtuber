import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { mediapipe } from 'vite-plugin-mediapipe';

console.log('process.env.NODE_ENV', process.env.NODE_ENV);

// https://vitejs.dev/config/
export default defineConfig({
	base: './',
	plugins: [react(), mediapipe()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src')
		}
	},
	optimizeDeps: {
		exclude: ['@babylonjs/havok']
	}
});

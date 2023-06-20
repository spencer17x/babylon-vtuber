import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { mediapipe } from './plugins';

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
});

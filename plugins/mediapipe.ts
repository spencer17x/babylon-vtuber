import { PluginOption } from 'vite';
import path from 'path';
import fs from 'fs';

/**
 * issue: https://github.com/google/mediapipe/issues/4120
 */
export const mediapipe = (): PluginOption => {
	return {
		name: 'mediapipe',
		load(id) {
			const MEDIAPIPE_EXPORT_NAMES = {
				'camera_utils.js': [
					'Camera',
				],
				'drawing_utils.js': [
					'clamp',
					'drawLandmarks',
					'drawConnectors',
					'drawRectangle',
					'lerp',
				],
				'holistic.js': [
					'Solution',
					'Solution',
					'OptionType',
					'Holistic',
					'FACE_GEOMETRY',
					'FACEMESH_LIPS',
					'FACEMESH_LEFT_EYE',
					'FACEMESH_LEFT_EYEBROW',
					'FACEMESH_LEFT_IRIS',
					'FACEMESH_RIGHT_EYE',
					'FACEMESH_RIGHT_EYEBROW',
					'FACEMESH_RIGHT_IRIS',
					'FACEMESH_FACE_OVAL',
					'FACEMESH_CONTOURS',
					'FACEMESH_TESSELATION',
					'HAND_CONNECTIONS',
					'POSE_CONNECTIONS',
					'POSE_LANDMARKS',
					'POSE_LANDMARKS_LEFT',
					'POSE_LANDMARKS_RIGHT',
					'POSE_LANDMARKS_NEUTRAL',
					'matrixDataToMatrix',
					'VERSION',
				]
			};

			const fileName = path.basename(id);
			if (!(fileName in MEDIAPIPE_EXPORT_NAMES)) return null;

			let code = fs.readFileSync(id, 'utf-8');
			for (const name of MEDIAPIPE_EXPORT_NAMES[fileName]) {
				code += `exports.${name} = ${name};`;
			}
			return { code };
		},
	};
};

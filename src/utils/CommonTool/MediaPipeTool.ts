import {
	FACEMESH_TESSELATION,
	HAND_CONNECTIONS,
	Holistic,
	Options,
	POSE_CONNECTIONS,
	Results, ResultsListener
} from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera, CameraOptions } from '@mediapipe/camera_utils';

export interface MediaPipeToolConfig {
	video: HTMLVideoElement;
	videoCanvas: HTMLCanvasElement;
	isCameraEnabled?: boolean;
	cameraOptions?: Partial<CameraOptions>;
}

export class MediaPipeTool {
	video: MediaPipeToolConfig['video'];
	videoCanvas: MediaPipeToolConfig['videoCanvas'];
	isCameraEnabled: MediaPipeToolConfig['isCameraEnabled'];
	cameraOptions: MediaPipeToolConfig['cameraOptions'];

	holistic: Holistic | null = null;
	camera: Camera | null = null;

	constructor(config: MediaPipeToolConfig) {
		const { video, videoCanvas, cameraOptions, isCameraEnabled } = config;
		this.video = video;
		this.videoCanvas = videoCanvas;
		this.cameraOptions = cameraOptions;
		this.isCameraEnabled = isCameraEnabled ?? false;
	}

	getHolistic() {
		if (!this.holistic) {
			throw new Error('Holistic not created');
		}
		return this.holistic;
	}

	getCamera() {
		if (!this.camera) {
			throw new Error(`Camera not created`);
		}
		return this.camera;
	}

	createHolistic(params?: {
		filePath?: string;
		options?: Options,
		resultsListener?: ResultsListener
	}) {
		const {
			filePath = `node_modules/@mediapipe/holistic`,
			options = {
				modelComplexity: 1,
				smoothLandmarks: true,
				minDetectionConfidence: 0.7,
				minTrackingConfidence: 0.7,
				refineFaceLandmarks: true,
			},
			resultsListener
		} = params || {};
		this.holistic = new Holistic({
			locateFile: (file) => {
				return `${filePath}/${file}`;
			}
		});
		this.holistic.setOptions(options);
		if (resultsListener) {
			this.holistic.onResults(resultsListener);
		}
		return this.holistic;
	}

	draw(results: Results) {
		this.videoCanvas.width = this.video.videoWidth;
		this.videoCanvas.height = this.video.videoHeight;
		const canvasCtx = this.videoCanvas.getContext('2d');
		if (!canvasCtx) {
			throw new Error('Could not get canvas context');
		}
		canvasCtx.save();
		canvasCtx.clearRect(0, 0, this.videoCanvas.width, this.videoCanvas.height);

		// Use `Mediapipe` drawing functions
		drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
			color: '#00cff7',
			lineWidth: 4,
		});
		drawLandmarks(canvasCtx, results.poseLandmarks, {
			color: '#ff0364',
			lineWidth: 2,
		});
		drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
			color: '#C0C0C070',
			lineWidth: 1,
		});
		if (results.faceLandmarks && results.faceLandmarks.length === 478) {
			//draw pupils
			drawLandmarks(canvasCtx, [results.faceLandmarks[468], results.faceLandmarks[468 + 5]], {
				color: '#ffe603',
				lineWidth: 2,
			});
		}
		drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
			color: '#eb1064',
			lineWidth: 5,
		});
		drawLandmarks(canvasCtx, results.leftHandLandmarks, {
			color: '#00cff7',
			lineWidth: 2,
		});
		drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
			color: '#22c3e3',
			lineWidth: 5,
		});
		drawLandmarks(canvasCtx, results.rightHandLandmarks, {
			color: '#ff0364',
			lineWidth: 2,
		});
	}

	createCamera(options?: MediaPipeToolConfig['cameraOptions']) {
		const { onFrame, ...restOptions } = options || {};
		this.camera = new Camera(this.video, {
			onFrame: async () => {
				if (!onFrame) {
					await this.getHolistic().send({ image: this.video });
				}
				await onFrame?.();
			},
			...restOptions
		});
		return this.camera;
	}

	async toggleCamera() {
		const isEnabled = !this.isCameraEnabled;
		if (isEnabled) {
			await this.getCamera().start();
		} else {
			await this.getCamera().stop();
		}
		this.isCameraEnabled = isEnabled;
	}
}

import {
	FACEMESH_TESSELATION,
	HAND_CONNECTIONS,
	Holistic,
	HolisticConfig,
	POSE_CONNECTIONS,
	Results
} from '@mediapipe/holistic';
import { Camera, CameraOptions } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export interface MediapipeToolConfig {
	video?: HTMLVideoElement;
	videoCanvas?: HTMLCanvasElement;
	isCameraEnabled?: boolean;

	cameraOptions?: Partial<CameraOptions>;
	holisticConfig?: Partial<HolisticConfig>;
}

export class MediapipeTool {
	private config?: MediapipeToolConfig | null = null;

	private holistic?: Holistic | null = null;
	private camera?: Camera | null = null;

	public isCameraEnabled = false;

	constructor(config?: MediapipeToolConfig) {
		this.config = config;
		this.isCameraEnabled = config?.isCameraEnabled ?? false;

		this.initHolistic();
		this.initCamera();
	}

	get video() {
		return this.config?.video;
	}

	getVideo() {
		if (!this.video) {
			throw new Error('Video is not created');
		}
		return this.video;
	}

	get videoCanvas() {
		return this.config?.videoCanvas;
	}

	getVideoCanvas() {
		if (!this.videoCanvas) {
			throw new Error('Video canvas is not created');
		}
		return this.videoCanvas;
	}

	getHolistic() {
		if (!this.holistic) {
			throw new Error('Holistic is not created');
		}
		return this.holistic;
	}

	getCamera() {
		if (!this.camera) {
			throw new Error('Camera is not created');
		}
		return this.camera;
	}

	initHolistic() {
		this.holistic = new Holistic({
			locateFile: (file) => {
				return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
			},
			...this.config?.holisticConfig
		});
		this.holistic.setOptions({
			modelComplexity: 1,
			smoothLandmarks: true,
			minDetectionConfidence: 0.7,
			minTrackingConfidence: 0.7,
			refineFaceLandmarks: true,
		});
	}

	initCamera() {
		this.camera = new Camera(this.getVideo(), {
			onFrame: async () => {
				await this.holistic?.send({ image: this.getVideo() });
			},
			...this.config?.cameraOptions
		});
	}

	async toggleCamera() {
		const isCameraEnabled = !this.isCameraEnabled;
		if (isCameraEnabled) {
			await this.getCamera().start();
		} else {
			await this.getCamera().stop();
		}
		this.isCameraEnabled = isCameraEnabled;
	}

	draw(results: Results) {
		this.getVideoCanvas().width = this.getVideo().videoWidth;
		this.getVideoCanvas().height = this.getVideo().videoHeight;
		const canvasCtx = this.getVideoCanvas().getContext('2d');
		if (!canvasCtx) {
			throw new Error('Could not get canvas context');
		}
		canvasCtx.save();
		canvasCtx.clearRect(0, 0, this.getVideoCanvas().width, this.getVideoCanvas().height);

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

	dispose() {
		return Promise.all([
			this.camera?.stop(),
			this.holistic?.close(),
		]).then(() => {
			this.isCameraEnabled = false;
			this.holistic = null;
			this.camera = null;
			this.config = null;
			console.log('MediapipeTool disposed');
		});
	}
}

import { Camera, CameraOptions } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import {
	FACEMESH_TESSELATION,
	HAND_CONNECTIONS,
	Holistic,
	HolisticConfig,
	POSE_CONNECTIONS,
	Results
} from "@mediapipe/holistic";

export interface MediapipeDriverConfig {
	video: HTMLVideoElement;
	videoCanvas: HTMLCanvasElement;

	holisticConfig?: Partial<HolisticConfig>;
	cameraOptions?: Partial<CameraOptions>;
}

const cdnUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/holistic`;

export class MediapipeDriver {
	isCameraOpen = false;

	config: MediapipeDriverConfig;
	holistic: Holistic;
	camera: Camera;

	get video() {
		return this.config.video;
	}

	get videoCanvas() {
		return this.config.videoCanvas;
	}

	static create(config: MediapipeDriverConfig) {
		return new this(config);
	}

	constructor(config: MediapipeDriverConfig) {
		this.config = config;
		this._initDriver();
	}

	_initDriver() {
		this.holistic = new Holistic({
			locateFile: (file) => {
				return `${cdnUrl}/${file}`;
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

		this.camera = new Camera(this.video, {
			onFrame: async () => {
				await this.holistic?.send({image: this.video});
			},
			...this.config?.cameraOptions
		});
	}

	async toggleCamera() {
		if (!this.camera) {
			console.error(`camera is ${this.camera}`)
			return;
		}
		const isCameraOpen = !this.isCameraOpen;
		if (isCameraOpen) {
			await this.camera.start();
		} else {
			await this.camera.stop();
		}
		this.isCameraOpen = isCameraOpen;
	}

	draw(results: Results) {
		this.videoCanvas.width = this.video.videoWidth;
		this.videoCanvas.height = this.video.videoHeight;

		const canvasCtx = this.videoCanvas.getContext('2d');
		if (!canvasCtx) {
			throw new Error(`canvasCtx is ${canvasCtx}`);
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

	async dispose() {
		await Promise.all([
			this.camera?.stop(),
			this.holistic?.close()
		]);
		this.isCameraOpen = false;
	}
}

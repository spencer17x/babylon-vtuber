import { LaunchCallback, MediapipeTool, MediapipeToolConfig } from '@/tools';
import { NormalizedLandmarkList, Results } from '@mediapipe/holistic';
import { Face, Hand, Pose } from 'kalidokit';
import { Mesh, Vector3 } from '@babylonjs/core';

export interface MMDToolConfig {
	mesh: Mesh;
	/**
	 * face: face only, holistic: face + hand + pose
	 */
	animateType?: 'face' | 'holistic';
	enableDraw?: boolean;
}

export class MMDTool extends MediapipeTool {
	private mesh: MMDToolConfig['mesh'];
	private animateType: MMDToolConfig['animateType'];

	static launch(config: MMDToolConfig, mediapipeToolConfig: MediapipeToolConfig, callback?: LaunchCallback) {
		const client = new MMDTool(config, mediapipeToolConfig);
		client.getHolistic().onResults((results) => {
			if (config.enableDraw) {
				client.draw(results);
			}
			if (config.animateType) {
				client.animate(results);
			}
			callback?.onResults?.(results);
		});
		return client;
	}

	constructor(config: MMDToolConfig, mediapipeToolConfig: MediapipeToolConfig) {
		super(mediapipeToolConfig);

		this.animateType = config.animateType;
		this.mesh = config.mesh;
	}

	private _getBone(name: string) {
		const bone = this.mesh.skeleton?.bones.find(
			(bone) => bone.name === name
		);
		if (!bone) {
			console.warn(
				`MotionCaptureManager: bone ${name} not found in the skinned mesh`
			);
			return null;
		}
		return bone;
	}

	private _getPose(results: Results) {
		const pose2DLandmarks = results.poseLandmarks;
		console.log('_getPose pose2DLandmarks', pose2DLandmarks);
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const pose3DLandmarks: NormalizedLandmarkList = results.za;
		console.log('_getPose pose3DLandmarks', pose3DLandmarks);
		const pose = Pose.solve(pose3DLandmarks, pose2DLandmarks, {
			runtime: 'mediapipe',
			video: this.getVideo(),
		});
		console.log('_getPose pose', pose);
		return pose;
	}

	private _setRotation(
		name: string,
		rotation?: {
			x: number,
			y: number,
			z: number
		},
		dampener?: number,
		lerpAmount?: number,
	) {
		rotation = rotation || { x: 0, y: 0, z: 0 };
		dampener = dampener || 1;
		lerpAmount = lerpAmount || 0.3;
		const bone = this._getBone(name);
		console.log('_setRotation name, rotation, dampener, lerpAmount, bone', name, rotation, dampener, lerpAmount, bone);

		if (!bone) return;
		const vector = new Vector3(
			rotation.x * dampener,
			rotation.y * dampener,
			rotation.z * dampener
		);
		bone.setRotation(
			Vector3.LerpToRef(
				bone.position,
				vector,
				lerpAmount,
				bone.position
			)
		);
	}

	private _setPosition(
		name: string,
		position?: {
			x: number,
			y: number,
			z: number
		},
		dampener?: number,
		lerpAmount?: number,
	) {
		position = position || { x: 0, y: 0, z: 0 };
		dampener = dampener || 1;
		lerpAmount = lerpAmount || 0.3;
		const bone = this._getBone(name);
		console.log('_setRotation name, position, dampener, lerpAmount, bone', name, position, dampener, lerpAmount, bone);

		if (!bone) return;
		const vector = new Vector3(
			position.x * dampener,
			position.y * dampener,
			position.z * dampener
		);
		bone.setPosition(
			Vector3.LerpToRef(
				bone.position,
				vector,
				lerpAmount,
				bone.position
			)
		);
	}

	/**
	 * TODO
	 * @param results
	 */
	animateFace(results: Results) {
		const faceLandmarks = results.faceLandmarks;
		console.log('animateFace faceLandmarks', faceLandmarks);

		const face = Face.solve(faceLandmarks, {
			runtime: 'mediapipe',
			video: this.getVideo(),
		});
		console.log('animateFace face', face);

		if (!face) return;

		this._setRotation(
			'頭', {
				x: face.head.x,
				y: -1 * face.head.y,
				z: face.head.z,
			},
			0.7
		);
	}

	/**
	 * TODO
	 * @param results
	 */
	animatePose(results: Results) {
		const pose = this._getPose(results);
		if (!pose) return;

		this._setRotation(
			'センター',
			pose.Hips.rotation,
		);
		this._setPosition(
			'センター',
			pose.Hips.position,
		);
	}

	animateLeftHand(results: Results) {
		const leftHandLandmarks = results.leftHandLandmarks;
		console.log('animateFace leftHandLandmarks', leftHandLandmarks);

		const leftHand = Hand.solve(leftHandLandmarks, 'Left') || {};
		console.log('animateFace leftHand', leftHand);
	}

	animateRightHand(results: Results) {
		const rightHandLandmarks = results.rightHandLandmarks;
		console.log('animateFace rightHandLandmarks', rightHandLandmarks);

		const rightHand = Hand.solve(rightHandLandmarks, 'Right') || {};
		console.log('animateFace rightHand', rightHand);
	}

	/**
	 * TODO
	 * @param results
	 */
	animateHand(results: Results) {
		this.animateLeftHand(results);
		this.animateRightHand(results);
	}

	animate(results: Results) {
		// Animate Face
		this.animateFace(results);

		if (this.animateType === 'holistic') {
			// Animate Pose
			this.animatePose(results);

			// Animate Hand
			this.animateHand(results);
		}
	}

	setAnimateType(type: MMDToolConfig['animateType']) {
		this.animateType = type;
	}
}

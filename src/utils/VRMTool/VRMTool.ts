import { NormalizedLandmarkList, Results } from '@mediapipe/holistic';
import { HumanoidBone, VRMManager } from '@/libs/babylon-vrm-loader';
import { Face, Hand, Pose } from 'kalidokit';
import { Nullable, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import { MediapipeTool, MediapipeToolConfig } from '@/utils';

type GetProperties<T> = Exclude<{
	[K in keyof T]: T[K] extends (...args: any[]) => any ? never : K
}[keyof T], undefined>;

type HumanBoneName = GetProperties<HumanoidBone>;

export interface VRMToolConfig {
	scene: Scene;
	/**
	 * face: face only, holistic: face + hand + pose
	 */
	animateType?: 'face' | 'holistic';
	enableDraw?: boolean;
}

export interface LaunchCallback {
	onResults?: (results: Results) => void;
}

/**
 * VRM
 * inspired by https://github.com/yeemachine/kalidokit
 */
export class VRMTool extends MediapipeTool {
	private readonly manager?: Nullable<VRMManager>;
	private readonly extraConfig: VRMToolConfig;
	private animateType: VRMToolConfig['animateType'];

	static launch(config: VRMToolConfig, mediapipeToolConfig: MediapipeToolConfig, callback?: LaunchCallback) {
		const client = new VRMTool(config, mediapipeToolConfig);
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

	constructor(config: VRMToolConfig, mediapipeToolConfig: MediapipeToolConfig) {
		super(mediapipeToolConfig);

		this.extraConfig = config;

		this.manager = this.extraConfig.scene?.metadata?.vrmManagers[0];
		this.animateType = config.animateType;
	}

	private _setRotation(
		name: HumanBoneName,
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
		console.log('_setRotation name, rotation, dampener, lerpAmount', name, rotation, dampener, lerpAmount);

		const node = this._getTransformNode(name);
		if (!node) return;

		const nodeQuaternion = node.rotationQuaternion;
		if (!nodeQuaternion) return;

		const euler = new Vector3(
			rotation.x * dampener,
			rotation.y * dampener,
			rotation.z * dampener
		);
		const quaternion = Quaternion.RotationYawPitchRoll(
			euler.y,
			euler.x,
			euler.z
		);
		Quaternion.SlerpToRef(
			nodeQuaternion, // 当前的四元数
			quaternion, // 目标的四元数
			lerpAmount, // 插值的比例
			nodeQuaternion // 结果将应用于的四元数
		);
	}

	private _setPosition(
		name: HumanBoneName,
		position?: {
			x: number,
			y: number,
			z: number
		},
		dampener = 1,
		lerpAmount = 0.3
	) {
		position = position || { x: 0, y: 0, z: 0 };
		dampener = dampener || 1;
		lerpAmount = lerpAmount || 0.3;
		console.log('_setPosition name, position, dampener, lerpAmount', name, position, dampener, lerpAmount);

		const node = this._getTransformNode(name);
		if (!node) return;

		const vector = new Vector3(
			position.x * dampener,
			position.y * dampener,
			position.z * dampener
		);
		const nodePosition = node.position;
		Vector3.LerpToRef(
			nodePosition,
			vector,
			lerpAmount,
			nodePosition
		);
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

	private _getTransformNode(name: HumanBoneName) {
		// return this.getManager().getBone(name);
		return this.getManager().humanoidBone[name];
	}

	getManager() {
		if (!this.manager) {
			throw new Error('VRM manager not found');
		}
		return this.manager;
	}

	animateFace(results: Results) {
		const faceLandmarks = results.faceLandmarks;
		console.log('animateFace faceLandmarks', faceLandmarks);
		const face = Face.solve(faceLandmarks, {
			runtime: 'mediapipe',
			video: this.getVideo(),
		});
		console.log('animateFace face', face);
		if (!face) return;

		// neck
		this._setRotation('neck', face.head, 0.7);

		// Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
		// for VRM, 1 is closed, 0 is open.
		this.getManager().morphing('Blink_L', 1 - face.eye.l);
		this.getManager().morphing('Blink_R', 1 - face.eye.r);

		// mouth
		const mouth = face.mouth.shape;
		this.getManager().morphing('A', mouth.A);
		this.getManager().morphing('E', mouth.E);
		this.getManager().morphing('I', mouth.I);
		this.getManager().morphing('O', mouth.O);
		this.getManager().morphing('U', mouth.U);
	}

	animatePose(results: Results) {
		const pose = this._getPose(results);
		if (!pose) return;

		this._setPosition(
			'hips',
			{
				x: pose.Hips.position.x,
				y: pose.Hips.position.y + 1,
				z: -pose.Hips.position.z,
			},
			1,
			0.07
		);

		// chest、spine
		this._setRotation(
			'chest',
			pose.Spine,
			0.25,
			0.3
		);
		this._setRotation(
			'spine',
			pose.Spine,
			0.45,
			0.3
		);

		// arm
		this._setRotation(
			'rightUpperArm',
			pose.RightUpperArm,
			1,
			0.3
		);
		this._setRotation(
			'rightLowerArm',
			pose.RightLowerArm,
			1,
			0.3
		);
		this._setRotation(
			'leftUpperArm',
			pose.LeftUpperArm,
			1,
			0.3
		);
		this._setRotation(
			'leftLowerArm',
			pose.LeftLowerArm,
			1,
			0.3
		);

		// leg
		this._setRotation(
			'rightUpperLeg',
			pose.RightUpperLeg,
			1,
			0.3
		);
		this._setRotation(
			'rightLowerLeg',
			pose.RightLowerLeg,
			1,
			0.3
		);
		this._setRotation(
			'leftUpperLeg',
			pose.LeftUpperLeg,
			1,
			0.3
		);
		this._setRotation(
			'leftLowerLeg',
			pose.LeftLowerLeg,
			1,
			0.3
		);
	}

	animateHand(results: Results) {
		const pose = this._getPose(results);

		const leftHandLandmarks = results.leftHandLandmarks;
		console.log('animateFace leftHandLandmarks', leftHandLandmarks);
		const leftHand = Hand.solve(leftHandLandmarks, 'Left');
		if (leftHand) {
			if (pose) {
				this._setRotation('leftHand', {
					x: leftHand.LeftWrist.x,
					y: leftHand.LeftWrist.y,
					z: pose.LeftHand.z
				});
			}
			this._setRotation('leftRingProximal', leftHand.LeftRingProximal);
			this._setRotation('leftRingIntermediate', leftHand.LeftRingIntermediate);
			this._setRotation('leftRingDistal', leftHand.LeftRingDistal);
			this._setRotation('leftIndexProximal', leftHand.LeftIndexProximal);
			this._setRotation('leftIndexIntermediate', leftHand.LeftIndexIntermediate);
			this._setRotation('leftIndexDistal', leftHand.LeftIndexDistal);
			this._setRotation('leftMiddleProximal', leftHand.LeftMiddleProximal);
			this._setRotation('leftMiddleIntermediate', leftHand.LeftMiddleIntermediate);
			this._setRotation('leftMiddleDistal', leftHand.LeftMiddleDistal);
			this._setRotation('leftThumbProximal', leftHand.LeftThumbProximal);
			this._setRotation('leftThumbIntermediate', leftHand.LeftThumbIntermediate);
			this._setRotation('leftThumbDistal', leftHand.LeftThumbDistal);
			this._setRotation('leftLittleProximal', leftHand.LeftLittleProximal);
			this._setRotation('leftLittleIntermediate', leftHand.LeftLittleIntermediate);
			this._setRotation('leftLittleDistal', leftHand.LeftLittleDistal);
		}

		const rightHandLandmarks = results.rightHandLandmarks;
		console.log('animateFace rightHandLandmarks', rightHandLandmarks);
		const rightHand = Hand.solve(rightHandLandmarks, 'Right');
		if (rightHand) {
			if (pose) {
				this._setRotation('rightHand', {
					x: rightHand.RightWrist.x,
					y: rightHand.RightWrist.y,
					z: pose.RightHand.z,
				});
			}
			this._setRotation('rightRingProximal', rightHand.RightIndexProximal);
			this._setRotation('rightRingIntermediate', rightHand.RightRingIntermediate);
			this._setRotation('rightRingDistal', rightHand.RightRingDistal);
			this._setRotation('rightIndexProximal', rightHand.RightIndexProximal);
			this._setRotation('rightIndexIntermediate', rightHand.RightIndexIntermediate);
			this._setRotation('rightIndexDistal', rightHand.RightIndexDistal);
			this._setRotation('rightMiddleProximal', rightHand.RightMiddleProximal);
			this._setRotation('rightMiddleIntermediate', rightHand.RightMiddleIntermediate);
			this._setRotation('rightMiddleDistal', rightHand.RightMiddleDistal);
			this._setRotation('rightThumbProximal', rightHand.RightThumbProximal);
			this._setRotation('rightThumbIntermediate', rightHand.RightThumbIntermediate);
			this._setRotation('rightThumbDistal', rightHand.RightThumbDistal);
			this._setRotation('rightLittleProximal', rightHand.RightLittleProximal);
			this._setRotation('rightLittleIntermediate', rightHand.RightLittleIntermediate);
			this._setRotation('rightLittleDistal', rightHand.RightLittleDistal);
		}
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

	setAnimateType(type: VRMToolConfig['animateType']) {
		this.animateType = type;
	}
}

import { Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { NormalizedLandmarkList, Results } from "@mediapipe/holistic";
import { Face, Hand, Pose, XYZ } from "kalidokit";

import { HumanBoneName, HumanManager, HumanManagerType } from "./HumanManager";
import { MediapipeDriver, MediapipeDriverConfig } from "./MediapipeDriver";

export type AnimateType = 'face' | 'holistic';

export type HumanDriverConfig = MediapipeDriverConfig & {
	scene: Scene;
	/**
	 * face: face only, holistic: face + hand + pose
	 */
	enableDraw?: boolean;
	/**
	 * onResults callback
	 * @param results
	 */
	onResultsCallback?: (results: Results) => void;
}

export class HumanDriver extends MediapipeDriver {
	config: HumanDriverConfig;

	manager: HumanManager;
	animateType?: AnimateType;

	static create(config: HumanDriverConfig) {
		return new this(config);
	}

	constructor(config: HumanDriverConfig) {
		super(config);
		this.config = config;

		this.holistic.onResults(this._onResults);
	}

	_setRotation(name: HumanBoneName, rotation?: XYZ, dampener?: number, lerpAmount?: number,) {
		rotation = rotation || {x: 0, y: 0, z: 0};
		dampener = dampener || 1;
		lerpAmount = lerpAmount || 0.3;

		const node = this.manager.getTransformNode(name);
		console.log('_setRotation node', node);
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

	_setPosition(name: HumanBoneName, position?: XYZ, dampener = 1, lerpAmount = 0.3) {
		position = position || {x: 0, y: 0, z: 0};
		dampener = dampener || 1;
		lerpAmount = lerpAmount || 0.3;

		const node = this.manager.getTransformNode(name);
		console.log('_setPosition node', node);
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

	_onResults = (results: Results) => {
		if (this.config.enableDraw) {
			this.draw(results);
		}
		this.animate(results);
		this.config.onResultsCallback?.(results);
	}

	_animateFace(results: Results) {
		const faceLandmarks = results.faceLandmarks;
		if (!faceLandmarks) return;

		const face = Face.solve(faceLandmarks, {
			runtime: 'mediapipe',
			video: this.video,
		});
		if (!face) return;

		// neck
		this._setRotation('neck', face.head, 0.7);

		// Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
		// for VRM, 1 is closed, 0 is open.
		this.manager.morphing('Blink_L', 1 - face.eye.l);
		this.manager.morphing('Blink_R', 1 - face.eye.r);

		// mouth
		const mouth = face.mouth.shape;
		this.manager.morphing('A', mouth.A);
		this.manager.morphing('E', mouth.E);
		this.manager.morphing('I', mouth.I);
		this.manager.morphing('O', mouth.O);
		this.manager.morphing('U', mouth.U);
	}

	_getPose(results: Results) {
		const pose2DLandmarks = results.poseLandmarks;
		if (!pose2DLandmarks) return;

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const pose3DLandmarks: NormalizedLandmarkList = results.za;
		if (!pose3DLandmarks) return;

		return Pose.solve(pose3DLandmarks, pose2DLandmarks, {
			runtime: 'mediapipe',
			video: this.video
		});
	}

	_animateLeftHand(results: Results) {
		const pose = this._getPose(results);

		const leftHandLandmarks = results.leftHandLandmarks;
		if (!leftHandLandmarks) return;

		const leftHand = Hand.solve(leftHandLandmarks, 'Left');
		if (!leftHand) return;

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

	_animateRightHand(results: Results) {
		const pose = this._getPose(results);

		const rightHandLandmarks = results.rightHandLandmarks;
		if (!rightHandLandmarks) return;

		const rightHand = Hand.solve(rightHandLandmarks, 'Right');
		if (!rightHand) return;

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

	_animateHand(results: Results) {
		this._animateLeftHand(results);
		this._animateRightHand(results);
	}

	_animatePose(results: Results) {
		const pose = this._getPose(results);
		if (!pose) return;

		this._setPosition('hips', {
			x: pose.Hips.position.x,
			y: pose.Hips.position.y + 1,
			z: -pose.Hips.position.z,
		}, 1, 0.07);

		// chest、spine
		this._setRotation('chest', pose.Spine, 0.25, 0.3);
		this._setRotation('spine', pose.Spine, 0.45, 0.3);

		// arm
		this._setRotation('rightUpperArm', pose.RightUpperArm, 1, 0.3);
		this._setRotation('rightLowerArm', pose.RightLowerArm, 1, 0.3);
		this._setRotation('leftUpperArm', pose.LeftUpperArm, 1, 0.3);
		this._setRotation('leftLowerArm', pose.LeftLowerArm, 1, 0.3);

		// leg
		this._setRotation('rightUpperLeg', pose.RightUpperLeg, 1, 0.3);
		this._setRotation('rightLowerLeg', pose.RightLowerLeg, 1, 0.3);
		this._setRotation('leftUpperLeg', pose.LeftUpperLeg, 1, 0.3);
		this._setRotation('leftLowerLeg', pose.LeftLowerLeg, 1, 0.3);
	}

	_animateHolistic(results: Results) {
		this._animateFace(results);
		this._animateHand(results);
		this._animatePose(results);
	}

	setAnimateType(type: AnimateType) {
		this.animateType = type;
	}

	animate(results: Results) {
		const animateType = this.animateType;
		console.log('animate animateType', animateType, results);
		if (!animateType) return;

		if (animateType === 'face') {
			return this._animateFace(results);
		}
		if (animateType === 'holistic') {
			return this._animateHolistic(results);
		}

		throw new Error(`animateType is not supported: ${animateType}`);
	}

	registerManager(type: HumanManagerType) {
		this.manager = HumanManager.create({
			type,
			scene: this.config.scene
		});
	}
}

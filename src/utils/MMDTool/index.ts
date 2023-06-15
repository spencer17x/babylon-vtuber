import { MediaPipeTool, MediaPipeToolConfig } from '@/utils';
import { NormalizedLandmarkList, Results } from '@mediapipe/holistic';
import { Face, Hand, Pose } from 'kalidokit';
import { Bone, Mesh, Nullable, Vector3 } from '@babylonjs/core';
import { leftHandRigList, poseRigList, rightHandRigList } from './constants';

interface Config extends MediaPipeToolConfig {
	mesh: Mesh;
}

export class MMDTool extends MediaPipeTool {
	mesh: Config['mesh'];

	constructor(config: Config) {
		const { mesh, ...mediaPipeConfig } = config;
		super(mediaPipeConfig);
		this.mesh = mesh;
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
			video: this.video,
		});
		console.log('_getPose pose', pose);
		return pose;
	}

	private _setRotation(
		bone: Nullable<Bone>,
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
		bone: Nullable<Bone>,
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
		console.log('_setRotation name, position, dampener, lerpAmount', name, position, dampener, lerpAmount);

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

	animateFace(results: Results) {
		const faceLandmarks = results.faceLandmarks;
		console.log('animateFace faceLandmarks', faceLandmarks);
		const face = Face.solve(faceLandmarks, {
			runtime: 'mediapipe',
			video: this.video,
		});
		console.log('animateFace face', face);
		if (!face) return;
		this._setRotation(this._getBone('頭'), {
			x: face.head.x,
			y: -1 * face.head.y,
			z: face.head.z,
		}, 0.7);
	}

	animatePose(results: Results) {
		const pose = this._getPose(results);
		if (pose) {
			this._setRotation(
				this._getBone('センター'),
				pose.Hips.rotation,
			);
			this._setPosition(
				this._getBone('センター'),
				pose.Hips.position,
			);
			for (const rigItem of poseRigList) {
				this._setRotation(
					this._getBone(rigItem.boneName),
					pose[rigItem.rigName],
				);
			}
		}
	}

	animateLeftHand(results: Results) {
		const leftHandLandmarks = results.leftHandLandmarks;
		console.log('animateFace leftHandLandmarks', leftHandLandmarks);
		const leftHand = Hand.solve(leftHandLandmarks, 'Left') || {};
		for (const rigItem of leftHandRigList) {
			this._setRotation(
				this._getBone(rigItem.boneName),
				leftHand[rigItem.rigName],
			);
		}
	}

	animateRightHand(results: Results) {
		const rightHandLandmarks = results.rightHandLandmarks;
		console.log('animateFace rightHandLandmarks', rightHandLandmarks);
		const rightHand = Hand.solve(rightHandLandmarks, 'Right') || {};
		for (const rigItem of rightHandRigList) {
			this._setRotation(
				this._getBone(rigItem.boneName),
				rightHand[rigItem.rigName],
			);
		}
	}

	animateHand(results: Results) {
		this.animateLeftHand(results);
		this.animateRightHand(results);
	}

	animate(results: Results) {
		// Animate Face
		this.animateFace(results);

		// Animate Pose
		// this.animatePose(results);

		// Animate Hand
		// this.animateHand(results);
	}

}

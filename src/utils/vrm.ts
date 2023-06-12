import {
  FACEMESH_TESSELATION, HAND_CONNECTIONS,
  Holistic,
  NormalizedLandmarkList,
  Options,
  POSE_CONNECTIONS,
  Results,
  ResultsListener
} from '@mediapipe/holistic';
import { HumanoidBone, VRMManager } from 'babylon-vrm-loader';
import { Face, Hand, Pose } from 'kalidokit';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

type GetProperties<T> = Exclude<{
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K
}[keyof T], undefined>;

type HumanBoneName = GetProperties<HumanoidBone>;

export interface IHolisticParams {
  filePath?: string;
  options?: Options,
  resultsListener?: ResultsListener
}

/**
 * VRM
 * inspired by https://github.com/yeemachine/kalidokit
 */
export class VRM {
  static create(manager: VRMManager) {
    return new this(manager);
  }

  constructor(private manager: VRMManager) {
    this.manager = manager;
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
    if (node) {
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
      if (node.rotationQuaternion) {
        Quaternion.SlerpToRef(
          node.rotationQuaternion, // 当前的四元数
          quaternion, // 目标的四元数
          lerpAmount, // 插值的比例
          node.rotationQuaternion // 结果将应用于的四元数
        );
      }
    }
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
    if (node) {
      const vector = new Vector3(
        position.x * dampener,
        position.y * dampener,
        position.z * dampener
      );
      Vector3.LerpToRef(
        node.position,
        vector,
        lerpAmount,
        node.position
      );
    }
  }

  private _getPose(results: Results, videoElement: HTMLVideoElement) {
    const pose2DLandmarks = results.poseLandmarks;
    console.log('_getPose pose2DLandmarks', pose2DLandmarks);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const pose3DLandmarks: NormalizedLandmarkList = results.za;
    console.log('_getPose pose3DLandmarks', pose3DLandmarks);
    const pose = Pose.solve(pose3DLandmarks, pose2DLandmarks, {
      runtime: 'mediapipe',
      video: videoElement,
    });
    console.log('_getPose pose', pose);
    return pose;
  }

  private _getTransformNode(name: HumanBoneName) {
    return this.manager.humanoidBone[name];
    // return this.manager.getBone(name);
  }

  createHolistic(params?: IHolisticParams) {
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
    const holistic = new Holistic({
      locateFile: (file) => {
        return `${filePath}/${file}`;
      }
    });
    holistic.setOptions(options);
    resultsListener && holistic.onResults(resultsListener);
    return holistic;
  }

  animateFace(results: Results, videoElement: HTMLVideoElement) {
    const faceLandmarks = results.faceLandmarks;
    console.log('animateFace faceLandmarks', faceLandmarks);
    const face = Face.solve(faceLandmarks, {
      runtime: 'mediapipe',
      video: videoElement,
    });
    console.log('animateFace face', face);
    if (face) {
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
  }

  animatePose(results: Results, videoElement: HTMLVideoElement) {
    const pose = this._getPose(results, videoElement);
    if (pose) {
      // hips
      this._setRotation(
        'hips',
        pose.Hips.rotation,
        0.7
      );
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
  }

  animateHand(results: Results, videoElement: HTMLVideoElement) {
    const pose = this._getPose(results, videoElement);

    const leftHandLandmarks = results.leftHandLandmarks;
    console.log('animateFace leftHandLandmarks', leftHandLandmarks);
    const leftHand = Hand.solve(leftHandLandmarks, 'Left');
    if (leftHand) {
      if (pose) {
        this._setRotation('leftHand', pose.LeftHand);
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
        this._setRotation('rightHand', pose.RightHand);
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

  animateVRM(results: Results, videoElement: HTMLVideoElement) {
    // Animate Face
    this.animateFace(results, videoElement);

    // Animate Pose
    this.animatePose(results, videoElement);

    // Animate Hand
    this.animateHand(results, videoElement);
  }

  draw(results: Results, videoCanvas: HTMLCanvasElement, video: HTMLVideoElement) {
    videoCanvas.width = video.videoWidth;
    videoCanvas.height = video.videoHeight;
    const canvasCtx = videoCanvas.getContext('2d');
    if (!canvasCtx) {
      throw new Error('Could not get canvas context');
    }
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);

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
}

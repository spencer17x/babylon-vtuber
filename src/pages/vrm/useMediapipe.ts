import { useCallback, useEffect, useState } from 'react';
import { Nullable, Scene } from '@babylonjs/core';
import { VRMManager } from 'babylon-vrm-loader';
import { Camera } from '@mediapipe/camera_utils';
import { ResultsListener } from '@mediapipe/holistic';

import { VRM } from '@/utils';

interface Params {
  isCameraEnable?: boolean;
  video?: Nullable<HTMLVideoElement>;
  videoCanvas?: Nullable<HTMLCanvasElement>;
  scene?: Nullable<Scene>;
}

export const useMediapipe = (params: Params) => {
  const { isCameraEnable, scene, videoCanvas, video } = params;
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(isCameraEnable ?? false);
  const [cameraLoading, setCameraLoading] = useState(false);

  useEffect(() => {
    return () => {
      camera?.stop();
    };
  }, [camera]);

  const setUpCamera = useCallback((params?: {
    onResults?: ResultsListener,
  }) => {
    if (!scene) {
      throw new Error('No scene found');
    }
    const manager: Nullable<VRMManager> | undefined = scene.metadata.vrmManagers[0];
    if (!manager) {
      throw new Error('No VRMManager found');
    }
    if (!videoCanvas) {
      throw new Error('No video canvas found');
    }
    if (!video) {
      throw new Error('No video found');
    }

    const vrm = VRM.create(manager);
    const holistic = vrm.useHolistic({});
    holistic.onResults((results) => {
      console.log('results', results);
      vrm.draw(results, videoCanvas, video);
      vrm.animateVRM(results, video);
      params?.onResults?.(results);
    });
    const camera = new Camera(video, {
      onFrame: async () => {
        await holistic.send({ image: video });
      }
    });
    setCamera(camera);
  }, [scene, setCamera, video, videoCanvas]);

  const toggleCamera = async () => {
    if (!camera) {
      throw new Error('Camera is not initialized');
    }
    const isEnabled = !isCameraEnabled;
    setCameraLoading(true);

    if (isEnabled) {
      await camera.start();
    } else {
      await camera.stop();
    }
    setIsCameraEnabled(isEnabled);
    setCameraLoading(false);
  };

  return {
    camera, cameraLoading, isCameraEnabled,
    setCameraLoading, toggleCamera, setUpCamera
  };
};

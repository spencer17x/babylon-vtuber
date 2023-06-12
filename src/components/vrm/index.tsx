import { useEffect, useRef, useState } from 'react';
import { VRMManager } from 'babylon-vrm-loader';
import {
  ArcRotateCamera,
  DirectionalLight,
  Engine,
  HemisphericLight,
  PointLight,
  Scene,
  SceneLoader,
  Vector3
} from '@babylonjs/core';
import 'babylon-vrm-loader';
import { Button, message } from 'antd';
import { useMediapipe } from './useMediapipe';

import './index.scss';

enum MessageKey {
  Model = 'model',
  Camera = 'camera',
}

export const Vrm = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [scene, setScene] = useState<Scene | null>(null);

  const { isCameraEnabled, cameraLoading, toggleCamera, setUpCamera } = useMediapipe({
    scene,
    video: videoRef.current,
    videoCanvas: videoCanvasRef.current,
    isCameraEnable: false,
  });

  // init
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('canvas is not found');
    }
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    setScene(scene);

    const camera = new ArcRotateCamera('camera', 0, 0, 3, new Vector3(0, 1, 0), scene, true);
    camera.lowerRadiusLimit = 0.1;
    camera.upperRadiusLimit = 20;
    camera.wheelDeltaPercentage = 0.01;
    camera.minZ = 0.3;
    camera.position = new Vector3(0, 0, -5);
    camera.attachControl(canvas, true);

    scene.createDefaultEnvironment({
      createGround: true,
      createSkybox: false,
      enableGroundMirror: false,
      enableGroundShadow: false,
    });

    // lights
    const directionalLight = new DirectionalLight('DirectionalLight1', new Vector3(0, -0.5, 1.0), scene);
    directionalLight.position = new Vector3(0, 25, -50);
    directionalLight.setEnabled(true);
    const hemisphericLight = new HemisphericLight('HemisphericLight1', new Vector3(-0.2, -0.8, -1), scene);
    hemisphericLight.setEnabled(false);
    const pointLight = new PointLight('PointLight1', new Vector3(0, 0, 1), scene);
    pointLight.setEnabled(false);

    const handleOnBeforeRenderObservable = () => {
      // SpringBone
      if (!scene.metadata || !scene.metadata.vrmManagers) {
        return;
      }
      const managers = scene.metadata.vrmManagers as VRMManager[];
      const deltaTime = scene.getEngine().getDeltaTime();
      managers.forEach((manager) => {
        manager.update(deltaTime);
      });
    };
    scene.onBeforeRenderObservable.add(handleOnBeforeRenderObservable);
    engine.runRenderLoop(() => {
      scene.render();
    });
    window.addEventListener('resize', () => {
      engine.resize();
    });

    return () => {
      // scene.onBeforeRenderObservable.removeCallback(handleOnBeforeRenderObservable);
      // scene.dispose();
      // engine.dispose();
      // message.destroy(MessageKey.Model);
    };
  }, []);

  // load model
  useEffect(() => {
    if (scene) {
      (async function () {
        message.loading({
          content: 'model loading',
          key: MessageKey.Model,
          duration: 0,
        });
        await SceneLoader.ImportMeshAsync('', '/models/vrm/', 'Ashtra.vrm', scene, (event) => {
          console.log('model load', `${event.loaded / event.total * 100}%`);
        });
        setUpCamera();
        message.destroy(MessageKey.Model);
      }());
    }
  }, [scene, setUpCamera]);

  return <div className="vtuber">
    <canvas className="canvas" ref={canvasRef}/>

    <div className="video-container">
      <video className="video" ref={videoRef}/>
      <canvas className="video-canvas" ref={videoCanvasRef}/>
    </div>

    <div className="toolbar">
      <Button loading={cameraLoading} onClick={toggleCamera}>
        {isCameraEnabled ? '关闭' : '开启'}摄像头
      </Button>
    </div>
  </div>;
};

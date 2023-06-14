import { useEffect, useRef, useState } from 'react';
import { VRMManager } from 'babylon-vrm-loader';
import {
	ArcRotateCamera,
	DirectionalLight,
	Engine,
	HemisphericLight,
	PointLight,
	Scene,
	SceneLoader, Tools,
	Vector3
} from '@babylonjs/core';
import { Button, message } from 'antd';
import { VRM } from '@/utils';

import 'babylon-vrm-loader';
import { useLocation, useSearchParams } from 'react-router-dom';

import './index.scss';

enum MessageKey {
	Model = 'model',
}

export const Vrm = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [scene, setScene] = useState<Scene | null>(null);
	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [vrm, setVRM] = useState<VRM>();
	const location = useLocation();
	const [searchParams] = useSearchParams(location.search);

	// init
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			throw new Error('canvas is not found');
		}
		const engine = new Engine(canvas, true);
		const scene = new Scene(engine);
		setScene(scene);

		const camera = new ArcRotateCamera('camera', 0, 0, 3, new Vector3(0, 1.4, 0), scene, true);
		camera.lowerRadiusLimit = 0.1;
		camera.upperRadiusLimit = 20;
		camera.wheelDeltaPercentage = 0.01;
		camera.minZ = 0.3;
		camera.position = new Vector3(0, 0, -5);
		camera.attachControl(canvas, true);
		camera.fov = Tools.ToRadians(12);

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
				const modelUrl = searchParams.get('modelUrl') || '/models/vrm/AliciaSolid.vrm';
				console.log('modelUrl', modelUrl);
				await SceneLoader.ImportMeshAsync('', modelUrl, '', scene, (event) => {
					console.log('model load', `${event.loaded / event.total * 100}%`);
				});
				message.destroy(MessageKey.Model);

				const videoCanvas = videoCanvasRef.current;
				const video = videoRef.current;
				if (!videoCanvas) {
					throw new Error('videoCanvas is not found');
				}
				if (!video) {
					throw new Error('video is not found');
				}

				const vrm = new VRM({
					scene,
					video,
					videoCanvas,
				});
				const holistic = vrm.createHolistic();
				holistic.onResults((results) => {
					console.log('results', results);
					vrm.draw(results);
					vrm.animate(results);
				});
				vrm.createCamera();
				setVRM(vrm);
				setIsCameraEnabled(vrm.isCameraEnabled ?? false);
			}());
		}
	}, [scene, searchParams]);

	const toggleCamera = async () => {
		try {
			setCameraLoading(true);
			await vrm?.toggleCamera();
			setIsCameraEnabled(vrm?.isCameraEnabled ?? false);
		} catch (e) {
			console.error(e);
		} finally {
			setCameraLoading(false);
		}
	};

	return <div className="vtuber">
		<canvas className="canvas" ref={canvasRef}/>

		<div className="video-container">
			<video className="video" ref={videoRef}/>
			<canvas className="video-canvas" ref={videoCanvasRef}/>
		</div>

		<div className="toolbar">
			<Button type="primary" loading={cameraLoading} onClick={toggleCamera}>
				{isCameraEnabled ? '关闭' : '开启'}摄像头
			</Button>
		</div>
	</div>;
};

import { useEffect, useRef, useState } from 'react';
import { VRMManager } from 'babylon-vrm-loader';
import * as BBL5 from '@bbl5.25.0/core';
import { Button, message } from 'antd';
import { VRMTool } from '@/utils';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ArcRotateCamera, Engine, HemisphericLight, Scene, SceneLoader, Tools, Vector3 } from '@babylonjs/core';
import 'babylon-vrm-loader';

import './index.scss';

enum MessageKey {
	Model = 'model',
}

export const Vrm = () => {
	const bbl5CanvasRef = useRef<HTMLCanvasElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [scene, setScene] = useState<BBL5.Scene | null>(null);
	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [vrm, setVRM] = useState<VRMTool>();
	const location = useLocation();
	const [searchParams] = useSearchParams(location.search);

	// init
	useEffect(() => {
		const canvas = bbl5CanvasRef.current;
		if (!canvas) {
			throw new Error('canvas is not found');
		}
		const engine = new BBL5.Engine(canvas, true);
		const scene = new BBL5.Scene(engine);
		scene.clearColor = new BBL5.Color4(0, 0, 0, 0);
		setScene(scene);

		const camera = new BBL5.ArcRotateCamera('camera', 0, 0, 3, new BBL5.Vector3(0, 1.4, 0), scene, true);
		camera.lowerRadiusLimit = 0.1;
		camera.upperRadiusLimit = 20;
		camera.wheelDeltaPercentage = 0.01;
		camera.minZ = 0.3;
		camera.position = new BBL5.Vector3(0, 1.4, -5);
		camera.attachControl(canvas, true);
		camera.fov = Tools.ToRadians(12);

		// lights
		const light = new BBL5.DirectionalLight('DirectionalLight1', new BBL5.Vector3(0, -0.5, 1.0), scene);
		light.intensity = 1;

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
				await BBL5.SceneLoader.ImportMeshAsync('', modelUrl, '', scene, (event) => {
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

				const vrm = new VRMTool({
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

	useEffect(() => {
		(async function () {
			const canvas = canvasRef.current;
			if (!canvas) {
				throw new Error('canvas is not found');
			}

			const engine = new Engine(canvas, true);
			const scene = new Scene(engine);

			const camera = new ArcRotateCamera('camera', 0, 0, 3, new Vector3(0, 1.4, 0), scene, true);
			camera.setPosition(new Vector3(0, 1.4, -5));
			camera.attachControl(canvas, true);
			const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
			light.intensity = 0.7;

			await SceneLoader.ImportMeshAsync(
				'',
				'/models/babylon/1.babylon',
				'',
				scene,
			);

			engine.runRenderLoop(() => {
				scene.render();
			});

			window.addEventListener('resize', () => {
				engine.resize();
			});
		}());
	}, []);

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
		<canvas className="bbl5-canvas" ref={bbl5CanvasRef}/>

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

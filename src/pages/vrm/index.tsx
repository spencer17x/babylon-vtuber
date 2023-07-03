import { useEffect, useRef, useState } from 'react';
import { Button, message, Switch } from 'antd';
import { VRMTool, VRMToolConfig } from '@/utils';
import {
	ArcRotateCamera,
	Engine,
	HemisphericLight,
	Nullable,
	Scene,
	SceneLoader,
	Tools,
	Vector3
} from '@babylonjs/core';
import { mediaPipeUrl } from '@/config';
import { useSearchParams } from 'react-router-dom';
import { ModelDrawer } from '@/components';
import { models } from '@/components/ModelDrawer/data.ts';

import '@babylonjs/inspector';

import './index.scss';

const prefixCls = 'vtuber-vrm-page';

enum Loading {
	MediaPipe = 'mediapipe',
	Model = 'model'
}

const loadingMap: Record<Loading, string> = {
	[Loading.MediaPipe]: 'mediapipe数据加载中...',
	[Loading.Model]: '模型数据加载中...',
};

const showLoading = (type: Loading) => {
	return message.loading({
		content: loadingMap[type],
		duration: 0,
		key: type
	});
};

const hideLoading = (type: Loading) => {
	return message.destroy(type);
};

export const VtuberVRMPage = () => {
	const [searchParams] = useSearchParams();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [vrmTool, setVRMTool] = useState<VRMTool>();
	const [animateType, setAnimateType] = useState<VRMToolConfig['animateType']>('holistic');
	const [modelDrawerOpen, setModelDrawerOpen] = useState(false);
	const [modelUrl, setModelUrl] = useState<string>('');
	const sceneRef = useRef<Nullable<Scene>>(null);

	/**
	 * 初始化默认模型
	 */
	useEffect(() => {
		const customModelUrl = searchParams.get('modelUrl');
		if (customModelUrl) {
			setModelUrl(customModelUrl);
		} else {
			const model = models[0];
			setModelUrl(model.path + model.name);
		}
	}, [searchParams]);

	/**
	 * 初始化场景
	 */
	useEffect(() => {
		const canvas = canvasRef.current;

		const engine = new Engine(canvas, true);
		engine.setHardwareScalingLevel(0.5);

		const scene = new Scene(engine);
		scene.debugLayer.show({
			embedMode: true,
		}).then(() => {});
		sceneRef.current = scene;

		const camera = new ArcRotateCamera('camera', Math.PI / 2.0, Math.PI / 2.0, 300, Vector3.Zero(), scene, true);
		camera.setTarget(new Vector3(0, 1.4, 0));
		camera.setPosition(new Vector3(0, 1.4, -5));
		camera.attachControl(canvas, true);
		camera.lowerRadiusLimit = 1.5;
		camera.wheelPrecision = 30;
		camera.fov = Tools.ToRadians(15);

		const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
		light.intensity = 1;

		engine.runRenderLoop(() => {
			scene.render();
		});

		window.addEventListener('resize', () => {
			engine.resize();
		});
	}, []);

	/**
	 * 加载模型
	 */
	useEffect(() => {
		const scene = sceneRef.current;
		if (!scene) {
			return;
		}
		if (!modelUrl) {
			return;
		}
		scene.metadata = null;
		console.log('start load model');
		let meshes = scene.meshes;

		const loadModel = async () => {
			showLoading(Loading.Model);
			const result = await SceneLoader.ImportMeshAsync(
				'',
				modelUrl,
				'',
				scene,
			);
			meshes = result.meshes;
			hideLoading(Loading.Model);
		};

		const loadVrmTool = () => {
			const video = videoRef.current;
			const videoCanvas = videoCanvasRef.current;
			if (!video || !videoCanvas) {
				return;
			}

			console.log('scene', scene, scene.metadata);
			const client = VRMTool.launch({
				scene,
				enableDraw: true,
				animateType: 'holistic'
			}, {
				video,
				videoCanvas,
				holisticConfig: {
					locateFile: (file) => {
						return `${mediaPipeUrl}/${file}`;
					}
				}
			}, {
				onResults() {
					hideLoading(Loading.MediaPipe);
				}
			});
			setVRMTool(client);
		};

		loadModel().then(() => {
			loadVrmTool();
		});
		return () => {
			meshes.forEach(mesh => mesh.dispose());
		};
	}, [modelUrl]);

	/**
	 * 切换动画类型
	 */
	useEffect(() => {
		if (vrmTool) {
			vrmTool.setAnimateType(animateType);
		}
	}, [animateType, vrmTool]);

	const toggleCamera = async () => {
		if (!vrmTool) {
			console.error('vrmTool is not found');
			return;
		}
		try {
			showLoading(Loading.MediaPipe);
			setCameraLoading(true);
			await vrmTool.toggleCamera();
			setIsCameraEnabled(vrmTool.isCameraEnabled ?? false);
		} catch (e) {
			console.error(e);
		} finally {
			setCameraLoading(false);
		}
	};

	return <div className={prefixCls}>
		<canvas className={`${prefixCls}-canvas`} ref={canvasRef}/>

		<div className={`${prefixCls}-video-container`}>
			<video className={`${prefixCls}-video-container-video`} ref={videoRef}/>
			<canvas className={`${prefixCls}-video-container-video-canvas`} ref={videoCanvasRef}/>
		</div>

		<div className={`${prefixCls}-toolbar`}>
			<Button type="primary" size="small" onClick={() => setModelDrawerOpen(!modelDrawerOpen)}>
				{modelDrawerOpen ? '关闭' : '打开'}模型库
			</Button>

			<Button type="primary" size="small" loading={cameraLoading} onClick={toggleCamera}>
				{isCameraEnabled ? '关闭' : '开启'}摄像头
			</Button>

			<Switch
				checkedChildren="采集全身开"
				unCheckedChildren="采集全身关"
				checked={animateType === 'holistic'}
				onChange={(checked) => {
					console.log('checked', checked);
					const type = checked ? 'holistic' : 'face';
					setAnimateType(type);
				}}
			/>
		</div>

		<ModelDrawer
			open={modelDrawerOpen}
			value={modelUrl}
			onChange={(value) => {
				setModelUrl(value);
			}}
			onClose={() => setModelDrawerOpen(!modelDrawerOpen)}
		/>
	</div>;
};

import { useEffect, useRef, useState } from 'react';
import { Button, Switch } from 'antd';
import { VRMTool, VRMToolConfig } from '@/tools';
import {
	ArcRotateCamera,
	Engine,
	HemisphericLight, Mesh,
	Nullable,
	Scene,
	SceneLoader,
	Vector3,
} from '@babylonjs/core';
import { mediaPipeUrl } from '@/config';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ModelDrawer } from '@/components';
import { centeredModel, hideLoading, showLoading } from '@/utils';
import { models } from './data';

import '@babylonjs/inspector';

import './index.scss';


const prefixCls = 'vtuber-vrm-page';

export const VtuberVRMPage = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [vrmTool, setVRMTool] = useState<VRMTool>();
	const [animateType, setAnimateType] = useState<VRMToolConfig['animateType']>('holistic');
	const [modelDrawerOpen, setModelDrawerOpen] = useState(false);
	const [scene, setScene] = useState<Nullable<Scene>>(null);
	const [modelUrl, setModelUrl] = useState('');

	/**
	 * init model
	 */
	useEffect(() => {
		const modelUrl = searchParams.get('modelUrl');
		if (!modelUrl) {
			navigate(`/vrm?modelUrl=${models[0]}`);
		}
	}, [navigate, searchParams]);

	/**
	 * update model
	 */
	useEffect(() => {
		setModelUrl(searchParams.get('modelUrl') || '');
	}, [searchParams]);

	/**
	 * init scene
	 */
	useEffect(() => {
		const canvas = canvasRef.current;

		const engine = new Engine(canvas, true);
		engine.setHardwareScalingLevel(0.5);

		const scene = new Scene(engine);
		scene.debugLayer.show({
			embedMode: true,
		}).then(() => {});
		setScene(scene);

		const camera = new ArcRotateCamera('camera', Math.PI / 2.0, Math.PI / 2.0, 30, Vector3.Zero(), scene, true);
		camera.attachControl(canvas, true);
		camera.lowerRadiusLimit = 1.5;
		camera.wheelPrecision = 30;

		const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
		light.intensity = 1;

		engine.runRenderLoop(() => {
			scene.render();
		});

		window.addEventListener('resize', () => {
			engine.resize();
		});

		return () => {
			console.log('dispose');
			scene.dispose();
			engine.dispose();
		};
	}, []);

	/**
	 * load model
	 */
	useEffect(() => {
		if (!scene) {
			return;
		}
		if (!modelUrl) {
			return;
		}
		console.log('start load model');
		let meshes = scene.meshes;

		const loadModel = async () => {
			showLoading('model');
			const result = await SceneLoader.ImportMeshAsync(
				'',
				modelUrl,
				'',
				scene,
			);
			meshes = result.meshes;

			centeredModel(meshes[0] as Mesh, scene);

			hideLoading('model');
		};

		const loadVRMTool = () => {
			const video = videoRef.current;
			const videoCanvas = videoCanvasRef.current;
			if (!video || !videoCanvas) {
				return;
			}

			console.log('scene', scene, scene.metadata);
			const client = VRMTool.launch({
				scene,
				enableDraw: true,
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
					hideLoading('mediapipe');
				}
			});
			setVRMTool(client);
		};

		loadModel().then(() => {
			loadVRMTool();
		});
		return () => {
			meshes.forEach(mesh => {
				mesh.dispose();
			});
			scene.metadata = null;
		};
	}, [modelUrl, scene]);

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
			showLoading('mediapipe');
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
			<Button type="primary" onClick={() => setModelDrawerOpen(!modelDrawerOpen)}>
				{modelDrawerOpen ? '关闭' : '打开'}模型库
			</Button>

			<Button type="primary" loading={cameraLoading} onClick={toggleCamera}>
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
			models={models}
			open={modelDrawerOpen}
			value={modelUrl}
			onChange={(value) => {
				navigate(`/vrm?modelUrl=${value}`);
			}}
			onClose={() => setModelDrawerOpen(!modelDrawerOpen)}
		/>
	</div>;
};

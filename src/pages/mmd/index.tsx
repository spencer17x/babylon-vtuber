import { useEffect, useRef, useState } from 'react';
import {
	ArcRotateCamera,
	Engine,
	HemisphericLight, Mesh,
	Nullable,
	Scene,
	SceneLoader,
	Tools,
	Vector3
} from '@babylonjs/core';
import { Button, message, Switch } from 'antd';
import { MMDTool, MMDToolConfig } from '@/utils';
import { mediaPipeUrl } from '@/config';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ModelDrawer } from '@/components';
import { models } from './data';

import { PmxLoader } from '@/libs/babylon-mmd';

import './index.scss';

enum Loading {
	MediaPipe = 'mediapipe',
	Model = 'model'
}

const showLoading = (type: Loading) => {
	return message.loading({
		content: loadingMap[type],
		duration: 0,
		key: type
	});
};

const loadingMap: Record<Loading, string> = {
	[Loading.MediaPipe]: 'mediapipe数据加载中...',
	[Loading.Model]: '模型数据加载中...',
};

const hideLoading = (type: Loading) => {
	return message.destroy(type);
};

const prefixCls = 'vtuber-mmd-page';

export const VtuberMMDPage = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [mmdTool, setMMDTool] = useState<MMDTool>();
	const [animateType, setAnimateType] = useState<MMDToolConfig['animateType']>('holistic');
	const [modelDrawerOpen, setModelDrawerOpen] = useState(false);
	const [scene, setScene] = useState<Nullable<Scene>>(null);
	const [modelUrl, setModelUrl] = useState('');

	/**
	 * 初始化模型
	 */
	useEffect(() => {
		const modelUrl = searchParams.get('modelUrl');
		if (!modelUrl) {
			navigate(`/mmd?modelUrl=${models[0]}`);
		}
	}, [navigate, searchParams]);

	/**
	 * 更新模型
	 */
	useEffect(() => {
		setModelUrl(searchParams.get('modelUrl') || '');
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
		setScene(scene);

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

		return () => {
			console.log('dispose');
			scene.dispose();
			engine.dispose();
		};
	}, []);

	/**
	 * 加载模型
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
			showLoading(Loading.Model);
			const pmxLoader = new PmxLoader();
			SceneLoader.RegisterPlugin(pmxLoader);
			const result = await SceneLoader.ImportMeshAsync(
				'',
				modelUrl,
				'',
				scene,
			);
			meshes = result.meshes;
			hideLoading(Loading.Model);
		};

		const loadMMDTool = () => {
			const video = videoRef.current;
			const videoCanvas = videoCanvasRef.current;
			if (!video || !videoCanvas) {
				return;
			}

			console.log('scene', scene, scene.metadata);
			const client = MMDTool.launch({
				mesh: meshes[0] as Mesh,
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
					hideLoading(Loading.MediaPipe);
				}
			});
			setMMDTool(client);
		};

		loadModel().then(() => {
			loadMMDTool();
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
		if (mmdTool) {
			mmdTool.setAnimateType(animateType);
		}
	}, [animateType, mmdTool]);

	const toggleCamera = async () => {
		try {
			setCameraLoading(true);
			await mmdTool?.toggleCamera();
			setIsCameraEnabled(mmdTool?.isCameraEnabled ?? false);
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
				navigate(`/mmd?modelUrl=${value}`);
			}}
			onClose={() => setModelDrawerOpen(!modelDrawerOpen)}
		/>
	</div>;
};

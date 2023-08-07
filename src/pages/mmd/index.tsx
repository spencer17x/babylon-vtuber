import './index.scss';

import { UploadOutlined } from "@ant-design/icons";
import {
	ArcRotateCamera,
	Engine,
	HemisphericLight, Mesh,
	Nullable,
	Scene,
	SceneLoader,
	Vector3
} from '@babylonjs/core';
import { Button, Switch, Upload } from 'antd';
import { MmdRuntime, VmdLoader } from 'babylon-mmd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ModelDrawer } from '@/components';
import { assetsUrl, mediaPipeUrl } from '@/config';
import { MMDTool, MMDToolConfig } from '@/tools';
import { centeredModel, hideLoading, showLoading } from '@/utils';

import { models } from './data';

const prefixCls = 'vtuber-mmd-page';

export const VtuberMMDPage = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const engineRef = useRef<Nullable<Engine>>(null);
	const sceneRef = useRef<Nullable<Scene>>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [mmdTool, setMMDTool] = useState<MMDTool>();
	const [animateType, setAnimateType] = useState<MMDToolConfig['animateType']>('holistic');
	const [modelDrawerOpen, setModelDrawerOpen] = useState(false);
	const [model, setModel] = useState<string | File>('');

	/**
	 * init model
	 */
	useEffect(() => {
		setModel(models[0])
	}, []);

	/**
	 * init scene
	 */
	useEffect(() => {
		const canvas = canvasRef.current;

		const engine = new Engine(canvas, true);
		engine.setHardwareScalingLevel(0.5);
		engineRef.current = engine;

		const scene = new Scene(engine);
		sceneRef.current = scene;

		const camera = new ArcRotateCamera('camera', Math.PI / 2.0, Math.PI / 2.0, 30, Vector3.Zero(), scene, true);
		camera.attachControl(canvas, true);

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
	 * inspector
	 */
	useEffect(() => {
		if (searchParams.get('inspector')) {
			sceneRef.current?.debugLayer.show({
				embedMode: true,
			}).then(() => {
			});
		}
	}, [searchParams]);

	/**
	 * load model
	 */
	useEffect(() => {
		const scene = sceneRef.current;
		if (!scene) return;
		if (!model) {
			return;
		}
		console.log('start load model');
		let meshes = scene.meshes;

		const loadModel = async () => {
			showLoading('model');
			const result = typeof model === 'string' ?
				await SceneLoader.ImportMeshAsync(
					'',
					model,
					'',
					scene,
				) : await SceneLoader.ImportMeshAsync(
					'',
					'',
					model,
					scene,
				)
			const mesh = result.meshes[0] as Mesh;

			centeredModel(mesh, scene);

			const vmdLoader = new VmdLoader(scene);
			const modelMotion = await vmdLoader.loadAsync('model_motion_1', assetsUrl + '/models/vmd/wavefile_v2.vmd');

			const mmdRuntime = new MmdRuntime();
			const mmdModel = mmdRuntime.createMmdModel(mesh);
			mmdModel.addAnimation(modelMotion);
			mmdModel.setAnimation('model_motion_1');
			mmdRuntime.playAnimation();
			mmdRuntime.register(scene);

			meshes = result.meshes;
			hideLoading('model');
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
					hideLoading('mediapipe');
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
		};
	}, [model]);

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
			<Upload
				name='file'
				beforeUpload={() => false}
				itemRender={() => null}
				onChange={({file}) => {
					setModel(file instanceof File ? file : '');
				}}
			>
				<Button type='primary' icon={<UploadOutlined/>}>
					上传自定义模型
				</Button>
			</Upload>

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
			value={typeof model === 'string' ? model : ''}
			onChange={(value) => {
				navigate(`/mmd?modelUrl=${value}`);
			}}
			onClose={() => setModelDrawerOpen(!modelDrawerOpen)}
		/>
	</div>;
};

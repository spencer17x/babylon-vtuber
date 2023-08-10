import './index.scss';

import { UploadOutlined } from "@ant-design/icons";
import {
	ArcRotateCamera,
	Engine, HavokPlugin,
	HemisphericLight, Mesh,
	Nullable,
	Scene,
	SceneLoader,
	Vector3
} from '@babylonjs/core';
import HavokPhysics from "@babylonjs/havok";
import { Button, Switch, Upload } from 'antd';
import { MmdPhysics, MmdRuntime, VmdLoader } from "babylon-mmd";
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ModelDrawer } from '@/components';
import { mediaPipeUrl } from '@/config';
import { MMDTool, MMDToolConfig } from '@/tools';
import { centeredModel, hideLoading, showLoading } from '@/utils';

import { models } from './data';

const prefixCls = 'mmd-page';

export const MMDPage = () => {
	const [searchParams] = useSearchParams();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const engineRef = useRef<Nullable<Engine>>(null);
	const sceneRef = useRef<Nullable<Scene>>(null);
	const mmdToolRef = useRef<Nullable<MMDTool>>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [animateType, setAnimateType] = useState<MMDToolConfig['animateType']>('holistic');
	const [modelDrawerOpen, setModelDrawerOpen] = useState(false);
	const [model, setModel] = useState<string | File>('');

	const toggleCamera = async () => {
		const mmdTool = mmdToolRef.current;
		if (!mmdTool) {
			console.error('mmdTool is not found');
			return;
		}

		try {
			showLoading('mediapipe');
			setCameraLoading(true);
			await mmdTool?.toggleCamera();
			setIsCameraEnabled(mmdTool?.isCameraEnabled ?? false);
		} catch (e) {
			console.error(e);
		} finally {
			setCameraLoading(false);
		}
	};

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

		(async function () {
			// initialize plugin
			const havokInstance = await HavokPhysics();
			// pass the engine to the plugin
			const hk = new HavokPlugin(true, havokInstance);
			scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
		}());

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
				globalRoot: document.querySelector<HTMLDivElement>('.inspector')!,
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
			const result = typeof model === 'string' ?
				await SceneLoader.AppendAsync(
					model,
					'',
					scene,
				) : await SceneLoader.AppendAsync(
					'',
					model,
					scene,
				)

			const mesh = result.meshes[0] as Mesh;

			centeredModel(mesh, scene);

			meshes = result.meshes;
		};

		const loadMMDTool = () => {
			const video = videoRef.current;
			const videoCanvas = videoCanvasRef.current;
			if (!video || !videoCanvas) {
				return;
			}

			console.log('scene', scene, scene.metadata);
			mmdToolRef.current = MMDTool.launch({
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
	 * update mmdTool animateType
	 */
	useEffect(() => {
		mmdToolRef.current?.setAnimateType(animateType);
	}, [animateType]);

	return <div className={prefixCls}>
		<div className='inspector'/>

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

			<Upload
				name='file'
				beforeUpload={() => false}
				itemRender={() => null}
				onChange={async ({file}) => {
					console.log('file', file);
					const scene = sceneRef.current;
					if (!scene) return;
					const mesh = scene.meshes[0] as Mesh;
					if (!mesh) return;

					if (file instanceof File) {
						const mmdRuntime = new MmdRuntime(new MmdPhysics(scene));
						const vmdLoader = new VmdLoader(scene);
						const modelMotion = await vmdLoader.loadAsync("model_motion_1", file);
						const mmdModel = mmdRuntime.createMmdModel(mesh);
						mmdModel.addAnimation(modelMotion);
						mmdModel.setAnimation("model_motion_1");
						await mmdRuntime.playAnimation();
						mmdRuntime.register(scene);
					}
				}}
			>
				<Button type='primary' icon={<UploadOutlined/>}>
					上传动画
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
				setModel(value);
			}}
			onClose={() => setModelDrawerOpen(!modelDrawerOpen)}
		/>
	</div>;
};

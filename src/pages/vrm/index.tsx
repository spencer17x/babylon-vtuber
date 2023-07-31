import '@babylonjs/inspector';
import './index.scss';

import { UploadOutlined } from "@ant-design/icons";
import {
	AnimationGroup,
	ArcRotateCamera,
	Engine,
	HemisphericLight,
	Mesh,
	Nullable,
	Scene,
	SceneLoader,
	Vector3,
} from '@babylonjs/core';
import { Button, Switch, Upload } from 'antd';
import { VRMManager } from "babylonjs-vrm-loader";
import { HumanoidBone } from "babylonjs-vrm-loader/dist/humanoid-bone";
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ModelDrawer } from '@/components';
import { mediaPipeUrl } from '@/config';
import { animationMap, mixamoToVrm } from "@/pages/vrm/map.ts";
import { VRMTool, VRMToolConfig } from '@/tools';
import { centeredModel, hideLoading, showLoading } from '@/utils';

import { models } from './data';

const prefixCls = 'vtuber-vrm-page';

export const VtuberVRMPage = () => {
	const [searchParams] = useSearchParams();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const engineRef = useRef<Nullable<Engine>>(null);
	const sceneRef = useRef<Nullable<Scene>>(null);
	const vrmToolRef = useRef<Nullable<VRMTool>>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [animateType, setAnimateType] = useState<VRMToolConfig['animateType']>('holistic');
	const [modelDrawerOpen, setModelDrawerOpen] = useState(false);
	const [model, setModel] = useState<string | File>('');

	/**
	 * init model
	 */
	useEffect(() => {
		setModel(models[0]);
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
				globalRoot: document.querySelector<HTMLDivElement>('.inspector')!,
			}).then(() => {
			});
		}
	}, [searchParams]);

	const initVRMTool = () => {
		const video = videoRef.current;
		const videoCanvas = videoCanvasRef.current;
		if (!video || !videoCanvas) {
			return;
		}

		const scene = sceneRef.current;
		if (!scene) return;
		vrmToolRef.current = VRMTool.launch({
			enableDraw: true,
			scene,
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

	/**
	 * init vrmTool
	 */
	useEffect(() => {
		initVRMTool();
		return () => {
			vrmToolRef.current?.dispose().then(() => {
			});
		};
	}, []);

	/**
	 * update vrmTool animateType
	 */
	useEffect(() => {
		vrmToolRef.current?.setAnimateType(animateType);
	}, [animateType]);

	/**
	 * load model
	 */
	useEffect(() => {
		const scene = sceneRef.current;
		if (!scene) return;
		if (!model) return;

		console.log('start load model');
		let meshes = scene.meshes;

		const load = async () => {
			// 加载模型
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

			console.log('vrmManagers', scene.metadata.vrmManagers);

			meshes = result.meshes;
			const mesh = meshes[0] as Mesh;
			centeredModel(mesh, scene);
			hideLoading('model');
		};
		load().then(() => {
		});

		return () => {
			meshes.forEach(mesh => {
				mesh.dispose();
			});
		};
	}, [model]);

	const toggleCamera = async () => {
		const vrmTool = vrmToolRef.current;
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
					if (file instanceof File) {
						const {animationGroups} = await SceneLoader.ImportAnimationsAsync(
							'',
							file as File,
							sceneRef.current,
						);
						const vrmManager: VRMManager = sceneRef.current?.metadata.vrmManagers.slice(-1)[0];
						const animationGroup = animationGroups[0];

						animationGroup.targetedAnimations.forEach(targetedAnimation => {
							if (['position', 'scaling'].includes(targetedAnimation.animation.targetProperty)) {
								console.log('x')
							}
						});

						console.log('animationGroup', animationGroup);
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
					const vrmTool = vrmToolRef.current;
					if (!vrmTool) {
						console.error('vrmTool is not found');
						return;
					}
					vrmTool.setAnimateType(type);
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

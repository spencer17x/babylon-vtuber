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
import { Button, Upload } from 'antd';
import { MmdPhysics, MmdRuntime, VmdLoader } from "babylon-mmd";
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ModelDrawer } from '@/components';
import { centeredModel } from '@/utils';

import { models } from './data';

const prefixCls = 'mmd-page';

export const MMDPage = () => {
	const [searchParams] = useSearchParams();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const engineRef = useRef<Nullable<Engine>>(null);
	const sceneRef = useRef<Nullable<Scene>>(null);

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
		if (!model) return;
		let meshes = scene.meshes;

		const loadModel = async () => {
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

			meshes = result.meshes;
		};

		void loadModel();
		return () => {
			meshes.forEach(mesh => {
				mesh.dispose();
			});
		};
	}, [model]);

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

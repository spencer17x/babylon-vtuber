import '@babylonjs/inspector';
import './index.scss';

import { UploadOutlined } from "@ant-design/icons";
import * as BABYLON from '@babylonjs/core';
import { Button, Switch, Upload } from "antd";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ModelDrawer } from "@/components";
import { centeredHumanModel } from "@/utils";

type CaptureMode = 'holistic' | 'face';

const prefixCls = 'human-page';

export const HumanPage = () => {
	const [searchParams] = useSearchParams();

	const inspectorRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<BABYLON.Nullable<BABYLON.Engine>>(null);
	const sceneRef = useRef<BABYLON.Nullable<BABYLON.Scene>>(null);
	const meshesRef = useRef<BABYLON.AbstractMesh[]>([]);

	const [modelDrawerOpen, setModelDrawerOpen] = useState(false);
	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraOpen, setIsCameraOpen] = useState(false);
	const [captureMode, setCaptureMode] = useState<CaptureMode | null>();

	/**
	 * toggle camera
	 */
	const toggleCamera = () => {
		setIsCameraOpen(!isCameraOpen);
		setCameraLoading(!cameraLoading);
	}

	/**
	 * load model
	 * @param model
	 */
	const loadModel = async (model: string | File) => {
		meshesRef.current.forEach(mesh => mesh.dispose());

		const result = await BABYLON.SceneLoader.ImportMeshAsync(
			'',
			'',
			model,
			sceneRef.current
		);
		meshesRef.current = result.meshes;
		console.log('loadModel result', result);
		centeredHumanModel(result.meshes)
	}

	/**
	 * load animation
	 * @param file
	 */
	const loadAnimation = async (file: File) => {
		console.log('file', file);
		const scene = sceneRef.current;
		if (!scene) {
			console.error(`scene is ${scene}`);
			return;
		}
	}

	/**
	 * init engine and scene
	 */
	useEffect(() => {
		const engine = new BABYLON.Engine(canvasRef.current, true);
		engine.setHardwareScalingLevel(0.5);
		engineRef.current = engine;

		const scene = new BABYLON.Scene(engine);
		sceneRef.current = scene;

		const camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2, 1.5, BABYLON.Vector3.Zero(), scene);
		camera.attachControl(canvasRef.current, true);
		camera.lowerRadiusLimit = 1.5;
		camera.upperRadiusLimit = 5;

		const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 0, 10), scene);
		light.intensity = 1;

		engine.runRenderLoop(() => {
			scene.render();
		});

		const handleResize = () => {
			engine.resize();
		}
		window.addEventListener('resize', handleResize);

		return () => {
			console.log('dispose');
			scene.dispose();
			engine.dispose();
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	/**
	 * inspector
	 */
	useEffect(() => {
		const inspectorEle = inspectorRef.current;
		if (searchParams.get('inspector') && inspectorEle) {
			sceneRef.current?.debugLayer.show({
				embedMode: true,
				globalRoot: inspectorEle
			});
		}
	}, [searchParams])

	return (
		<div className={prefixCls}>
			<div className='inspector' ref={inspectorRef}/>

			<canvas className={`${prefixCls}-canvas`} ref={canvasRef}/>

			<ModelDrawer
				models={[]}
				open={modelDrawerOpen}
				value={''}
				onChange={(value) => {
					console.log('value', value);
				}}
				onClose={() => setModelDrawerOpen(!modelDrawerOpen)}
			/>

			<div className={`${prefixCls}-toolbar`}>
				<Upload
					name='file'
					beforeUpload={() => false}
					itemRender={() => null}
					onChange={result => {
						if (result.file instanceof File) {
							return loadModel(result.file);
						}
						console.error('result', result);
						return null;
					}}
				>
					<Button type='primary' icon={<UploadOutlined/>}>
						上传模型
					</Button>
				</Upload>

				<Upload
					name='file'
					beforeUpload={() => false}
					itemRender={() => null}
					onChange={async result => {
						if (result.file instanceof File) {
							return loadAnimation(result.file);
						}
						console.error('result', result);
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
					{isCameraOpen ? '关闭' : '开启'}摄像头
				</Button>

				<Switch
					checkedChildren="采集全身开"
					unCheckedChildren="采集全身关"
					checked={captureMode === 'holistic'}
					onChange={(checked) => {
						const mode = checked ? 'holistic' : 'face';
						setCaptureMode(mode);
					}}
				/>
			</div>
		</div>
	)
}

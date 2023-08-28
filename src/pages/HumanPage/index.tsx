import '@babylonjs/inspector';
import './index.scss';

import { UploadOutlined } from "@ant-design/icons";
import * as BABYLON from '@babylonjs/core';
import { Inspector } from "@babylonjs/inspector";
import { Button, Switch, Upload } from "antd";
import { useEffect, useRef, useState } from "react";

import { mediaPipeUrl } from "@/config";
import { AnimateType, HumanDriver } from "@/tools/HumanDriver";
import { centeredModel, hideLoading, showLoading } from "@/utils";

const prefixCls = 'human-page';

const apis = {
	upload: 'http://localhost:3000/upload'
};

/**
 * upload zip
 * @param file
 */
const uploadZip = async (file: File): Promise<{
	code: number;
	data: {
		url: string;
	}
}> => {
	const formData = new FormData();
	formData.append('file', file, file.name);

	const response = await fetch(apis.upload, {
		method: 'POST',
		body: formData,
	});
	return response.json();
}

export const HumanPage = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const inspectorRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<BABYLON.Nullable<BABYLON.Engine>>(null);
	const sceneRef = useRef<BABYLON.Nullable<BABYLON.Scene>>(null);
	const meshesRef = useRef<BABYLON.AbstractMesh[]>([]);

	const humanDriverRef = useRef<BABYLON.Nullable<HumanDriver>>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [debugLayerLoading, setDebugLayerLoading] = useState(false);
	const [isCameraOpen, setIsCameraOpen] = useState(false);
	const [isDugLayerOpen, setIsDugLayerOpen] = useState(false);
	const [captureMode, setCaptureMode] = useState<AnimateType>('holistic');

	/**
	 * toggle camera
	 */
	const toggleCamera = async () => {
		const humanDriver = humanDriverRef.current;
		if (!humanDriver) return;

		try {
			showLoading('mediapipe');
			setCameraLoading(true);
			await humanDriver.toggleCamera();
			setIsCameraOpen(!isCameraOpen);
		} catch (e) {
			console.error(e);
		} finally {
			setCameraLoading(false);
		}
	}

	/**
	 * load mmd model
	 * @param data
	 */
	const loadMMDModel = async (data: string | File) => {
		let modelUrl = typeof data === 'string' ? data : '';
		if (data instanceof File) {
			const result = await uploadZip(data);
			modelUrl = result.data.url;
		}
		return BABYLON.SceneLoader.ImportMeshAsync(
			'',
			modelUrl,
			'',
			sceneRef.current,
		)
	}

	/**
	 * load model
	 * @param data
	 */
	const loadModel = async (data: string | File) => {
		console.log('loadModel data', data);

		meshesRef.current.forEach((mesh) => {
			mesh.dispose();
		})
		let result: BABYLON.Nullable<BABYLON.ISceneLoaderAsyncResult> = null;
		if (data instanceof File) {
			if (data.name.endsWith('.zip')) {
				result = await loadMMDModel(data);
			} else {
				result = await BABYLON.SceneLoader.ImportMeshAsync(
					'',
					'',
					data,
					sceneRef.current,
				)
			}
		} else {
			result = await BABYLON.SceneLoader.ImportMeshAsync(
				'',
				data,
				'',
				sceneRef.current,
			)
		}

		console.log('scene', sceneRef.current);

		meshesRef.current = result.meshes;
		centeredModel(result.meshes[0], sceneRef.current!);
		// stop animation
		sceneRef.current?.transformNodes.forEach(e => {
			sceneRef.current?.stopAnimation(e)
			e.animations = []
		})

		humanDriverRef.current?.setAnimateType(captureMode);
	}

	/**
	 * load animation
	 * @param data
	 */
	const loadAnimation = async (data: string | File) => {
		console.log('loadModel data', data);
		const scene = sceneRef.current;
		if (!scene) {
			console.error(`scene is ${scene}`);
			return;
		}
	}

	/**
	 * toggle debug layer
	 */
	const toggleDebugLayer = async () => {
		const inspectorEle = inspectorRef.current;
		const scene = sceneRef.current;
		if (!inspectorEle) return;
		if (!scene) return;

		setDebugLayerLoading(true);
		if (isDugLayerOpen) {
			Inspector.Hide();
		} else {
			Inspector.Show(scene, {
				globalRoot: inspectorEle,
				embedMode: true
			});
		}
		setDebugLayerLoading(false);
		setIsDugLayerOpen(!isDugLayerOpen);
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
	 * init human driver
	 */
	useEffect(() => {
		humanDriverRef.current = HumanDriver.create({
			scene: sceneRef.current!,
			enableDraw: true,
			video: videoRef.current!,
			videoCanvas: videoCanvasRef.current!,
			holisticConfig: {
				locateFile: (file) => {
					return `${mediaPipeUrl}/${file}`;
				}
			},
			onResultsCallback() {
				hideLoading('mediapipe');
			}
		});
		humanDriverRef.current.registerManager('vrm');
	}, []);

	return (
		<div className={prefixCls}>
			<div className='inspector' ref={inspectorRef}/>

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
					onChange={result => {
						if (result.file instanceof File) {
							return loadModel(result.file);
						}
						console.error('result', result);
						return null;
					}}
				>
					<Button type='primary' icon={<UploadOutlined/>}>
						upload model file
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
						upload animation file
					</Button>
				</Upload>

				<Button type="primary" loading={cameraLoading} onClick={toggleCamera}>
					{isCameraOpen ? 'close' : 'open'} camera
				</Button>

				<Button type="primary" loading={debugLayerLoading} onClick={toggleDebugLayer}>
					{isDugLayerOpen ? 'close' : 'open'} debugLayer
				</Button>

				<Switch
					checkedChildren="holistic"
					unCheckedChildren="face"
					checked={captureMode === 'holistic'}
					onChange={(checked) => {
						const mode = checked ? 'holistic' : 'face';
						humanDriverRef.current?.setAnimateType(mode);
						setCaptureMode(mode);
					}}
				/>
			</div>
		</div>
	)
}

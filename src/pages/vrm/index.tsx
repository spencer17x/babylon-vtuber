import { useEffect, useRef, useState } from 'react';
import { Button, message } from 'antd';
import { VRMTool } from '@/utils';
import { ArcRotateCamera, Engine, HemisphericLight, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import { assetsUrl, mediaPipeAssetsUrl } from '@/config';
import '@babylonjs/inspector';

import 'babylonjs-vrm-loader';

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
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [vrmTool, setVRMTool] = useState<VRMTool>();

	useEffect(() => {
		const canvas = canvasRef.current;
		const video = videoRef.current;
		const videoCanvas = videoCanvasRef.current;
		if (!canvas) {
			throw new Error('canvas is not found');
		}
		if (!video) {
			throw new Error('video is not found');
		}
		if (!videoCanvas) {
			throw new Error('videoCanvas is not found');
		}

		const engine = new Engine(canvas, true);
		const scene = new Scene(engine);

		const camera = new ArcRotateCamera('camera', 0, 0, 3, new Vector3(0, 1.4, 0), scene, true);
		camera.setPosition(new Vector3(0, 1.4, -5));
		camera.attachControl(canvas, true);
		const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
		light.intensity = 1;

		(async function () {
			showLoading(Loading.Model);
			await SceneLoader.ImportMeshAsync(
				'',
				assetsUrl + '/models/vrm/AliciaSolid.vrm',
				'',
				scene,
			);
			hideLoading(Loading.Model);

			const client = VRMTool.launch({
				scene,
				enableDraw: true,
				animate: 'holistic'
			}, {
				video,
				videoCanvas,
				holisticConfig: {
					locateFile: (file) => {
						return `${mediaPipeAssetsUrl}/${file}`;
					}
				}
			}, {
				onResults() {
					hideLoading(Loading.MediaPipe);
				}
			});
			setVRMTool(client);

			await scene.debugLayer.show({
				embedMode: true,
			});
		}());

		console.log('scene', scene);

		engine.runRenderLoop(() => {
			scene.render();
		});

		window.addEventListener('resize', () => {
			engine.resize();
		});
	}, []);

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
			<Button type="primary" loading={cameraLoading} onClick={toggleCamera}>
				{isCameraEnabled ? '关闭' : '开启'}摄像头
			</Button>
		</div>
	</div>;
};

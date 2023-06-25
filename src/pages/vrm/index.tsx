import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { VRMTool } from '@/utils';
import { ArcRotateCamera, Engine, HemisphericLight, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import { assetsUrl } from '@/config';

import './index.scss';

const prefixCls = 'vtuber-vrm-page';

export const VtuberVRMPage = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [vrmTool, setVRMTool] = useState<VRMTool>();

	// bbl6
	useEffect(() => {
		(async function () {
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
			light.intensity = 0.7;

			await SceneLoader.ImportMeshAsync(
				'',
				assetsUrl + '/models/vrm/Ashtra.vrm',
				'',
				scene,
			);

			console.log('scene', scene);

			const vrmTool = new VRMTool({
				scene,
				video,
				videoCanvas,
			});
			setVRMTool(vrmTool);

			const holistic = vrmTool.createHolistic();
			holistic.onResults((results) => {
				console.log('results', results);
				vrmTool.draw(results);
				vrmTool.animate(results);
			});
			vrmTool.createCamera({
				onFrame: async () => {
					await holistic.send({ image: vrmTool.video });
				},
			});

			engine.runRenderLoop(() => {
				scene.render();
			});

			window.addEventListener('resize', () => {
				engine.resize();
			});
		}());
	}, []);

	const toggleCamera = async () => {
		if (!vrmTool) {
			console.error('vrmTool is not found');
			return;
		}
		try {
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

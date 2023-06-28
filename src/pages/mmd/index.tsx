import { useEffect, useRef, useState } from 'react';
import { ArcRotateCamera, Engine, HemisphericLight, Scene, Tools, Vector3 } from '@babylonjs/core';
import { ImportMMDMeshAsync } from '@wenxin123/babylonjs-mmd-loader';
import { Button } from 'antd';
import { MMDTool } from '@/utils';

import './index.scss';

export const VtuberMMDPage = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [scene, setScene] = useState<Scene>();
	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [mmdTool, setMmdTool] = useState<MMDTool>();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			throw new Error('canvas is null');
		}
		const engine = new Engine(canvas, true);
		const scene = new Scene(engine);
		setScene(scene);

		const camera = new ArcRotateCamera('camera', 0, 0, 0, new Vector3(0, 17, 0), scene);
		camera.setPosition(new Vector3(0, 17, -40));
		camera.attachControl(canvas, true);
		camera.fov = Tools.ToRadians(12);

		const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
		light.intensity = 1.5;

		engine.runRenderLoop(() => {
			scene.render();
		});
		window.addEventListener('resize', () => {
			engine.resize();
		});
	}, []);

	useEffect(() => {
		(async function () {
			if (!scene) return;

			const videoCanvas = videoCanvasRef.current;
			const video = videoRef.current;
			if (!videoCanvas) {
				throw new Error('videoCanvas is not found');
			}
			if (!video) {
				throw new Error('video is not found');
			}

			const mesh = await ImportMMDMeshAsync(
				'/models/pmd/1',
				'miku_v2.pmd',
				scene
			);
			console.log('mesh', mesh);
			const mddTool = new MMDTool({
				video,
				videoCanvas,
				mesh
			});
			setMmdTool(mddTool);
			setIsCameraEnabled(mddTool.isCameraEnabled ?? false);
		}());
	}, [scene]);

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

	return <div className="vtuber-mmd-page">
		<canvas className="canvas" ref={canvasRef}/>

		<div className="video-container">
			<video className="video" ref={videoRef}/>
			<canvas className="video-canvas" ref={videoCanvasRef}/>
		</div>

		<div className="toolbar">
			<Button type="primary" loading={cameraLoading} onClick={toggleCamera}>
				{isCameraEnabled ? '关闭' : '开启'}摄像头
			</Button>
		</div>
	</div>;
};

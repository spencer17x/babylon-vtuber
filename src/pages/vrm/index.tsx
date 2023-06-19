import { useEffect, useRef, useState } from 'react';
import { Button, message } from 'antd';
import { VRMTool } from '@/utils';
import { ArcRotateCamera, Engine, HemisphericLight, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import { assetsUrl } from '@/config';
import { VtuberVRM } from '@/components';

import './index.scss';

export const VtuberVRMPage = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const [cameraLoading, setCameraLoading] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [vrmTool, setVRMTool] = useState<VRMTool>();

	// bbl6
	useEffect(() => {
		(async function () {
			const canvas = canvasRef.current;
			if (!canvas) {
				throw new Error('canvas is not found');
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
				assetsUrl + '/models/babylon/1.babylon',
				'',
				scene,
			);

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

	return <div className="vtuber-vrm-page">
		<canvas className="canvas" ref={canvasRef}/>

		<VtuberVRM
			modeUrl={assetsUrl + '/models/vrm/AliciaSolid.vrm'}
			onVRMToolLoaded={setVRMTool}
			onLoadStart={() => message.loading({
				content: 'vrm-vtuber loading...',
				key: 'vrm-vtuber',
				duration: 0,
			})}
			onLoadEnd={() => message.destroy('vrm-vtuber')}
		/>

		<div className="toolbar">
			<Button type="primary" loading={cameraLoading} onClick={toggleCamera}>
				{isCameraEnabled ? '关闭' : '开启'}摄像头
			</Button>
		</div>
	</div>;
};

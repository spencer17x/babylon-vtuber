import './index.scss';

import classNames from 'classnames';
import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import {
	ArcRotateCamera,
	Color4,
	Engine,
	HemisphericLight,
	Scene,
	Vector3,
	SceneLoader
} from '@bbl5.25.0/core';
import { VRMTool } from '@/utils';
import 'babylon-vrm-loader';

const prefixCls = 'vtuber-vrm';

export interface VtuberVRMProps {
	className?: string;
	style?: CSSProperties;
	modeUrl: string;
	onSceneLoaded?: (scene: Scene) => void;
	onVRMToolLoaded?: (vrmTool: VRMTool) => void;
	onLoadStart?: () => void;
	onLoadEnd?: (error?: unknown) => void;
}

export const VtuberVRM: FC<VtuberVRMProps> = (props) => {
	const {
		className, style,
		modeUrl,
		onSceneLoaded, onVRMToolLoaded,
		onLoadStart, onLoadEnd
	} = props;

	const onSceneLoadedRef = useRef<VtuberVRMProps['onSceneLoaded'] | null>(null);
	const onVRMToolLoadedRef = useRef<VtuberVRMProps['onVRMToolLoaded'] | null>(null);
	const onLoadStartRef = useRef<VtuberVRMProps['onLoadStart'] | null>(null);
	const onLoadEndRef = useRef<VtuberVRMProps['onLoadEnd'] | null>(null);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoCanvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [scene, setScene] = useState<Scene | null>(null);
	const [vrmTool, setVRMTool] = useState<VRMTool | null>(null);

	useEffect(() => {
		onSceneLoadedRef.current = onSceneLoaded;
		onVRMToolLoadedRef.current = onVRMToolLoaded;
		onLoadStartRef.current = onLoadStart;
		onLoadEndRef.current = onLoadEnd;
	});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			throw new Error('canvas is not found');
		}

		const engine = new Engine(canvas, true);
		const scene = new Scene(engine);
		setScene(scene);
		scene.clearColor = new Color4(0, 0, 0, 0);

		const camera = new ArcRotateCamera('camera', 0, 0, 3, new Vector3(0, 1.4, 0), scene, true);
		camera.setPosition(new Vector3(0, 1.4, -5));
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

	useEffect(() => {
		(async function () {
			const video = videoRef.current;
			const videoCanvas = videoCanvasRef.current;

			if (!scene) return;
			if (!video) {
				throw new Error('video is not found');
			}
			if (!videoCanvas) {
				throw new Error('videoCanvas is not found');
			}

			onLoadStartRef.current?.();
			try {
				await SceneLoader.ImportMeshAsync('', '', modeUrl, scene);

				const vrmTool = new VRMTool({
					scene,
					video,
					videoCanvas,
				});
				onVRMToolLoadedRef.current?.(vrmTool);
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
				onLoadEndRef.current?.();
			} catch (e) {
				onLoadEndRef.current?.(e);
			}
		}());
	}, [scene, modeUrl]);

	useEffect(() => {
		return () => {
			vrmTool?.destroy();
		};
	}, [vrmTool]);

	return <div className={classNames(prefixCls, className)} style={style}>
		<canvas className={`${prefixCls}-canvas`} ref={canvasRef}/>

		<div className="video-container">
			<video className="video" ref={videoRef}/>
			<canvas className="video-canvas" ref={videoCanvasRef}/>
		</div>
	</div>;
};

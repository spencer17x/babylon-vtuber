import './index.scss';

import { Drawer } from 'antd';
import { FC, useEffect, useRef, useState } from 'react';
import {
	ArcRotateCamera,
	Engine,
	HemisphericLight, Nullable,
	Scene, SceneLoader,
	Vector3
} from '@babylonjs/core';
import { models } from '@/components/ModelDrawer/data.ts';


const prefixCls = 'model-drawer';

const ModelPreview: FC<{
	engine?: Nullable<Engine>;
	name?: string;
	scene?: Nullable<Scene>;
	url?: string;
}> = (props) => {
	const { engine, name, url } = props;
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !name || !url || !engine) {
			return;
		}
		const scene = new Scene(engine);

		// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
		const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);

		// Default intensity is 1. Let's dim the light a small amount
		light.intensity = 0.7;

		scene.createDefaultEnvironment();

		const camera = new ArcRotateCamera(`camera-${name}`, 0, 0.8, 10, Vector3.Zero(), scene);

		SceneLoader.ImportMeshAsync('', url, '', scene).then((result) => {
			console.log('load model result', result);
		});

		engine.registerView(canvas, camera);

		engine.runRenderLoop(() => {
			scene.render();
		});
	}, [engine, name, url]);

	return <canvas ref={canvasRef}/>;
};

const ModelPreviewList = () => {
	const [engine, setEngine] = useState<Engine | null>(null);
	const [scene, setScene] = useState<Scene | null>(null);

	useEffect(() => {
		const createScene = (engine: Engine) => {
			// This creates a basic Babylon Scene object (non-mesh)
			const scene = new Scene(engine);

			// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
			const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);

			// Default intensity is 1. Let's dim the light a small amount
			light.intensity = 0.7;

			scene.createDefaultEnvironment();

			return scene;
		};

		// Create a working document
		const canvas = document.createElement('canvas');
		const engine = new Engine(canvas, true);
		setEngine(engine);

		const scene = createScene(engine);
		setScene(scene);
	}, []);

	return <div className={`${prefixCls}-list`}>
		{
			models.map(model => {
				return <ModelPreview
					key={model.fileName}
					engine={engine}
					scene={scene}
					name={model.fileName.replace('.vrm', '')}
					url={model.rootUrl + model.fileName}
				/>;
			})
		}
	</div>;
};

export const ModelDrawer = () => {
	return <Drawer
		placement="left"
		title="模型库"
		closable={true}
		open={true}
		className={prefixCls}
	>
		<ModelPreviewList/>
	</Drawer>;
};

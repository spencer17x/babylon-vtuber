import './index.scss';

import { ArcRotateCamera, Color3, Engine, Mesh, Nullable, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import { Drawer, DrawerProps, Spin } from 'antd';
import classNames from 'classnames';
import { CSSProperties, FC, PointerEventHandler, useEffect, useRef, useState } from 'react';

import { centeredModel } from '@/utils';


export interface ModelDrawerProps extends DrawerProps {
	value: string;
	models: string[];
	onChange: (value: string) => void;
}

const prefixCls = 'model-drawer';

const List: FC<{
	className?: string;
	style?: CSSProperties;
	models: string[];
	value: string;
	onChange: (value: string) => void;
}> = (props) => {
	const {
		className, style,
		models,
		value, onChange
	} = props;

	const engineRef = useRef<Nullable<Engine>>(null);
	const sceneMapRef = useRef<Map<HTMLCanvasElement, Scene>>();
	const viewCanvasesRef = useRef<HTMLCanvasElement[]>([]);

	const [spinning, setSpinning] = useState(false);

	useEffect(() => {
		const canvas = document.createElement('canvas');
		const engine = new Engine(canvas);
		engineRef.current = engine;

		const scene = new Scene(engine);
		scene.createDefaultCameraOrLight(true, true, true);

		sceneMapRef.current = new Map<HTMLCanvasElement, Scene>();

		// create views
		const promises = viewCanvasesRef.current.map(async (canvas, index) => {
			const viewScene = new Scene(engine);
			viewScene.clearColor = Color3.Random().toColor4();
			viewScene.createDefaultLight();
			sceneMapRef.current?.set(canvas, viewScene);

			const camera = new ArcRotateCamera('camera', 0, 0, 5, Vector3.Zero(), viewScene);
			camera.attachControl();

			const view = engine.registerView(canvas, camera);

			const model = models[index];
			const {meshes} = await SceneLoader.ImportMeshAsync('', model);
			centeredModel(meshes[0] as Mesh, viewScene);

			viewScene.executeWhenReady(() => {
				setTimeout(() => {
					view.enabled = false;
				}, 300);
			});
		});

		setSpinning(true);
		Promise.all(promises).finally(() => {
			setSpinning(false);
		});

		const renderLoop = () => {
			if (engine.activeView) {
				const viewScene = sceneMapRef.current?.get(engine.activeView.target);
				viewScene?.render();
			} else {
				scene.render();
			}
		};
		engine.runRenderLoop(renderLoop);

		return () => {
			engine.dispose();
		};
	}, [models]);

	const handleCanvasEnter: PointerEventHandler<HTMLCanvasElement> = (event) => {
		const engine = engineRef.current;
		if (!engine) {
			console.error(`engine is ${engine}`);
			return;
		}

		const view = engine.views.find(view => view.target === event.target);
		if (!view) {
			console.error(`view is ${view}`);
			return;
		}

		const scene = sceneMapRef.current?.get(view.target);
		if (!scene) {
			console.error(`scene is ${scene}`);
			return;
		}

		engine.views.forEach(itemView => {
			if (itemView !== view) {
				itemView.enabled = false;
				sceneMapRef.current?.get(itemView.target)?.detachControl();
			}
		});

		engine.inputElement = view.target;
		scene.attachControl();
		view.enabled = true;
	};

	const handleCanvasLeave: PointerEventHandler<HTMLCanvasElement> = (event) => {
		const view = engineRef.current?.views.find(view => view.target === event.target);
		if (!view) {
			console.error(`view is ${view}`);
			return;
		}

		const scene = sceneMapRef.current?.get(view.target);
		if (!scene) {
			console.error(`scene is ${scene}`);
			return;
		}

		view.enabled = false;
	};

	return <Spin spinning={spinning} tip="数据加载中...">
		<div className={classNames(`${prefixCls}-list`, className)} style={style}>
			{
				models.map((model) => {
					return <div
						className={
							classNames(`${prefixCls}-list-item`, {
								[`${prefixCls}-list-item-active`]: value === model
							})
						}
						key={model}
					>
						<canvas
							className={`${prefixCls}-list-item-canvas`}
							ref={element => element && viewCanvasesRef.current.push(element)}
							onPointerDown={handleCanvasEnter}
							onPointerLeave={handleCanvasLeave}
							onClick={() => onChange(model)}
						/>
						<div className={`${prefixCls}-list-item-title`}>
							{model.split('/').pop()}
						</div>
					</div>;
				})
			}
		</div>
	</Spin>;
};

export const ModelDrawer: FC<ModelDrawerProps> = (props) => {
	const {
		value, models,
		onChange,
		...drawerProps
	} = props;

	return <Drawer
		className={prefixCls}
		placement="left"
		title="模型库"
		closable={true}
		{...drawerProps}
	>
		<List models={models} value={value} onChange={onChange}/>
	</Drawer>;
};

import * as BABYLON from '@babylonjs/core';

/**
 * centered model
 */
/**
 * centered model
 */
export const centeredModel = (model: BABYLON.AbstractMesh, scene: BABYLON.Scene) => {
	const boundingInfo = model.getHierarchyBoundingVectors(true);

	// 计算模型的中心点
	const center = BABYLON.Vector3.Center(boundingInfo.min, boundingInfo.max);

	// 计算模型的大小
	const extent = boundingInfo.max.subtract(boundingInfo.min);
	const maxExtent = Math.max(extent.x, extent.y, extent.z);

	// 计算合适的相机距离
	const fov = scene.activeCamera?.fov || 1;
	const distance = maxExtent / (2 * Math.tan(fov / 2));

	// 设置相机的目标和位置
	if (scene.activeCamera instanceof BABYLON.ArcRotateCamera) {
		scene.activeCamera.target = center;
		scene.activeCamera.setPosition(center.subtract(new BABYLON.Vector3(0, 0, distance)));
	}
};

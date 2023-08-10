import * as BABYLON from '@babylonjs/core';

/**
 * centered model
 */
/**
 * centered model
 */
export const centeredModel = (model: BABYLON.Mesh, scene: BABYLON.Scene) => {
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


const totalBoundingInfo = (meshes: BABYLON.AbstractMesh[]) => {
	let boundingInfo = meshes[0].getBoundingInfo();
	let min = boundingInfo.boundingBox.minimumWorld;
	let max = boundingInfo.boundingBox.maximumWorld;
	for (let i = 1; i < meshes.length; i++) {
		boundingInfo = meshes[i].getBoundingInfo();
		min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
		max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
	}
	return new BABYLON.BoundingInfo(min, max);
}

/**
 * centered model
 * inspired by https://forum.babylonjs.com/t/display-model-in-the-center/32738/32
 * playground: https://playground.babylonjs.com/#3I55DK#544
 */
export const centeredHumanModel = (meshes: BABYLON.AbstractMesh[]) => {
	const someMeshFromTheArrayOfMeshes = meshes[0];
	someMeshFromTheArrayOfMeshes.setBoundingInfo(totalBoundingInfo(meshes));

	const es = someMeshFromTheArrayOfMeshes.getBoundingInfo().boundingBox.extendSize;
	const es_scaled = es.scale(2);
	const width = es_scaled.x;
	const height = es_scaled.y;
	const depth = es_scaled.z;

	const center = someMeshFromTheArrayOfMeshes.getBoundingInfo().boundingBox.centerWorld;
	const boundingBoxMaxDimension = Math.max(width, height, depth);

	const parentBox = BABYLON.MeshBuilder.CreateBox("parentBox", {size: boundingBoxMaxDimension});
	parentBox.position = new BABYLON.Vector3(center.x, center.y, center.z);
	parentBox.isVisible = false;

	for (const mesh of meshes) {
		mesh.setParent(parentBox);
	}

	parentBox.position = BABYLON.Vector3.Zero();
	parentBox.normalizeToUnitCube(true)
	parentBox.computeWorldMatrix(true);
};

import 'babylonjs-vrm-loader';

import { SceneLoader } from "@babylonjs/core";
import { PmxLoader } from "babylon-mmd";

import { FBXLoader } from "./fbx/loader";



if (SceneLoader) {
	SceneLoader.RegisterPlugin(new PmxLoader());
	SceneLoader.RegisterPlugin(new FBXLoader());
}

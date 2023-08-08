import 'babylonjs-vrm-loader';
import 'babylon-mmd/esm/Loader/pmxLoader';

import { SceneLoader } from "@babylonjs/core";
import { PmxLoader } from "babylon-mmd";

if (SceneLoader) {
	SceneLoader.RegisterPlugin(new PmxLoader());
}

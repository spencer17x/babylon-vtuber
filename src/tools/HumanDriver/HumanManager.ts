import { Scene } from "@babylonjs/core";
import { HumanoidBone, VRMManager } from "babylonjs-vrm-loader";

import { cc } from "./mapping";

type GetProperties<T> = Exclude<{
	[K in keyof T]: T[K] extends (...args: any[]) => any ? never : K
}[keyof T], undefined>;

export type HumanBoneName = GetProperties<HumanoidBone>;

export type HumanManagerType = 'vrm' | 'cc';

export interface HumanManagerConfig {
	type: HumanManagerType;
	scene: Scene;
}

export class HumanManager {
	config: HumanManagerConfig;

	static create(config: HumanManagerConfig) {
		return new this(config);
	}

	constructor(config: HumanManagerConfig) {
		this.config = config;
	}

	get vrmManager() {
		const managers: VRMManager[] = this.config.scene.metadata.vrmManagers || [];
		return managers[managers.length - 1];
	}

	getTransformNode(name: HumanBoneName) {
		if (this.config.type === 'vrm') {
			return this.vrmManager.humanoidBone[name];
		}
		if (this.config.type === 'cc') {
			return this.config.scene.transformNodes.find(
				(node) => node.name === cc[name]
			);
		}
		return null;
	}

	morphing(label: string, value: number) {
		if (this.config.type === 'vrm') {
			return this.vrmManager.morphing(label, value)
		}
	}
}

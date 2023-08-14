import { HumanoidBone } from "./HumanoidBone";

export class Manager {
	humanoidBone: HumanoidBone;

	morphing(label: string, value: number) {
		console.log(label, value);
	}
}

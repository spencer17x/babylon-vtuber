import { assetsUrl } from '@/config';

export interface Model {
	name: string;
	path: string;
}

export const models: Model[] = [
	{
		name: '2同人-塔利亚奇迹vr-bl-un2.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: 'AliciaSolid.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: 'Ashtra.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: 'Keqing.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: 'Klee.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: 'M002.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: 'naiyi_1.20.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: 'RacingMiku005bld30blend.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: 'Seed-san.vrm',
		path: assetsUrl + '/models/vrm/',
	},
	{
		name: '暗夜卡卡终版.vrm',
		path: assetsUrl + '/models/vrm/',
	},
];

export const getModel = (name: string) => {
	return models.find((model) => model.name === name);
};

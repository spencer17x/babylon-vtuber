import { createHashRouter, Navigate } from 'react-router-dom';
import { VtuberVRM } from '@/pages/vrm';
import { VtuberMMD } from '@/pages/mmd';

export const router = createHashRouter([
	{
		path: '/vrm',
		element: <VtuberVRM/>
	},
	{
		path: '/mmd',
		element: <VtuberMMD/>
	},
	{
		path: '*',
		element: <Navigate to="/vrm"/>
	}
]);

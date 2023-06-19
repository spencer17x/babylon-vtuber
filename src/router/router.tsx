import { createHashRouter, Navigate } from 'react-router-dom';
import { VtuberVRMPage } from '@/pages/vrm';
import { VtuberMMDPage } from '@/pages/mmd';

export const router = createHashRouter([
	{
		path: '/vrm',
		element: <VtuberVRMPage/>
	},
	{
		path: '/mmd',
		element: <VtuberMMDPage/>
	},
	{
		path: '*',
		element: <Navigate to="/vrm"/>
	}
]);

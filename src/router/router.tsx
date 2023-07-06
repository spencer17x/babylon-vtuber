import { createHashRouter, Navigate } from 'react-router-dom';

import { VtuberMMDPage } from '@/pages/mmd';
import { VtuberVRMPage } from '@/pages/vrm';

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

import { createHashRouter, Navigate } from 'react-router-dom';

import { MMDPage } from '@/pages/MMDPage';
import { VRMPage } from '@/pages/VRMPage';

export const router = createHashRouter([
	{
		path: '/vrm',
		element: <VRMPage/>
	},
	{
		path: '/mmd',
		element: <MMDPage/>
	},
	{
		path: '*',
		element: <Navigate to="/vrm"/>
	}
]);

import { createHashRouter, Navigate } from 'react-router-dom';

import { HumanPage } from "@/pages/HumanPage";
import { MMDPage } from '@/pages/MMDPage';
import { VRMPage } from '@/pages/VRMPage';

export const router = createHashRouter([
	{
		path: '/human',
		element: <HumanPage/>
	},
	{
		path: '/vrm',
		element: <VRMPage/>
	},
	{
		path: '/mmd',
		element: <MMDPage/>
	},
	{
		path: '/',
		element: <Navigate to='/human'/>
	},
]);

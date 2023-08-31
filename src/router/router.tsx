import { createHashRouter, Navigate } from 'react-router-dom';

import { GuidePage } from "@/pages/GuidePage";
import { HumanPage } from "@/pages/HumanPage";
import { MMDPage } from '@/pages/MMDPage';
import { VRMPage } from '@/pages/VRMPage';

export const router = createHashRouter([
	{
		path: '/guide',
		element: <GuidePage/>
	},
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
		element: <Navigate to='/guide'/>
	},
]);

import 'antd/dist/reset.css';
import 'babylonjs-vrm-loader';
import './main.scss';

import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from '@/router';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<RouterProvider router={router}/>
);

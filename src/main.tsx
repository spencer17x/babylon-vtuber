import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';

import '@/libs/babylon-vrm-loader';

import './main.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<RouterProvider router={router}/>
);

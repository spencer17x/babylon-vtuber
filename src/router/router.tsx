import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Vrm } from '@/components/vrm';
import { Mmd } from '@/components/mmd';

export const router = createBrowserRouter([
  {
    path: '/vrm',
    element: <Vrm/>
  },
  {
    path: '/mmd',
    element: <Mmd/>
  },
  {
    path: '*',
    element: <Navigate to="/vrm"/>
  }
]);

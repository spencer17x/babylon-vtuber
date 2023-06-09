import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import './main.scss';
import { Vtuber } from './components/vtuber';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Vtuber/>
);

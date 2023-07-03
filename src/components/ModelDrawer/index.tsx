import './index.scss';

import { Drawer, DrawerProps, Radio } from 'antd';
import { FC } from 'react';
import { models } from './data';

export interface ModelDrawerProps extends DrawerProps {
	value: string;
	onChange: (value: string) => void;
}

const prefixCls = 'model-drawer';

export const ModelDrawer: FC<ModelDrawerProps> = (props) => {
	const { value, onChange, ...drawerProps } = props;

	return <Drawer
		className={prefixCls}
		placement="left"
		title="模型库"
		closable={true}
		{...drawerProps}
	>
		<Radio.Group onChange={event => onChange(event.target.value)} value={value}>
			{
				models.map(model => {
					return <div className={`${prefixCls}-model-preview`} key={model.name}>
						<Radio value={model.path + model.name}>
							{model.name}
						</Radio>
					</div>;
				})
			}
		</Radio.Group>
	</Drawer>;
};

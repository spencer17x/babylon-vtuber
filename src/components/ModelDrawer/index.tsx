import './index.scss';

import { Drawer, DrawerProps, Radio, Space } from 'antd';
import { FC } from 'react';

export interface ModelDrawerProps extends DrawerProps {
	value: string;
	models: string[];
	onChange: (value: string) => void;
}

const prefixCls = 'model-drawer';

export const ModelDrawer: FC<ModelDrawerProps> = (props) => {
	const {
		value, models,
		onChange,
		...drawerProps
	} = props;

	return <Drawer
		className={prefixCls}
		placement="left"
		title="模型库"
		closable={true}
		{...drawerProps}
	>
		<Radio.Group onChange={event => onChange(event.target.value)} value={value}>
			<Space direction="vertical">
				{
					models.map(model => {
						return <Radio className={`${prefixCls}-model`} key={model} value={model}>
							{model}
						</Radio>;
					})
				}
			</Space>
		</Radio.Group>
	</Drawer>;
};

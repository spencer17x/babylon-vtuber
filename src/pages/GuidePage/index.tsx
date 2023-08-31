import './index.scss';

import { Button, Space } from "antd";
import { useNavigate } from "react-router-dom";

const prefixCls = 'guide-page';

export const GuidePage = () => {
	const navigate = useNavigate();

	return <div className={prefixCls}>
		<h1>点击按钮进入对应页面</h1>

		<Space wrap>
			{
				['vrm', 'mmd', 'human'].map((item) => {
					return <Button
						key={item}
						type="primary"
						onClick={() => {
							navigate({
								pathname: `/${item}`,
							})
						}}
					>
						{item}
					</Button>
				})
			}
		</Space>
	</div>
}

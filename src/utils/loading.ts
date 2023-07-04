import { message } from 'antd';

type LoadingType = 'mediapipe' | 'model';

const loadingMap: Record<LoadingType, string> = {
	mediapipe: 'mediapipe数据加载中...',
	model: '模型数据加载中...',
};

export const showLoading = (type: LoadingType) => {
	return message.loading({
		content: loadingMap[type],
		duration: 0,
		key: type
	});
};

export const hideLoading = (type: LoadingType) => {
	return message.destroy(type);
};

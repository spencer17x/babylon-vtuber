import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';

// import { GLTFFileLoader } from '@/libs/glTF/v6.8.0/glTFFileLoader';
// import './vrm-extension';
// import './vcast-vci-material-unity';

import { GLTFFileLoader } from '@/libs/glTF/v6.8.0/glTFFileLoader';
import '@/libs/glTF/v6.8.0/2.0/Extensions';
import './vrm-extension';

/**
 * VRM/VCI ファイルを読み込めるようにする
 * 拡張子を変更しただけ
 */
export class VRMFileLoader extends GLTFFileLoader {
    public name = 'vrm';
    public extensions = {
        '.vrm': { isBinary: true },
        '.vci': { isBinary: true },
    };

    public createPlugin() {
        return new VRMFileLoader();
    }
}

if (SceneLoader) {
    SceneLoader.RegisterPlugin(new VRMFileLoader());
}

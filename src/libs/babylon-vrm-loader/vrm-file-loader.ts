import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { GLTFFileLoader } from '@/libs/glTF/v5.25.0/glTFFileLoader';

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

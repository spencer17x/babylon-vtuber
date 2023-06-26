import type { IGLTFLoaderExtension } from '@babylonjs/loaders/glTF/2.0';
import { GLTFLoader } from '@babylonjs/loaders/glTF/2.0';

/**
 * `extensions` に入る拡張キー
 */
const NAME = 'VCAST_vci_material_unity';

/**
 * VCAST_vci_material_unity 拡張を処理する
 */
export class VCAST_vci_material_unity implements IGLTFLoaderExtension {
    /**
     * @inheritdoc
     */
    public readonly name = NAME;
    /**
     * @inheritdoc
     */
    public enabled = true;

    /**
     * @inheritdoc
     */
    public constructor(private loader: GLTFLoader) {}

    /**
     * @inheritdoc
     */
    public dispose(): void {
        (this.loader as any) = null;
    }
}

// ローダーに登録する
GLTFLoader.RegisterExtension(NAME, (loader) => new VCAST_vci_material_unity(loader));

///<reference path="Node.d.ts" />
///<reference path="../Texture.d.ts" />
export namespace clay {

    export module compositor {

        interface ICompositorTextureNodeOption {
            name?: string;
            outputs?: IDictionary<ICompositorNodeOutput>;
            texture: Texture;
        }

        export class TextureNode extends Node {

            constructor(option?: ICompositorTextureNodeOption);

            texture: Texture;
        }
    }
}
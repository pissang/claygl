///<reference path="Node.d.ts" />
///<reference path="../Texture.d.ts" />
declare module qtek {

    export module compositor {

        interface TextureNodeOption extends ICompositorNodeOption {
            texture: Texture;
        }

        export class TextureNode extends Node {

            constructor(option?: TextureNodeOption)

            texture: Texture;
        }
    }
}
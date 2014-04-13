///<reference path="../Material.d.ts" />
///<reference path="../Texture.d.ts" />
///<reference path="../Renderer.d.ts" />
///<reference path="../FrameBuffer.d.ts" />
///<reference path="../core/container.d.ts" />
///<reference path="../core/Base.d.ts" />
declare module qtek {

    export module compositor {

        export class Pass extends qtek.core.Base {

            fragment: string;

            outputs: IDictionary<Texture>;

            material: Material;

            setUniform(name: string, value: any): void;

            getUniform(name: string): any;

            attachOutput(texture: Texture, attachment?: number): void;

            detachOutput(texture: Texture): void;

            render(renderer: Renderer, frameBuffer: FrameBuffer): void;

            bind(renderer: Renderer, frameBuffer: FrameBuffer): void;

            unbind(renderer: Renderer, frameBuffer: FrameBuffer): void;
        }
    }
}
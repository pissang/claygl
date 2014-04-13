///<reference path="../core/Base.d.ts" />
///<reference path="../compositor/Compositor.d.ts" />
declare module qtek {

    export module loader {

        interface IFXLoaderOption {
            rootPath?: string;
            textureRootPath?: string;
            bufferRootPath?: string;
        }

        export class FX extends core.Base {

            constructor(option?: IFXLoaderOption): void;

            rootPath: string;

            textureRootPath: string;

            bufferRootPath: string;

            load(string: url): void;

            parse(json: object): Compositor;

            on(name: "success", (compositor: Compositor)=> void, context?: any);
            success((compositor: Compositor)=> void, context?: any);
        }
    }
}
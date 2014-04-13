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

            constructor(option?: IFXLoaderOption);

            rootPath: string;

            textureRootPath: string;

            bufferRootPath: string;

            load(url: string): void;

            parse(json: Object): compositor.Compositor;

            once(name: "success", handler: (compositor: compositor.Compositor) => void, context?: any): void;
            once(name: string, handler: Function, context?: any): void;
            success(handler: (compositor: compositor.Compositor) => void, context?: any): void;
        }
    }
}
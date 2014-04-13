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

            load(string: url): void;

            parse(json: object): compositor.Compositor;

            on(name: "success", handler: (compositor: compositor.Compositor) => void, context?: any);
            success(handler: (compositor: compositor.Compositor) => void, context?: any);
        }
    }
}
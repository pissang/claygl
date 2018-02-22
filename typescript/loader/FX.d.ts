import { Base } from '../core/Base';
import { Compositor } from '../compositor/Compositor';

export module loader {

    interface IFXLoaderOption {
        rootPath?: string;
        textureRootPath?: string;
        bufferRootPath?: string;
    }

    export class FX extends Base {

        constructor(option?: IFXLoaderOption);

        rootPath: string;

        textureRootPath: string;

        bufferRootPath: string;

        load(url: string): void;

        once(name: "success", handler: (compositor: Compositor) => void, context?: any): void;
        once(name: string, handler: Function, context?: any): void;
        success(handler: (compositor: Compositor) => void, context?: any): void;
    }
}
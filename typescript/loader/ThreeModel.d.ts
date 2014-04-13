///<reference path="../core/Base.d.ts" />
///<reference path="../Mesh.d.ts" />
declare module qtek {

    export module loader {

        interface IThreeModelLoaderOption {
            rootPath?: string;
            textureRootPath?: string;
        }

        export class ThreeModel extends core.Base  {

            constructor(option?: IThreeModelLoaderOption);

            rootPath: string;

            textureRootPath: string;

            load(url: string): void;

            parse(data: Object): Mesh[];

            once(name: "success", handler: (meshList: Mesh[])=> void, context?: any): void;
            once(name: string, handler: Function, context?: any): void;
            success(handler: (meshList: Mesh[])=> void, context?: any): void;
        }
    }
}
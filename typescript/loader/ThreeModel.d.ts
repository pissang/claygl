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

            parse(data: object): Mesh[];

            on(name: "success", (meshList: Mesh[])=> void, context?: any);
            success((meshList: Mesh[])=> void, context?: any);
        }
    }
}
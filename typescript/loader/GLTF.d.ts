///<reference path="../core/Base.d.ts" />
///<reference path="../core/container.d.ts" />
///<reference path="../Mesh.d.ts" />
///<reference path="../Texture.d.ts" />
///<reference path="../animation/SkinningClip.d.ts" />
///<reference path="../Material.d.ts" />
///<reference path="../Skeleton.d.ts" />
///<reference path="../Scene.d.ts" />
///<reference path="../Camera.d.ts" />
declare module qtek {

    export module loader {

        interface IGLTFLoaderOption {
            rootPath?: string;
            textureRootPath?: string;
            bufferRootPath?: string;

            shaderName?: string;
        }

        interface IGLTFLoaderResult {
            scene: Scene;
            cameras: IDictionary<Camera>;
            textures: IDictionary<Texture>;
            materials: IDictionary<Material>;
            skeletons: IDictionary<Skeleton>;
            clip: animation.SkinningClip
        }

        export class GLTF extends core.Base {

            constructor(option?: IGLTFLoaderOption): void;

            rootPath: string;
            textureRootPath: string;
            bufferRootPath: string;

            shaderName: string;

            load(url: string): void;

            parse(json: object): IGLTFLoaderResult;

            on(name: "success", (result: IGLTFLoaderResult)=> void, context?: any);
            success((result: IGLTFLoaderResult)=> void, context?: any);
        }
    }
}
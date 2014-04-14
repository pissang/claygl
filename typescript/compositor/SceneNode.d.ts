///<reference path="Node.d.ts" />
///<reference path="../Scene.d.ts" />
///<reference path="../Camera.d.ts" />
declare module qtek {

    export module compositor {

        interface ICompositorSceneNodeOption {
            name?: string;
            scene?: Scene;
            camera?: Camera;
            autoUpdateScene?: boolean;
            preZ?: boolean;
            outputs?: IDictionary<ICompositorNodeOutput>;
        }

        export class SceneNode extends Node {

            constructor(option: ICompositorSceneNodeOption);

            scene: Scene;

            camera: Camera;

            autoUpdateScene: boolean;

            preZ: boolean;
        }
    }
}
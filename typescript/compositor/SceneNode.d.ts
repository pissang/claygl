///<reference path="Node.d.ts" />
///<reference path="../Scene.d.ts" />
///<reference path="../Camera.d.ts" />
declare module qtek {

    export module compositor {

        interface SceneNodeOption extends ICompositorNodeOption {
            scene?: Scene;
            camera?: Camera;
            autoUpdateScene: boolean;
            preZ: boolean;
        }

        export class SceneNode extends Node {

            constructor(option?: SceneNodeOption);

            scene: Scene;

            camera: Camera;

            autoUpdateScene: boolean;

            preZ: boolean;
        }
    }
}
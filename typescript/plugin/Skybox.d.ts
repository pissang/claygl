///<reference path="../Mesh.d.ts" />
///<reference path="../Scene.d.ts" />
declare module qtek {

    export module plugin {

        interface ISkyboxOption {
            scene?: Scene;
        }

        export class Skybox extends Mesh {

            constructor(option?: ISkyboxOption);

            scene: Scene;

            attachScene(scene: Scene): void;

            detachScene(): void;

            dispose(): void;

        }
    }
}
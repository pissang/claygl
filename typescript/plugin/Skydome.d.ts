///<reference path="../Mesh.d.ts" />
///<reference path="../Scene.d.ts" />
declare module qtek {

    export module plugin {

        interface ISkydomeOption {
            scene?: Scene;
        }

        export class Skydome extends Mesh {

            constructor(option?: ISkydomeOption);

            scene: Scene;

            attachScene(scene: Scene): void;

            detachScene(): void;

            dispose(): void;

        }
    }
}
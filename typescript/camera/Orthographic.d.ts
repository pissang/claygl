///<reference path="../Camera.d.ts" />
export namespace clay {

    export module camera {

        interface IOrthographicCameraOption extends ICameraOption {
            left?: number;
            right?: number;
            near?: number;
            far?: number;
            top?: number;
            bottom?: number;
        }

        export class Orthographic extends Camera {

            constructor(option?: IOrthographicCameraOption);

            left: number;

            right: number;

            near: number;

            far: number;

            top: number;

            bottom: number;

        }
    }
}
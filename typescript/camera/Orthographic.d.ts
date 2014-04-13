///<reference path="../Camera.d.ts" />
declare module qtek {

    export module camera {

        interface IOrthographicCameraOption extends ICameraOption {
            left?: number;
            right?: number;
            near?: number;
            far?: number;
            top?: number;
            bottom?: number;
        }

        export class Orthographic {

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
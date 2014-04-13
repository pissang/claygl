///<reference path="../Camera.d.ts" />
declare module qtek {

    export module camera {

        interface IPerspectiveCameraOption: ICameraOption {
            fov?: number;
            aspect?: number;
            near?: number;
            far?: number;
        }

        export class Perspective {

            constructor(option?: IPerspectiveCameraOption);

            fov: number;

            aspect: number;

            near: number;

            far: number;
        }
    }
}
///<reference path="../DynamicGeometry.d.ts" />
declare module qtek {

    export module geometry {

        interface ICubeGeometryOption extends IGeometryOption {
            widthSegments?: number;
            heightSegements?: number;
            depthSegments?: number;
            inside?: boolean;
        }

        export class Cube extends DynamicGeometry{

            constructor(option?: ICubeGeometryOption);
        }
    }
}
///<reference path="../DynamicGeometry.d.ts" />
declare module qtek {

    export module geometry {

        interface IConeGeometryOption extends IGeometryOption {
            topRadius?: number;
            bottomRadius?: number;
            height?: number;

            capSegments?: number;
            heightSegements?: number;
        }

        export class Cone extends DynamicGeometry{

            constructor(option?: IConeGeometryOption);
        }
    }
}
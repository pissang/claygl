///<reference path="../DynamicGeometry.d.ts" />
declare module qtek {

    export module geometry {

        interface ICylinderGeometryOption extends IGeometryOption {
            radius?: number;
            height?: number;

            capSegments?: number;
            heightSegements?: number;
        }

        export class Cylinder extends DynamicGeometry{

            constructor(option?: ICylinderGeometryOption);
        }
    }
}
///<reference path="../DynamicGeometry.d.ts" />
export namespace geometry {

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
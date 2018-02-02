///<reference path="../DynamicGeometry.d.ts" />

export namespace geometry {

    interface ISphereGeometryOption extends IGeometryOption {
        widthSegments?: number;
        heightSegements?: number;

        phiStart?: number;
        phiLength?: number;

        thetaStart?: number;
        thetaLength?: number;

        radius?: number;
    }

    export class Sphere extends DynamicGeometry{

        constructor(option?: ISphereGeometryOption);
    }
}
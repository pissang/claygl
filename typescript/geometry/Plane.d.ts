///<reference path="../DynamicGeometry.d.ts" />
export namespace clay {

    export module geometry {

        interface IPlaneGeometryOption extends IGeometryOption {
            widthSegments?: number;
            heightSegements?: number;
        }

        export class Plane extends DynamicGeometry{

            constructor(option?: IPlaneGeometryOption);
        }
    }
}
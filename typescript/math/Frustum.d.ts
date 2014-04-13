///<reference path="BoundingBox.d.ts" />
///<reference path="Vector3.d.ts" />
///<reference path="Matrix4.d.ts" />
///<reference path="Plane.d.ts" />
declare module qtek {

    export module math {

        export class Frustum {

            planes: Plane[];

            boundingBox: BoundingBox;

            vertices: Float32Array[];

            setFromProjection(projectionMatrix: Matrix4): void;

            getTransformedBoundingBox(bbox: BoundingBox, matrix: Matrix4): BoundingBox;
        }
    }
}
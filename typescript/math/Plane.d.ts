///<reference path="BoundingBox.d.ts" />
///<reference path="Vector3.d.ts" />
///<reference path="Matrix4.d.ts" />
///<reference path="Frustum.d.ts" />
declare module qtek {

    export module math {

        export class Plane {

            normal: Vector3;

            distance: number;

            constructor(normal: Vector3, distance: number);

            constructor();

            distanceToPoint(point: Vector3): number;

            projectPoint(point: Vector3, out?: Vector3): Vector3;

            normalize(): void;

            intersectFrustum(frustum: Frustum): boolean;

            intersectLine(start: Vector3, end: Vector3, out: Vector3) : Vector3;

            applyTransform(matrix: Matrix4): void;

            copy(plane: Plane): void;

            clone(): Plane;
        }
    }
}
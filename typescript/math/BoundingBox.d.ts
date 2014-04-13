///<reference path="Vector3" />
///<reference path="Matrix4" />
declare module qtek {

    export module math {

        export class BoundingBox {

            constructor(min: Vector3, max: Vector3);
            constructor();

            vertices: Float32Array[];

            updateFromVertices(vertices: number[][]): void;

            union(bbox: BoundingBox): void;

            intersectBoundingBox(bbox: BoundingBox): boolean;

            applyTransform(matrix: Matrix4): void;

            applyProjection(matrix: Matrix4): void;

            updateVertices(): void;

            copy(bbox: BoundingBox): void;

            clone(): BoundingBox;            
        }
    }
}
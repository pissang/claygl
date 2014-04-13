///<reference path="Node.d.ts" />
///<reference path="math/Vector2.d.ts" />
///<reference path="math/Ray.d.ts" />
///<reference path="math/Matrix4.d.ts" />
///<reference path="math/Frustum.d.ts" />
///<reference path="math/BoundingBox.d.ts" />
declare module qtek {

    interface ICameraOption extends INodeOption {}

    export class Camera extends Node {

        constructor(option?: ICameraOption);

        projectionMatrix: math.Matrix4;

        invProjectionMatrix: math.Matrix4;

        viewMatrix: math.Matrix4;

        frustum: math.Frustum;

        sceneBoundingBoxLastFrame: math.BoundingBox;

        updateProjectionMatrix(): void;

        castRay(ndc: math.Vector2, out?: math.Ray): math.Ray;
    }
}
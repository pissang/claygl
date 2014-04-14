///<reference path="../Mesh.d.ts" />
///<reference path="../Node.d.ts" />
declare module qtek.util.mesh {

    export function merge(meshList: Mesh[], applyWorldTransform?: boolean): Mesh;

    export function splitByJoints(mesh: Mesh, maxJointNumber: number, inPlace: boolean): Node;

}
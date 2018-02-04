import { Mesh } from '../Mesh.d.ts';
import { Node } from '../Node.d.ts';

export namespace mesh {

    export function merge(meshList: Mesh[], applyWorldTransform?: boolean): Mesh;

    export function splitByJoints(mesh: Mesh, maxJointNumber: number, inPlace: boolean): Node;

}
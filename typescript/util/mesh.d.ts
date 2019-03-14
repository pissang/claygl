import { Mesh } from '../Mesh';
import { Node } from '../Node';

export namespace mesh {

    export function merge(meshList: Mesh[], applyWorldTransform?: boolean): Mesh;

    export function splitByJoints(mesh: Mesh, maxJointNumber: number, inPlace: boolean): Node;

}

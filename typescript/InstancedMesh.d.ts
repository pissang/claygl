import { Mesh, IMeshOption } from './Mesh';
import { Node } from './Node';

interface IInstance {
    node: Node
}

interface IInstancedMeshOption extends IMeshOption {
    instances: IInstance[]
}

export class InstancedMesh extends Mesh {
    constructor(option?: IInstancedMeshOption);

    instances: IInstance[]
}
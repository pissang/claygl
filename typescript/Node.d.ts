import { Vector3 } from './math/Vector3';
import { Quaternion } from './math/Quaternion';
import { Matrix4 } from './math/Matrix4';
import { Scene } from './Scene';
import { Base } from './core/Base';

export interface INodeOption {
    name?: string;
    autoUpdateLocalTransform?: boolean;
    position?: Vector3;
    rotation?: Quaternion;
    scale?: Vector3;
}

export class Node extends Base {

    constructor(option?: INodeOption);

    name: string;

    parent: Node;

    scene: Scene;

    autoUpdateLocalTransform: boolean;

    position: Vector3;

    rotation: Quaternion;

    scale: Vector3;

    worldTransform: Matrix4;

    localTransform: Matrix4;

    isRenderable(): boolean;

    setName(name: string): void;

    add(node: Node): void;

    remove(node: Node): void;

    isAncestor(node: Node): void;

    children(): Node[];

    childAt(idx: number): Node;

    getChildByName(name: string): Node;

    getDescendantByName(name: string): Node;

    traverse(callback: (current: Node, parent: Node) => void, parent?: Node, ctor?: Function): void;

    setLocalTransform(matrix: Matrix4): void;

    setWorldTransform(matrix: Matrix4): void;

    decomposeLocalTransform(): void;

    decomposeWorldTransform(): void;

    updateLocalTransform(): void;

    updateWorldTransform(): void;

    update(forceUpdateWorld: boolean): void;

    getWorldPosition(out?: Vector3): Vector3;

    clone(): Node;

    rotateAround(point: Vector3, axis: Vector3, angle: number): void;

    lookAt(target: Vector3, up?: Vector3);
}
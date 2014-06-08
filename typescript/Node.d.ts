///<reference path="core/Base.d.ts" />
///<reference path="Scene.d.ts" />
///<reference path="math/Vector3.d.ts" />
///<reference path="math/Quaternion.d.ts" />
///<reference path="math/Matrix4.d.ts" />

declare module qtek {
    
    interface INodeOption {
        name?: string;
        autoUpdateLocalTransform?: boolean;
        position?: math.Vector3;
        rotation?: math.Quaternion;
        scale?: math.Vector3;
    }

    export class Node extends core.Base {

        constructor(option?: INodeOption);

        name: string;

        parent: Node;

        scene: Scene;

        autoUpdateLocalTransform: boolean;

        position: math.Vector3;

        rotation: math.Quaternion;

        scale: math.Vector3;

        worldTransform: math.Matrix4;

        localTransform: math.Matrix4;

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

        setLocalTransform(matrix: math.Matrix4): void;

        setWorldTransform(matrix: math.Matrix4): void;

        decomposeLocalTransform(): void;

        decomposeWorldTransform(): void;

        updateLocalTransform(): void;

        updateWorldTransform(): void;

        update(forceUpdateWorld: boolean): void;

        getWorldPosition(out?: math.Vector3): math.Vector3;

        clone(): Node;

        rotateAround(point: math.Vector3, axis: math.Vector3, angle: number): void;

        lookAt(target: math.Vector3, up?: math.Vector3);
    }
}
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

    /**
     * Scene node
     */
    export class Node extends core.Base {

        constructor(option?: INodeOption);

        /**
         * Scene node name
         */
        name: string;

        /**
         * Parent of current scene node
         */
        parent: Node;

        /**
         * The root scene attached to. Null if it is a isolated node
         */
        scene: Scene;

        /**
         * If the local transform is update from SRT(scale, rotation, translation, which is position here) each frame
         */
        autoUpdateLocalTransform: boolean;

        /**
         * Position relative to its parent node. aka translation.
         */
        position: math.Vector3;

        /**
         * Rotation relative to its parent node. Represented with a quaternion
         */
        rotation: math.Quaternion;

        /**
         * Scale relative to its parent node
         */
        scale: math.Vector3;

        /**
         * Affine transform matrix relative to its root scene.
         */
        worldTransform: math.Matrix4;

        /**
         * Affine transform matrix relative to its parent node.
         * Composite with position, rotation and scale.
         */
        localTransform: math.Matrix4;

        /**
         * Return true if it is a renderable scene node, like Mesh and ParticleSystem
         */
        isRenderable(): boolean;

        /**
         * Set the name of the scene node
         * @param name
         */
        setName(name: string): void;

        /**
         * Add a child node
         * @param node
         */
        add(node: Node): void;

        /**
         * Remove the specified child scene node
         * @param node
         */
        remove(node: Node): void;

        /**
         * Return true if it is ancestor of the given scene node
         * @param node
         */
        isAncestor(node: Node): void;

        /**
         * Return a new created array of all its children nodes
         */
        children(): Node[];

        /**
         * @param name
         */
        getChildByName(name: string): Node;

        /**
         *
         * @param name
         */
        getDescendantByName(name: string): Node;

        /**
         * Depth first traverse all its descendant scene nodes and
         * @param callback
         * @param parent
         * @param ctor
         */
        traverse(callback: (current: Node, parent: Node) => void, parent?: Node, ctor?: Function): void;

        /**
         * Set the local transform and decompose to SRT
         * @param matrix
         */
        setLocalTransform(matrix: math.Matrix4): void;

        /**
         * Set the world transform and decompose to SRT
         * @param matrix
         */
        setWorldTransform(matrix: math.Matrix4): void;

        /**
         * Decompose the local transform to SRT
         */
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
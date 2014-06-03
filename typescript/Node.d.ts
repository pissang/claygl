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
         * @type {string}
         */
        name: string;

        /**
         * Parent of current scene node
         * @type {Node}
         */
        parent: Node;

        /**
         * The root scene attached to. Null if it is a isolated node
         * @type {Scene}
         */
        scene: Scene;

        /**
         * If the local transform is update from SRT(scale, rotation, translation, which is position here) each frame
         * @type {boolean}
         */
        autoUpdateLocalTransform: boolean;

        /**
         * Position relative to its parent node. aka translation.
         * @type {math.Vector3}
         */
        position: math.Vector3;

        /**
         * Rotation relative to its parent node. Represented with a quaternion
         * @type {math.Quaternion}
         */
        rotation: math.Quaternion;

        /**
         * Scale relative to its parent node
         * @type {math.Vector3}
         */
        scale: math.Vector3;

        /**
         * Affine transform matrix relative to its root scene.
         * @type {math.Matrix4}
         */
        worldTransform: math.Matrix4;

        /**
         * Affine transform matrix relative to its parent node.
         * Composite with position, rotation and scale.
         * @type {math.Matrix4}
         */
        localTransform: math.Matrix4;

        /**
         * Return true if it is a renderable scene node, like Mesh and ParticleSystem
         * @return {boolean}
         */
        isRenderable(): boolean;

        /**
         * Set the name of the scene node
         * @param {string} name
         */
        setName(name: string): void;

        /**
         * Add a child node
         * @param {Node} node
         */
        add(node: Node): void;

        /**
         * Remove the specified child scene node
         * @param {Node} node
         */
        remove(node: Node): void;

        /**
         * Return true if it is ancestor of the given scene node
         * @param {Node} node
         */
        isAncestor(node: Node): void;

        /**
         * Get a new created array of all its children nodes
         */
        children(): Node[];

        /**
         * Get first child have the given name
         * @param {string} name
         * @return {Node}
         */
        getChildByName(name: string): Node;

        /**
         * Get first descendant have the given name
         * @param {string} name
         * @return {Node}
         */
        getDescendantByName(name: string): Node;

        /**
         * Depth first traverse all its descendant scene nodes and
         * @param {Function} callback
         * @param {Node} [parent]
         * @param {Function} [ctor]
         */
        traverse(callback: (current: Node, parent: Node) => void, parent?: Node, ctor?: Function): void;

        /**
         * Set the local transform and decompose to SRT
         * @param {math.Matrix4} matrix
         */
        setLocalTransform(matrix: math.Matrix4): void;

        /**
         * Set the world transform and decompose to SRT
         * @param {math.Matrix4} matrix
         */
        setWorldTransform(matrix: math.Matrix4): void;

        /**
         * Decompose the local transform to SRT
         */
        decomposeLocalTransform(): void;

        /**
         * Decompose the world transform to SRT
         */
        decomposeWorldTransform(): void;

        /**
         * Update local transform from SRT
         * Notice that local transform will not be updated if _dirty mark of position, rotation, scale is all false
         */
        updateLocalTransform(): void;

        /**
         * Update world transform
         */
        updateWorldTransform(): void;

        /**
         * Update local transform and world transform recursively
         * @param {boolean} forceUpdateWorld 
         */
        update(forceUpdateWorld: boolean): void;

        /**
         * Get world position, extracted from world transform
         * @param  {math.Vector3} [out]
         * @return {math.Vector3}
         */
        getWorldPosition(out?: math.Vector3): math.Vector3;

        /**
         * Get cloned node
         * @return {Node}
         */
        clone(): Node;

        /**
         * Rotate the node around a axis by angle degrees, axis passes through point
         * @param {math.Vector3} point Center point
         * @param {math.Vector3} axis  Center axis
         * @param {number}       angle Rotation angle
         */
        rotateAround(point: math.Vector3, axis: math.Vector3, angle: number): void;

        /**
         * @param {math.Vector3} target
         * @param {math.Vector3} [up]
         */
        lookAt(target: math.Vector3, up?: math.Vector3);
    }
}
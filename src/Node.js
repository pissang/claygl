import Base from './core/Base';
import Vector3 from './math/Vector3';
import Quaternion from './math/Quaternion';
import Matrix4 from './math/Matrix4';
import mat4 from './glmatrix/mat4';
import BoundingBox from './math/BoundingBox';

var nameId = 0;

/**
 * @constructor clay.Node
 * @extends clay.core.Base
 */
var Node = Base.extend(/** @lends clay.Node# */{
    /**
     * Scene node name
     * @type {string}
     */
    name: '',

    /**
     * Position relative to its parent node. aka translation.
     * @type {clay.Vector3}
     */
    position: null,

    /**
     * Rotation relative to its parent node. Represented by a quaternion
     * @type {clay.Quaternion}
     */
    rotation: null,

    /**
     * Scale relative to its parent node
     * @type {clay.Vector3}
     */
    scale: null,

    /**
     * Affine transform matrix relative to its root scene.
     * @type {clay.Matrix4}
     */
    worldTransform: null,

    /**
     * Affine transform matrix relative to its parent node.
     * Composited with position, rotation and scale.
     * @type {clay.Matrix4}
     */
    localTransform: null,

    /**
     * If the local transform is update from SRT(scale, rotation, translation, which is position here) each frame
     * @type {boolean}
     */
    autoUpdateLocalTransform: true,

    /**
     * Parent of current scene node
     * @type {?clay.Node}
     * @private
     */
    _parent: null,
    /**
     * The root scene mounted. Null if it is a isolated node
     * @type {?clay.Scene}
     * @private
     */
    _scene: null,
    /**
     * @type {boolean}
     * @private
     */
    _needsUpdateWorldTransform: true,
    /**
     * @type {boolean}
     * @private
     */
    _inIterating: false,

    // Depth for transparent list sorting
    __depth: 0

}, function () {

    if (!this.name) {
        this.name = (this.type || 'NODE') + '_' + (nameId++);
    }

    if (!this.position) {
        this.position = new Vector3();
    }
    if (!this.rotation) {
        this.rotation = new Quaternion();
    }
    if (!this.scale) {
        this.scale = new Vector3(1, 1, 1);
    }

    this.worldTransform = new Matrix4();
    this.localTransform = new Matrix4();

    this._children = [];

},
/**@lends clay.Node.prototype. */
{

    /**
     * @type {?clay.Vector3}
     * @instance
     */
    target: null,
    /**
     * If node and its chilren invisible
     * @type {boolean}
     * @instance
     */
    invisible: false,

    /**
     * If Node is a skinned mesh
     * @return {boolean}
     */
    isSkinnedMesh: function () {
        return false;
    },
    /**
     * Return true if it is a renderable scene node, like Mesh and ParticleSystem
     * @return {boolean}
     */
    isRenderable: function () {
        return false;
    },

    /**
     * Set the name of the scene node
     * @param {string} name
     */
    setName: function (name) {
        var scene = this._scene;
        if (scene) {
            var nodeRepository = scene._nodeRepository;
            delete nodeRepository[this.name];
            nodeRepository[name] = this;
        }
        this.name = name;
    },

    /**
     * Add a child node
     * @param {clay.Node} node
     */
    add: function (node) {
        var originalParent = node._parent;
        if (originalParent === this) {
            return;
        }
        if (originalParent) {
            originalParent.remove(node);
        }
        node._parent = this;
        this._children.push(node);

        var scene = this._scene;
        if (scene && scene !== node.scene) {
            node.traverse(this._addSelfToScene, this);
        }
        // Mark children needs update transform
        // In case child are remove and added again after parent moved
        node._needsUpdateWorldTransform = true;
    },

    /**
     * Remove the given child scene node
     * @param {clay.Node} node
     */
    remove: function (node) {
        var children = this._children;
        var idx = children.indexOf(node);
        if (idx < 0) {
            return;
        }

        children.splice(idx, 1);
        node._parent = null;

        if (this._scene) {
            node.traverse(this._removeSelfFromScene, this);
        }
    },

    /**
     * Remove all children
     */
    removeAll: function () {
        var children = this._children;

        for (var idx = 0; idx < children.length; idx++) {
            children[idx]._parent = null;

            if (this._scene) {
                children[idx].traverse(this._removeSelfFromScene, this);
            }
        }

        this._children = [];
    },

    /**
     * Get the scene mounted
     * @return {clay.Scene}
     */
    getScene: function () {
        return this._scene;
    },

    /**
     * Get parent node
     * @return {clay.Scene}
     */
    getParent: function () {
        return this._parent;
    },

    _removeSelfFromScene: function (descendant) {
        descendant._scene.removeFromScene(descendant);
        descendant._scene = null;
    },

    _addSelfToScene: function (descendant) {
        this._scene.addToScene(descendant);
        descendant._scene = this._scene;
    },

    /**
     * Return true if it is ancestor of the given scene node
     * @param {clay.Node} node
     */
    isAncestor: function (node) {
        var parent = node._parent;
        while(parent) {
            if (parent === this) {
                return true;
            }
            parent = parent._parent;
        }
        return false;
    },

    /**
     * Get a new created array of all children nodes
     * @return {clay.Node[]}
     */
    children: function () {
        return this._children.slice();
    },

    /**
     * Get child scene node at given index.
     * @param {number} idx
     * @return {clay.Node}
     */
    childAt: function (idx) {
        return this._children[idx];
    },

    /**
     * Get first child with the given name
     * @param {string} name
     * @return {clay.Node}
     */
    getChildByName: function (name) {
        var children = this._children;
        for (var i = 0; i < children.length; i++) {
            if (children[i].name === name) {
                return children[i];
            }
        }
    },

    /**
     * Get first descendant have the given name
     * @param {string} name
     * @return {clay.Node}
     */
    getDescendantByName: function (name) {
        var children = this._children;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child.name === name) {
                return child;
            } else {
                var res = child.getDescendantByName(name);
                if (res) {
                    return res;
                }
            }
        }
    },

    /**
     * Query descendant node by path
     * @param {string} path
     * @return {clay.Node}
     * @example
     *  node.queryNode('root/parent/child');
     */
    queryNode: function (path) {
        if (!path) {
            return;
        }
        // TODO Name have slash ?
        var pathArr = path.split('/');
        var current = this;
        for (var i = 0; i < pathArr.length; i++) {
            var name = pathArr[i];
            // Skip empty
            if (!name) {
                continue;
            }
            var found = false;
            var children = current._children;
            for (var j = 0; j < children.length; j++) {
                var child = children[j];
                if (child.name === name) {
                    current = child;
                    found = true;
                    break;
                }
            }
            // Early return if not found
            if (!found) {
                return;
            }
        }

        return current;
    },

    /**
     * Get query path, relative to rootNode(default is scene)
     * @param {clay.Node} [rootNode]
     * @return {string}
     */
    getPath: function (rootNode) {
        if (!this._parent) {
            return '/';
        }

        var current = this._parent;
        var path = this.name;
        while (current._parent) {
            path = current.name + '/' + path;
            if (current._parent == rootNode) {
                break;
            }
            current = current._parent;
        }
        if (!current._parent && rootNode) {
            return null;
        }
        return path;
    },

    /**
     * Depth first traverse all its descendant scene nodes.
     *
     * **WARN** Don't do `add`, `remove` operation in the callback during traverse.
     * @param {Function} callback
     * @param {Node} [context]
     */
    traverse: function (callback, context) {
        callback.call(context, this);
        var _children = this._children;
        for(var i = 0, len = _children.length; i < len; i++) {
            _children[i].traverse(callback, context);
        }
    },

    /**
     * Traverse all children nodes.
     *
     * **WARN** DON'T do `add`, `remove` operation in the callback during iteration.
     *
     * @param {Function} callback
     * @param {Node} [context]
     */
    eachChild: function (callback, context) {
        var _children = this._children;
        for(var i = 0, len = _children.length; i < len; i++) {
            var child = _children[i];
            callback.call(context, child, i);
        }
    },

    /**
     * Set the local transform and decompose to SRT
     * @param {clay.Matrix4} matrix
     */
    setLocalTransform: function (matrix) {
        mat4.copy(this.localTransform.array, matrix.array);
        this.decomposeLocalTransform();
    },

    /**
     * Decompose the local transform to SRT
     */
    decomposeLocalTransform: function (keepScale) {
        var scale = !keepScale ? this.scale: null;
        this.localTransform.decomposeMatrix(scale, this.rotation, this.position);
    },

    /**
     * Set the world transform and decompose to SRT
     * @param {clay.Matrix4} matrix
     */
    setWorldTransform: function (matrix) {
        mat4.copy(this.worldTransform.array, matrix.array);
        this.decomposeWorldTransform();
    },

    /**
     * Decompose the world transform to SRT
     * @function
     */
    decomposeWorldTransform: (function () {

        var tmp = mat4.create();

        return function (keepScale) {
            var localTransform = this.localTransform;
            var worldTransform = this.worldTransform;
            // Assume world transform is updated
            if (this._parent) {
                mat4.invert(tmp, this._parent.worldTransform.array);
                mat4.multiply(localTransform.array, tmp, worldTransform.array);
            } else {
                mat4.copy(localTransform.array, worldTransform.array);
            }
            var scale = !keepScale ? this.scale: null;
            localTransform.decomposeMatrix(scale, this.rotation, this.position);
        };
    })(),

    transformNeedsUpdate: function () {
        return this.position._dirty
            || this.rotation._dirty
            || this.scale._dirty;
    },

    /**
     * Update local transform from SRT
     * Notice that local transform will not be updated if _dirty mark of position, rotation, scale is all false
     */
    updateLocalTransform: function () {
        var position = this.position;
        var rotation = this.rotation;
        var scale = this.scale;

        if (this.transformNeedsUpdate()) {
            var m = this.localTransform.array;

            // Transform order, scale->rotation->position
            mat4.fromRotationTranslation(m, rotation.array, position.array);

            mat4.scale(m, m, scale.array);

            rotation._dirty = false;
            scale._dirty = false;
            position._dirty = false;

            this._needsUpdateWorldTransform = true;
        }
    },

    /**
     * Update world transform, assume its parent world transform have been updated
     * @private
     */
    _updateWorldTransformTopDown: function () {
        var localTransform = this.localTransform.array;
        var worldTransform = this.worldTransform.array;
        if (this._parent) {
            mat4.multiplyAffine(
                worldTransform,
                this._parent.worldTransform.array,
                localTransform
            );
        }
        else {
            mat4.copy(worldTransform, localTransform);
        }
    },

    /**
     * Update world transform before whole scene is updated.
     */
    updateWorldTransform: function () {
        // Find the root node which transform needs update;
        var rootNodeIsDirty = this;
        while (rootNodeIsDirty && rootNodeIsDirty.getParent()
            && rootNodeIsDirty.getParent().transformNeedsUpdate()
        ) {
            rootNodeIsDirty = rootNodeIsDirty.getParent();
        }
        rootNodeIsDirty.update();
    },

    /**
     * Update local transform and world transform recursively
     * @param {boolean} forceUpdateWorld
     */
    update: function (forceUpdateWorld) {
        if (this.autoUpdateLocalTransform) {
            this.updateLocalTransform();
        }
        else {
            // Transform is manually setted
            forceUpdateWorld = true;
        }

        if (forceUpdateWorld || this._needsUpdateWorldTransform) {
            this._updateWorldTransformTopDown();
            forceUpdateWorld = true;
            this._needsUpdateWorldTransform = false;
        }

        var children = this._children;
        for(var i = 0, len = children.length; i < len; i++) {
            children[i].update(forceUpdateWorld);
        }
    },

    /**
     * Get bounding box of node
     * @param  {Function} [filter]
     * @param  {clay.BoundingBox} [out]
     * @return {clay.BoundingBox}
     */
    // TODO Skinning
    getBoundingBox: (function () {
        function defaultFilter (el) {
            return !el.invisible && el.geometry;
        }
        var tmpBBox = new BoundingBox();
        var tmpMat4 = new Matrix4();
        var invWorldTransform = new Matrix4();
        return function (filter, out) {
            out = out || new BoundingBox();
            filter = filter || defaultFilter;

            if (this._parent) {
                Matrix4.invert(invWorldTransform, this._parent.worldTransform);
            }
            else {
                Matrix4.identity(invWorldTransform);
            }

            this.traverse(function (mesh) {
                if (mesh.geometry && mesh.geometry.boundingBox) {
                    tmpBBox.copy(mesh.geometry.boundingBox);
                    Matrix4.multiply(tmpMat4, invWorldTransform, mesh.worldTransform);
                    tmpBBox.applyTransform(tmpMat4);
                    out.union(tmpBBox);
                }
            }, this, defaultFilter);

            return out;
        };
    })(),

    /**
     * Get world position, extracted from world transform
     * @param  {clay.Vector3} [out]
     * @return {clay.Vector3}
     */
    getWorldPosition: function (out) {
        // PENDING
        if (this.transformNeedsUpdate()) {
            this.updateWorldTransform();
        }
        var m = this.worldTransform.array;
        if (out) {
            var arr = out.array;
            arr[0] = m[12];
            arr[1] = m[13];
            arr[2] = m[14];
            return out;
        }
        else {
            return new Vector3(m[12], m[13], m[14]);
        }
    },

    /**
     * Clone a new node
     * @return {Node}
     */
    clone: function () {
        var node = new this.constructor();

        var children = this._children;

        node.setName(this.name);
        node.position.copy(this.position);
        node.rotation.copy(this.rotation);
        node.scale.copy(this.scale);

        for (var i = 0; i < children.length; i++) {
            node.add(children[i].clone());
        }

        return node;
    },

    /**
     * Rotate the node around a axis by angle degrees, axis passes through point
     * @param {clay.Vector3} point Center point
     * @param {clay.Vector3} axis  Center axis
     * @param {number}       angle Rotation angle
     * @see http://docs.unity3d.com/Documentation/ScriptReference/Transform.RotateAround.html
     * @function
     */
    rotateAround: (function () {
        var v = new Vector3();
        var RTMatrix = new Matrix4();

        // TODO improve performance
        return function (point, axis, angle) {

            v.copy(this.position).subtract(point);

            var localTransform = this.localTransform;
            localTransform.identity();
            // parent node
            localTransform.translate(point);
            localTransform.rotate(angle, axis);

            RTMatrix.fromRotationTranslation(this.rotation, v);
            localTransform.multiply(RTMatrix);
            localTransform.scale(this.scale);

            this.decomposeLocalTransform();
            this._needsUpdateWorldTransform = true;
        };
    })(),

    /**
     * @param {clay.Vector3} target
     * @param {clay.Vector3} [up]
     * @see http://www.opengl.org/sdk/docs/man2/xhtml/gluLookAt.xml
     * @function
     */
    lookAt: (function () {
        var m = new Matrix4();
        return function (target, up) {
            m.lookAt(this.position, target, up || this.localTransform.y).invert();
            this.setLocalTransform(m);

            this.target = target;
        };
    })()
});

export default Node;

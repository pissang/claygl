define(function(require) {
    
    'use strict';

    var Base = require('./core/Base');
    var Vector3 = require('./math/Vector3');
    var Quaternion = require('./math/Quaternion');
    var Matrix4 = require('./math/Matrix4');
    var glMatrix = require('./dep/glmatrix');
    var mat4 = glMatrix.mat4;

    var nameId = 0;

    /**
     * @constructor qtek.Node
     * @extends qtek.core.Base
     */
    var Node = Base.derive(
    /** @lends qtek.Node# */
    {
        /**
         * Scene node name
         * @type {string}
         */
        name: '',

        /**
         * Position relative to its parent node. aka translation.
         * @type {qtek.math.Vector3}
         */
        position: null,
        
        /**
         * Rotation relative to its parent node. Represented by a quaternion
         * @type {qtek.math.Quaternion}
         */
        rotation: null,
        
        /**
         * Scale relative to its parent node
         * @type {qtek.math.Vector3}
         */
        scale: null,

        /**
         * Affine transform matrix relative to its root scene.
         * @type {qtek.math.Matrix4}
         */
        worldTransform: null,

        /**
         * Affine transform matrix relative to its parent node.
         * Composited with position, rotation and scale.
         * @type {qtek.math.Matrix4}
         */
        localTransform: null,
        
        /**
         * If the local transform is update from SRT(scale, rotation, translation, which is position here) each frame
         * @type {boolean}
         */
        autoUpdateLocalTransform: true,

        /**
         * Parent of current scene node
         * @type {?qtek.Node}
         * @private
         */
        _parent: null,
        /**
         * The root scene mounted. Null if it is a isolated node
         * @type {?qtek.Scene}
         * @private
         */
        _scene: null,

        _needsUpdateWorldTransform: true,

        _inIterating: false,

        // Depth for transparent queue sorting
        __depth: 0

    }, function() {

        if (!this.name) {
            this.name = 'NODE_' + (nameId++);
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
    /**@lends qtek.Node.prototype. */
    {

        /**
         * If node and its chilren visible
         * @type {boolean}
         * @memberOf qtek.Node
         * @instance
         */
        visible: true,

        /**
         * Return true if it is a renderable scene node, like Mesh and ParticleSystem
         * @return {boolean}
         */
        isRenderable: function() {
            return false;
        },

        /**
         * Set the name of the scene node
         * @param {string} name
         */
        setName: function(name) {
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
         * @param {qtek.Node} node
         */
        add: function(node) {
            if (this._inIterating) {
                console.warn('Add operation can cause unpredictable error when in iterating');
            }
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
        },

        /**
         * Remove the given child scene node
         * @param {qtek.Node} node
         */
        remove: function(node) {
            if (this._inIterating) {
                console.warn('Remove operation can cause unpredictable error when in iterating');
            }
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
         * Get the scene mounted
         * @return {qtek.Scene}
         */
        getScene: function () {
            return this._scene;
        },

        /**
         * Get parent node
         * @return {qtek.Scene}
         */
        getParent: function () {
            return this._parent;
        },

        _removeSelfFromScene: function(descendant) {
            descendant._scene.removeFromScene(descendant);
            descendant._scene = null;
        },

        _addSelfToScene: function(descendant) {
            this._scene.addToScene(descendant);
            descendant._scene = this._scene;
        },

        /**
         * Return true if it is ancestor of the given scene node
         * @param {qtek.Node} node
         */
        isAncestor: function(node) {
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
         * Get a new created array of all its children nodes
         * @return {qtek.Node[]}
         */
        children: function() {
            return this._children.slice();
        },

        childAt: function(idx) {
            return this._children[idx];
        },

        /**
         * Get first child with the given name
         * @param {string} name
         * @return {qtek.Node}
         */
        getChildByName: function(name) {
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
         * @return {qtek.Node}
         */
        getDescendantByName: function(name) {
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
         * @return {qtek.Node}
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
         * Depth first traverse all its descendant scene nodes and
         * @param {Function} callback
         * @param {Node} [context]
         * @param {Function} [ctor]
         */
        traverse: function(callback, context, ctor) {
            
            this._inIterating = true;

            if (ctor === undefined || this.constructor === ctor) {
                callback.call(context, this);
            }
            var _children = this._children;
            for(var i = 0, len = _children.length; i < len; i++) {
                _children[i].traverse(callback, context, ctor);
            }

            this._inIterating = false;
        },

        /**
         * Set the local transform and decompose to SRT
         * @param {qtek.math.Matrix4} matrix
         */
        setLocalTransform: function(matrix) {
            mat4.copy(this.localTransform._array, matrix._array);
            this.decomposeLocalTransform();
        },

        /**
         * Decompose the local transform to SRT
         */
        decomposeLocalTransform: function(keepScale) {
            var scale = !keepScale ? this.scale: null;
            this.localTransform.decomposeMatrix(scale, this.rotation, this.position);
        },

        /**
         * Set the world transform and decompose to SRT
         * @param {qtek.math.Matrix4} matrix
         */
        setWorldTransform: function(matrix) {
            mat4.copy(this.worldTransform._array, matrix._array);
            this.decomposeWorldTransform();
        },

        /**
         * Decompose the world transform to SRT
         * @method
         */
        decomposeWorldTransform: (function() { 
            
            var tmp = mat4.create();

            return function(keepScale) {
                var localTransform = this.localTransform;
                var worldTransform = this.worldTransform;
                // Assume world transform is updated
                if (this._parent) {
                    mat4.invert(tmp, this._parent.worldTransform._array);
                    mat4.multiply(localTransform._array, tmp, worldTransform._array);
                } else {
                    mat4.copy(localTransform._array, worldTransform._array);
                }
                var scale = !keepScale ? this.scale: null;
                localTransform.decomposeMatrix(scale, this.rotation, this.position);
            };
        })(),

        /**
         * Update local transform from SRT
         * Notice that local transform will not be updated if _dirty mark of position, rotation, scale is all false
         */
        updateLocalTransform: function() {
            var position = this.position;
            var rotation = this.rotation;
            var scale = this.scale;

            if (position._dirty || scale._dirty || rotation._dirty) {
                var m = this.localTransform._array;

                // Transform order, scale->rotation->position
                mat4.fromRotationTranslation(m, rotation._array, position._array);

                mat4.scale(m, m, scale._array);

                rotation._dirty = false;
                scale._dirty = false;
                position._dirty = false;

                this._needsUpdateWorldTransform = true;
            }
        },

        /**
         * Update world transform, assume its parent world transform have been updated
         */
        updateWorldTransform: function() {
            var localTransform = this.localTransform._array;
            var worldTransform = this.worldTransform._array;
            if (this._parent) {
                mat4.multiply(
                    worldTransform,
                    this._parent.worldTransform._array,
                    localTransform
                );
            } else {
                mat4.copy(worldTransform, localTransform );
            }
        },

        /**
         * Update local transform and world transform recursively
         * @param {boolean} forceUpdateWorld 
         */
        update: function(forceUpdateWorld) {
            if (this.autoUpdateLocalTransform) {
                this.updateLocalTransform();
            } else {
                // Transform is manually setted
                forceUpdateWorld = true;
            }

            if (forceUpdateWorld || this._needsUpdateWorldTransform) {
                this.updateWorldTransform();
                forceUpdateWorld = true;
                this._needsUpdateWorldTransform = false;
            }
            
            var children = this._children;
            for(var i = 0, len = children.length; i < len; i++) {
                children[i].update(forceUpdateWorld);
            }
        },

        /**
         * Get world position, extracted from world transform
         * @param  {math.Vector3} [out]
         * @return {math.Vector3}
         */
        getWorldPosition: function(out) {
            var m = this.worldTransform._array;
            if (out) {
                var arr = out._array;
                arr[0] = m[12];
                arr[1] = m[13];
                arr[2] = m[14];
                return out;
            } else {
                return new Vector3(m[12], m[13], m[14]);
            }
        },

        /**
         * Clone a new node
         * @return {Node}
         */
        clone: function() {
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
         * @param {math.Vector3} point Center point
         * @param {math.Vector3} axis  Center axis
         * @param {number}       angle Rotation angle
         * @see http://docs.unity3d.com/Documentation/ScriptReference/Transform.RotateAround.html
         * @method
         */
        rotateAround: (function() {
            var v = new Vector3();
            var RTMatrix = new Matrix4();

            // TODO improve performance
            return function(point, axis, angle) {

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
         * @param {math.Vector3} target
         * @param {math.Vector3} [up]
         * @see http://www.opengl.org/sdk/docs/man2/xhtml/gluLookAt.xml
         * @method
         */
        lookAt: (function() {
            var m = new Matrix4();
            return function(target, up) {
                m.lookAt(this.position, target, up || this.localTransform.y).invert();
                m.decomposeMatrix(null, this.rotation, this.position);
            };
        })()
    });

    return Node;
});
define(function(require) {
    
    'use strict';

    var Base = require("./core/Base");
    var util = require("./core/util");
    var Vector3 = require("./math/Vector3");
    var Quaternion = require("./math/Quaternion");
    var Matrix4 = require("./math/Matrix4");
    var Matrix3 = require("./math/Matrix3");
    var glMatrix = require('glmatrix');
    var mat4 = glMatrix.mat4;

    var Node = Base.derive(function() {

        var id = util.genGUID();

        return {
            __GUID__ : id,

            name : 'NODE_' + id,

            position : new Vector3(),

            rotation : new Quaternion(),

            scale : new Vector3(1, 1, 1),

            parent : null,
            scene : null,

            worldTransform : new Matrix4(),

            localTransform : new Matrix4(),

            autoUpdateLocalTransform : true,

            _children : [],

            _needsUpdateWorldTransform : true,

            // Depth for transparent queue sorting
            __depth : 0
        }
    }, {

        visible : true,

        isRenderable : function() {
            return false;
        },

        setName : function(name) {
            if (this.scene) {
                this.scene._nodeRepository[name] = null;
                this.scene._nodeRepository[newName] = this;
            }
            name = newName;
        },

        add : function(node) {
            if (node.parent === this) {
                return;
            }
            if (node.parent) {
                node.parent.remove(node);
            }
            node.parent = this;
            this._children.push(node);

            var scene = this.scene;

            if (scene) {
                node.traverse(function(n) {
                    scene.addToScene(n);
                    n.scene = scene;
                });
            }
        },

        remove : function(node) {
            this._children.splice(this._children.indexOf(node), 1);
            node.parent = null;

            var scene = this.scene;

            if (scene) {
                node.traverse(function(n) {
                    scene.removeFromScene(n);
                    n.scene = null;
                });
            }
        },

        children : function() {
            return this._children.slice();
        },

        childAt : function(idx) {
            return this._children[idx];
        },

        // pre-order traverse
        traverse : function(callback, parent) {
            var stopTraverse = callback(this, parent);
            if(!stopTraverse) {
                var _children = this._children;
                for(var i = 0, len = _children.length; i < len; i++) {
                    _children[i].traverse(callback, this);
                }
            }
        },

        decomposeLocalTransform : function() {
            this.localTransform.decomposeMatrix(this.scale, this.rotation, this.position);
            
            this.rotation._dirty = false;
            this.scale._dirty = false;
            this.position._dirty = false;
        },

        updateLocalTransform : function() {
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

        // Update world transform individually
        // Assume its parent world transform have been updated
        updateWorldTransform : function() {
            if (this.parent) {
                mat4.multiply(
                    this.worldTransform._array,
                    this.parent.worldTransform._array,
                    this.localTransform._array
                )
            } else {
                mat4.copy(
                    this.worldTransform._array, this.localTransform._array 
                )
            }
        },

        // Update the node status in each frame
        update : function(force) {
            if (this.autoUpdateLocalTransform) {
                this.updateLocalTransform();
            } else {
                // Transform is manually setted
                force = true;
            }

            if (force || this._needsUpdateWorldTransform) {
                this.updateWorldTransform();
                force = true;
                this._needsUpdateWorldTransform = false;
            }
            
            for(var i = 0, len = this._children.length; i < len; i++) {
                var child = this._children[i];
                // Skip the hidden nodes
                if(child.visible) {
                    child.update(force);
                }
            }
        },

        getWorldPosition : function(out) {
            var m = this.worldTransform._array;
            if (out) {
                out._array[0] = m[12];
                out._array[1] = m[13];
                out._array[2] = m[14];
                return out;
            } else {
                return new Vector3(m[12], m[13], m[14]);
            }
        },

        // http://docs.unity3d.com/Documentation/ScriptReference/Transform.RotateAround.html
        rotateAround : (function() {
            var v = new Vector3();
            var RTMatrix = new Matrix4();

            return function(point, axis, angle) {

                v.copy(this.position).subtract(point);

                this.localTransform.identity();
                // parent node
                this.localTransform.translate(point);
                this.localTransform.rotate(angle, axis);

                RTMatrix.fromRotationTranslation(this.rotation, v);
                this.localTransform.multiply(RTMatrix);
                this.localTransform.scale(this.scale);

                this.decomposeLocalTransform();
                this._needsUpdateWorldTransform = true;
            }
            
        })(),

        lookAt : (function() {
            var m = new Matrix4();
            var scaleVector = new Vector3();
            return function(target, up) {
                m.lookAt(this.position, target, up || this.localTransform.up).invert();
                m.decomposeMatrix(scaleVector, this.rotation, this.position);
            }
        })()
    });

    return Node;
})
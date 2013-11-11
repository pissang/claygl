define(function(require) {
    
    'use strict';

    var Base = require("core/Base");
    var Vector3 = require("core/Vector3");
    var BoundingBox = require("./BoundingBox");
    var Quaternion = require("core/Quaternion");
    var Matrix4 = require("core/Matrix4");
    var Matrix3 = require("core/Matrix3");
    var glMatrix = require('glmatrix');
    var mat4 = glMatrix.mat4;
    var util = require("util/util");

    var Node = Base.derive(function() {

        var id = util.genGUID();

        return {
            __GUID__ : id,

            name : 'NODE_' + id,

            visible : true,

            position : new Vector3(),

            rotation : new Quaternion(),

            scale : new Vector3(1, 1, 1),

            // Euler angles
            // https://en.wikipedia.org/wiki/Rotation_matrix
            eulerAngle : new Vector3(),
            useEuler : false,

            parent : null,
            scene : null,

            worldTransform : new Matrix4(),

            localTransform : new Matrix4(),

            autoUpdateLocalTransform : true,

            boundingBox : new BoundingBox(),

            _children : [],
            _needsUpdateWorldTransform : true,
            // Its for transparent queue sorting
            _depth : 0
        }
    }, {

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
            if(! this.useEuler) {
                this.eulerAngle.setEulerFromQuaternion(this.rotation);
            }
            
            this.rotation._dirty = false;
            this.scale._dirty = false;
            this.position._dirty = false;
            this.eulerAngle._dirty = false;
        },

        updateLocalTransform : function() {
            var position = this.position;
            var rotation = this.rotation;
            var scale = this.scale;
            var eulerAngle = this.eulerAngle;

            var needsUpdate = false;
            if (position._dirty || scale._dirty) {
                needsUpdate = true;
            } else {
                if (this.useEuler && eulerAngle._dirty) {
                    needsUpdate = true;
                } else if (rotation._dirty) {
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                var m = this.localTransform._array;

                if(this.useEuler) {
                    rotation.identity();
                    rotation.rotateZ(eulerAngle.z);
                    rotation.rotateY(eulerAngle.y);
                    rotation.rotateX(eulerAngle.x);
                    eulerAngle._dirty = false;
                }
                // Transform order, scale->rotation->position
                mat4.fromRotationTranslation(m, rotation._array, position._array);

                mat4.scale(m, m, scale._array);

                rotation._dirty = false;
                scale._dirty = false;
                position._dirty = false;

                this._needsUpdateWorldTransform = true;
            }
        },

        // Update the node status in each frame
        update : function(force) {
            
            this.trigger('beforeupdate', [this]);

            if (this.autoUpdateLocalTransform) {
                this.updateLocalTransform();
            } else {
                // Transform is manually setted
                force = true;
            }

            if (force || this._needsUpdateWorldTransform) {
                if (this.parent) {
                    mat4.multiply(
                        this.worldTransform._array,
                        this.parent.worldTransform._array,
                        this.localTransform._array
                    );
                }
                else {
                    mat4.copy(this.worldTransform._array, this.localTransform._array);
                }
                force = true;
                this._needsUpdateWorldTransform = false;
            }
            
            for(var i = 0; i < this._children.length; i++) {
                var child = this._children[i];
                // Skip the hidden nodes
                if(child.visible) {
                    child.update(force);
                }
            }

            this.trigger('afterupdate', [this]);
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

                // Transform self
                if(this.useEuler) {
                    this.rotation.identity();
                    this.rotation.rotateZ(this.eulerAngle.z);
                    this.rotation.rotateY(this.eulerAngle.y);
                    this.rotation.rotateX(this.eulerAngle.x);
                }
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
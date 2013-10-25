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
    var _ = require("_");

    var _repository = {};

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

            // Its for transparent queue sorting
            _depth : 0
        }
    }, function() {
        // In case multiple nodes use the same vector and 
        // have problem in dirty checking
        var position = this.position;
        var rotation = this.rotation;
        var scale = this.scale;
        var name = this.name;
        Object.defineProperty(this, 'position', {
            set : function(v) {
                position.copy(v);
            },
            get : function() {
                return position;
            }
        });
        Object.defineProperty(this, 'rotation', {
            set : function(v) {
                rotation.copy(v);
            },
            get : function() {
                return rotation;
            }
        });
        Object.defineProperty(this, 'scale', {
            set : function(v) {
                scale.copy(v);
            },
            get : function() {
                return scale;
            }
        });
        Object.defineProperty(this, 'name', {
            set : function(newName) {
                if (this.scene) {
                    this.scene._nodeRepository[name] = null;
                    this.scene._nodeRepository[newName] = this;
                }
                name = newName;
            },
            get : function() {
                return name;
            }
        })
    }, {

        add : function(node) {
            if(this._children.indexOf(node) >= 0) {
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
            // get the copy of children array
            return this._children.slice();
        },

        childAt : function(idx) {
            return this._children[idx];
        },

        findScene : function() {
            var root = this;
            while(root.parent) {
                root = root.parent;
            }
            if (root.addToScene) {
                this._scene = root;
                return root;
            }
        },

        // pre-order traverse
        traverse : function(callback, parent) {
            var stopTraverse = callback && callback(this, parent);
            if(! stopTraverse) {
                var _children = this._children;
                for(var i = 0, len = _children.length; i < len; i++) {
                    _children[i].traverse(callback, this);
                }
            }
        },

        updateLocalTransform : function() {
            if (! this.position._dirty &&
                ! this.scale._dirty) {
                if (this.useEuler && ! this.eulerAngle._dirty) {
                    return;
                } else if(! this.rotation._dirty) {
                    return;
                }
            }

            var m = this.localTransform;

            m.identity();

            if(this.useEuler) {
                this.rotation.identity();
                this.rotation.rotateZ(this.eulerAngle.z);
                this.rotation.rotateY(this.eulerAngle.y);
                this.rotation.rotateX(this.eulerAngle.x);
            }
            // Transform order, scale->rotation->position
            m.fromRotationTranslation(this.rotation, this.position);

            m.scale(this.scale);

            this.rotation._dirty = false;
            this.scale._dirty = false;
            this.position._dirty = false;
            this.eulerAngle._dirty = false;
        },

        decomposeMatrix : function() {
            this.localTransform.decomposeMatrix(this.scale, this.rotation, this.position);
            if(! this.useEuler) {
                this.eulerAngle.setEulerFromQuaternion(this.rotation);
            }
            
            this.rotation._dirty = false;
            this.scale._dirty = false;
            this.position._dirty = false;
            this.eulerAngle._dirty = false;
        },

        updateWorldTransform : function() {
            if (this.autoUpdateLocalTransform) {
                this.updateLocalTransform();
            }
            if(this.parent) {
                mat4.multiply(
                    this.worldTransform._array,
                    this.parent.worldTransform._array,
                    this.localTransform._array
                );
            }else{
                this.worldTransform.copy(this.localTransform);
            }
        },
        
        // Update the node status in each frame
        update : function(silent) {

            if(! silent) {
                this.trigger('beforeupdate', this);
            }
            this.updateWorldTransform();
            
            for(var i = 0; i < this._children.length; i++) {
                var child = this._children[i];
                // Skip the hidden nodes
                if(child.visible) {
                    child.update();
                }
            }
            
            if(! silent) {
                this.trigger('afterupdate', this);
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

        translate : function(v) {
            this.updateLocalTransform();
            this.translate(v);
            this.decomposeMatrix();
        },

        rotate : function(angle, axis) {
            this.updateLocalTransform();
            this.localTransform.rotate(angle, axis);
            this.decomposeMatrix();
        },
        // http://docs.unity3d.com/Documentation/ScriptReference/Transform.RotateAround.html
        rotateAround : (function() {
            
            var v = new Vector3();
            var RTMatrix = new Matrix4();

            return function(point, axis, angle) {

                v.copy(this.position).subtract(point);

                this.localTransform.identity();
                // parent joint
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

                this.decomposeMatrix();
            }
        })(),

        lookAt : (function() {
            var m = new Matrix4();
            var scaleVector = new Vector3();
            return function(target, up) {
                m.lookAt(this.position, target, up || this.localTransform.up).invert();
                m.decomposeMatrix(scaleVector, this.rotation, this.position);
            }
        })(),

    });

    return Node;
})
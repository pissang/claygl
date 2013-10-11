define(function(require) {
    
    'use strict';

    var Base = require("core/base");
    var Vector3 = require("core/vector3");
    var BoundingBox = require("./boundingbox");
    var Quaternion = require("core/quaternion");
    var Matrix4 = require("core/matrix4");
    var Matrix3 = require("core/matrix3");
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

            children : [],

            parent : null,

            worldTransform : new Matrix4(),

            localTransform : new Matrix4(),

            autoUpdateLocalTransform : true,

            boundingBox : new BoundingBox()
        }
    }, function() {
        // Prevent multiple nodes use the same vector and 
        // have problem in dirty checking
        var position = this.position;
        var rotation = this.rotation;
        var scale = this.scale;
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
    }, {

        add : function(node) {
            if(this.children.indexOf(node) >= 0) {
                return;
            }
            this.children.push(node);
            node.parent = this;

            var scene = this.getScene();

            if (scene) {
                node.traverse(function(n) {
                    scene.addToScene(n);
                });   
            }
        },

        remove : function(node) {
            _.without(this.children, node);
            node.parent = null;

            var scene = this.getScene();

            if (scene) {
                node.traverse(function(n) {
                    scene.removeFromScene(n);
                });
            }
        },

        getScene : function() {
            var root = this;
            while(root.parent) {
                root = root.parent;
            }
            if (root.addToScene) {
                return root;
            }
        },

        // pre-order traverse
        traverse : function(callback, parent) {
            var stopTraverse = callback && callback(this, parent);
            if(! stopTraverse) {
                var children = this.children;
                for(var i = 0, len = children.length; i < len; i++) {
                    children[i].traverse(callback, this);
                }
            }
        },

        updateLocalTransform : function() {
            // TODO 
            // use defineSetter to set dirty when the position, rotation, scale is changed ??
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
                this.worldTransform.copy(this.parent.worldTransform).multiply(this.localTransform);
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
            
            for(var i = 0; i < this.children.length; i++) {
                var child = this.children[i];
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
define(function(require) {

    var Base = require("core/Base");
    var Matrix4 = require("core/Matrix4");

    var Skeleton = Base.derive(function() {
        return {
            // Root joints
            roots : [],
            joints : [],
            // Poses stored in arrays

            // Matrix to joint space(inverse of indentity bone world matrix)
            _jointMatrices : [],

            // jointMatrix * currentPoseMatrix
            // worldTransform is relative to the root bone
            // still in model space not world space
            _invBindMatrices : [],

            _invBindMatricesArray : null,
            _subInvBindMatricesArray : {}
        }
    }, {

        updateHierarchy : function() {
            this.roots = [];
            var joints = this.joints;
            for (var i = 0; i < joints.length; i++) {
                var bone = joints[i];
                if (bone.parentIndex >= 0) {
                    var parent = joints[bone.parentIndex];
                    parent.add(bone);
                }else{
                    this.roots.push(bone);
                }
            }
        },

        updateJointMatrices : function() {
            for (var i = 0; i < this.roots.length; i++) {
                this.roots[i].update();
            }
            for (var i = 0; i < this.joints.length; i++) {
                var bone = this.joints[i];
                this._jointMatrices[i] = (new Matrix4()).copy(bone.worldTransform).invert();
                this._invBindMatrices[i] = new Matrix4();
            }
        },

        update : function() {
            for (var i = 0; i < this.roots.length; i++) {
                this.roots[i].update();
            }
            if (! this._invBindMatricesArray) {
                this._invBindMatricesArray = new Float32Array(this.joints.length * 16);
            }
            var cursor = 0;
            for (var i = 0; i < this.joints.length; i++) {
                var matrixCurrentPose = this.joints[i].worldTransform;
                this._invBindMatrices[i].copy(matrixCurrentPose).multiply(this._jointMatrices[i]);

                for (var j = 0; j < 16; j++) {
                    var array = this._invBindMatrices[i]._array;
                    this._invBindMatricesArray[cursor++] = array[j];
                }
            }
        },

        getSubInvBindMatrices : function(meshId, joints) {
            var subArray = this._subInvBindMatricesArray[meshId]
            if (!subArray) {
                subArray 
                    = this._subInvBindMatricesArray[meshId]
                    = new Float32Array(joints.length * 16);
            }
            var cursor = 0;
            for (var i = 0; i < joints.length; i++) {
                var idx = joints[i];
                for (var j = 0; j < 16; j++) {
                    subArray[cursor++] = this._invBindMatricesArray[idx * 16 + j];
                }
            }
            return subArray;
        },

        setPose : function(time) {
            for (var i = 0; i < this.joints.length; i++) {
                this.joints[i].setPose(time);
            }
            this.update();
        },

        getClipTime : function() {
            var poses = this.joints[0].poses;
            if (poses.length) {
                return poses[poses.length-1].time;
            }
        },
        
        getBoneNumber : function() {
            return this.joints.length;
        }
    });

    return Skeleton;
})
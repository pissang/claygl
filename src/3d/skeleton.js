define(function(require) {

    var Base = require("core/base");
    var Matrix4 = require("core/matrix4");

    var Skeleton = Base.derive(function() {
        return {
            // Root joints
            roots : [],
            joints : [],
            // Poses stored in arrays

            // Matrix to joint space(inverse of indentity bone world matrix)
            _jointMatrices : [],

            // jointMatrix * currentPoseMatrix
            // worldMatrix is relative to the root bone
            // still in model space not world space
            _invBindMatrices : [],

            _invBindMatricesArray : null
        }
    }, function() {
        this.updateHierarchy();
        this.updateJointMatrices();
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
                this._jointMatrices[i] = (new Matrix4()).copy(bone.worldMatrix).invert();
                this._invBindMatrices[i] = new Matrix4();
            }
        },

        update : function() {
            for (var i = 0; i < this.roots.length; i++) {
                this.roots[i].update();
            }
            var invBindMatricesArray = this.getInvBindMatricesArray();
            var cursor = 0;
            for (var i = 0; i < this.joints.length; i++) {
                var matrixCurrentPose = this.joints[i].worldMatrix;
                this._invBindMatrices[i].copy(matrixCurrentPose).multiply(this._jointMatrices[i]);

                for (var j = 0; j < 16; j++) {
                    var array = this._invBindMatrices[i]._array;
                    invBindMatricesArray[cursor++] = array[j];
                }
            }
        },

        getInvBindMatricesArray : function() {
            if (! this._invBindMatricesArray) {
                this._invBindMatricesArray = new Float32Array(this.joints.length * 16);
            }
            return this._invBindMatricesArray;
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
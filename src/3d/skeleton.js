define(function(require) {

    var Base = require("core/base");
    var Matrix4 = require("core/matrix4");

    var Skeleton = Base.derive(function() {
        return {
            // Root bones
            roots : [],
            bones : [],
            // Poses stored in arrays

            // Matrix to joint space(inverse of indentity bone world matrix)
            _jointMatrices : [],

            // jointMatrix * currentPoseMatrix
            // worldMatrix is relative to the root bone
            // still in model space not world space
            _boneMatrices : [],

            _boneMatricesArray : null
        }
    }, function() {
        this.updateHierarchy();
        this.updateJointMatrices();
    }, {

        updateHierarchy : function() {
            this.roots = [];
            var bones = this.bones;
            for (var i = 0; i < bones.length; i++) {
                var bone = bones[i];
                if (bone.parentIndex >= 0) {
                    var parent = bones[bone.parentIndex];
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
            for (var i = 0; i < this.bones.length; i++) {
                var bone = this.bones[i];
                this._jointMatrices[i] = (new Matrix4()).copy(bone.worldMatrix).invert();
                this._boneMatrices[i] = new Matrix4();
            }
        },

        update : function() {
            for (var i = 0; i < this.roots.length; i++) {
                this.roots[i].update();
            }
            var boneMatricesArray = this.getBoneMatricesArray();
            var cursor = 0;
            for (var i = 0; i < this.bones.length; i++) {
                var matrixCurrentPose = this.bones[i].worldMatrix;
                this._boneMatrices[i].copy(matrixCurrentPose).multiply(this._jointMatrices[i]);

                for (var j = 0; j < 16; j++) {
                    var array = this._boneMatrices[i]._array;
                    boneMatricesArray[cursor++] = array[j];
                }
            }
        },

        getBoneMatricesArray : function() {
            if (! this._boneMatricesArray) {
                this._boneMatricesArray = new Float32Array(this.bones.length * 16);
            }
            return this._boneMatricesArray;
        },

        setPose : function(time) {
            for (var i = 0; i < this.bones.length; i++) {
                this.bones[i].setPose(time);
            }
            this.update();
        },

        getClipTime : function() {
            var poses = this.bones[0].poses;
            if (poses.length) {
                return poses[poses.length-1].time;
            }
        }
    });

    return Skeleton;
})
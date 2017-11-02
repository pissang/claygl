import Base from './core/Base';
import Joint from './Joint';

import glMatrix from './dep/glmatrix';
var quat = glMatrix.quat;
var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;

/**
 * @constructor qtek.Skeleton
 */
var Skeleton = Base.extend(function () {
    return /** @lends qtek.Skeleton# */{

        /**
         * Relative root node that not affect transform of joint.
         * @type {qtek.Node}
         */
        relativeRootNode: null,
        /**
         * @type {string}
         */
        name: '',

        /**
         * joints
         * @type {Array.<qtek.Joint>}
         */
        joints: [],

        _clips: [],

        // Matrix to joint space (relative to root joint)
        _invBindPoseMatricesArray: null,

        // Use subarray instead of copy back each time computing matrix
        // http://jsperf.com/subarray-vs-copy-for-array-transform/5
        _jointMatricesSubArrays: [],

        // jointMatrix * currentPoseMatrix
        // worldTransform is relative to the root bone
        // still in model space not world space
        _skinMatricesArray: null,

        _skinMatricesSubArrays: [],

        _subSkinMatricesArray: {}
    };
},
/** @lends qtek.Skeleton.prototype */
{

    /**
     * Add a skinning clip and create a map between clip and skeleton
     * @param {qtek.animation.SkinningClip} clip
     * @param {Object} [mapRule] Map between joint name in skeleton and joint name in clip
     */
    addClip: function (clip, mapRule) {
        // Clip have been exists in
        for (var i = 0; i < this._clips.length; i++) {
            if (this._clips[i].clip === clip) {
                return;
            }
        }
        // Map the joint index in skeleton to joint pose index in clip
        var maps = [];
        for (var i = 0; i < this.joints.length; i++) {
            maps[i] = -1;
        }
        // Create avatar
        for (var i = 0; i < clip.tracks.length; i++) {
            for (var j = 0; j < this.joints.length; j++) {
                var joint = this.joints[j];
                var track = clip.tracks[i];
                var jointName = joint.name;
                if (mapRule) {
                    jointName = mapRule[jointName];
                }
                if (track.name === jointName) {
                    maps[j] = i;
                    break;
                }
            }
        }

        this._clips.push({
            maps: maps,
            clip: clip
        });

        return this._clips.length - 1;
    },

    /**
     * @param {qtek.animation.SkinningClip} clip
     */
    removeClip: function (clip) {
        var idx = -1;
        for (var i = 0; i < this._clips.length; i++) {
            if (this._clips[i].clip === clip) {
                idx = i;
                break;
            }
        }
        if (idx > 0) {
            this._clips.splice(idx, 1);
        }
    },
    /**
     * Remove all clips
     */
    removeClipsAll: function () {
        this._clips = [];
    },

    /**
     * Get clip by index
     * @param  {number} index
     */
    getClip: function (index) {
        if (this._clips[index]) {
            return this._clips[index].clip;
        }
    },

    /**
     * @return {number}
     */
    getClipNumber: function () {
        return this._clips.length;
    },

    /**
     * Calculate joint matrices from node transform
     * @method
     */
    updateJointMatrices: (function () {

        var m4 = mat4.create();

        return function () {
            this._invBindPoseMatricesArray = new Float32Array(this.joints.length * 16);
            this._skinMatricesArray = new Float32Array(this.joints.length * 16);

            for (var i = 0; i < this.joints.length; i++) {
                var joint = this.joints[i];
                // if (this.relativeRootNode) {
                //     mat4.invert(m4, this.relativeRootNode.worldTransform._array);
                //     mat4.multiply(
                //         m4,
                //         m4,
                //         joint.node.worldTransform._array
                //     );
                //     mat4.invert(m4, m4);
                // }
                // else {
                    mat4.copy(m4, joint.node.worldTransform._array);
                    mat4.invert(m4, m4);
                // }

                var offset = i * 16;
                for (var j = 0; j < 16; j++) {
                    this._invBindPoseMatricesArray[offset + j] = m4[j];
                }
            }

            this.updateMatricesSubArrays();
        };
    })(),

    setJointMatricesArray: function (arr) {
        this._invBindPoseMatricesArray = arr;
        this._skinMatricesArray = new Float32Array(arr.length);
        this.updateMatricesSubArrays();
    },

    updateMatricesSubArrays: function () {
        for (var i = 0; i < this.joints.length; i++) {
            this._jointMatricesSubArrays[i] = this._invBindPoseMatricesArray.subarray(i * 16, (i+1) * 16);
            this._skinMatricesSubArrays[i] = this._skinMatricesArray.subarray(i * 16, (i+1) * 16);
        }
    },

    /**
     * Update skinning matrices
     */
    update: (function () {
        // var m4 = mat4.create();
        return function () {
            for (var i = 0; i < this.joints.length; i++) {
                var joint = this.joints[i];
                mat4.multiply(
                    this._skinMatricesSubArrays[i],
                    joint.node.worldTransform._array,
                    this._jointMatricesSubArrays[i]
                );

                // Joint space is relative to root, if have
                // if (this.relativeRootNode) {
                //     mat4.invert(m4, this.relativeRootNode.worldTransform._array);
                //     mat4.multiply(
                //         this._skinMatricesSubArrays[i],
                //         m4,
                //         this._skinMatricesSubArrays[i]
                //     );
                // }
            }
        };
    })(),

    getSubSkinMatrices: function (meshId, joints) {
        var subArray = this._subSkinMatricesArray[meshId];
        if (!subArray) {
            subArray
                = this._subSkinMatricesArray[meshId]
                = new Float32Array(joints.length * 16);
        }
        var cursor = 0;
        for (var i = 0; i < joints.length; i++) {
            var idx = joints[i];
            for (var j = 0; j < 16; j++) {
                subArray[cursor++] = this._skinMatricesArray[idx * 16 + j];
            }
        }
        return subArray;
    },

    /**
     * Set pose and update skinning matrices
     * @param {number} clipIndex
     */
    setPose: function (clipIndex) {
        if (this._clips[clipIndex]) {
            var clip = this._clips[clipIndex].clip;
            var maps = this._clips[clipIndex].maps;

            for (var i = 0; i < this.joints.length; i++) {
                var joint = this.joints[i];
                if (maps[i] === -1) {
                    continue;
                }
                var pose = clip.tracks[maps[i]];

                // Not update if there is no data.
                // PENDING If sync pose.position, pose.rotation, pose.scale
                if (pose.channels.position) {
                    vec3.copy(joint.node.position._array, pose.position);
                }
                if (pose.channels.rotation) {
                    quat.copy(joint.node.rotation._array, pose.rotation);
                }
                if (pose.channels.scale) {
                    vec3.copy(joint.node.scale._array, pose.scale);
                }

                joint.node.position._dirty = true;
                joint.node.rotation._dirty = true;
                joint.node.scale._dirty = true;
            }
        }
        this.update();
    },

    clone: function (rootNode, newRootNode) {
        var skeleton = new Skeleton();
        skeleton.name = this.name;

        for (var i = 0; i < this.joints.length; i++) {
            var newJoint = new Joint();
            newJoint.name = this.joints[i].name;
            newJoint.index = this.joints[i].index;

            var path = this.joints[i].node.getPath(rootNode);
            var rootNodePath = this.joints[i].rootNode.getPath(rootNode);

            if (path != null && rootNodePath != null) {
                newJoint.node = newRootNode.queryNode(path);
            }
            else {
                // PENDING
                console.warn('Something wrong in clone, may be the skeleton root nodes is not mounted on the cloned root node.')
            }
            skeleton.joints.push(newJoint);
        }

        if (this._invBindPoseMatricesArray) {
            var len = this._invBindPoseMatricesArray.length;
            skeleton._invBindPoseMatricesArray = new Float32Array(len);
            for (var i = 0; i < len; i++) {
                skeleton._invBindPoseMatricesArray[i] = this._invBindPoseMatricesArray[i];
            }

            skeleton._skinMatricesArray = new Float32Array(len);

            skeleton.updateMatricesSubArrays();
        }

        skeleton.update();

        return skeleton;
    }
});

export default Skeleton;

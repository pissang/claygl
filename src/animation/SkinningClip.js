define(function(require) {

    var Clip = require('./Clip');

    var glMatrix = require("glmatrix");
    var quat = glMatrix.quat;
    var vec3 = glMatrix.vec3;

    var Vector3 = require("../math/Vector3");
    var Quaternion = require("../math/Quaternion");

    var JointPose = function(keyFrames) {
        //{
        //  time : //ms
        //  position : 
        //  rotation :
        //  scale :
        //}
        this.keyFrames = keyFrames;

        this.position = new Vector3();
        this.rotation = new Quaternion();
        this.scale = new Vector3(1, 1, 1);

        this._cacheKey = 0;
        this._cacheTime = 0;
    }

    JointPose.prototype.setPose = function(time) {
        this._interpolateField(time, 'position');
        this._interpolateField(time, 'rotation');
        this._interpolateField(time, 'scale');   
    }

    JointPose.prototype._interpolateField = function(time, fieldName) {
        var kfs = this.keyFrames;
        var len = kfs.length;
        var start;
        var end;

        if (time < this._cacheTime) {
            var s = this._cacheKey >= len-1 ? len-1 : this._cacheKey+1;
            for (var i = s; i >= 0; i--) {
                if (kfs[i].time <= time && kfs[i][fieldName]) {
                    start = kfs[i];
                    this._cacheKey = i;
                    this._cacheTime = time;
                } else if (kfs[i][fieldName]) {
                    end = kfs[i];
                    break;
                }
            }
        } else {
            for (var i = this._cacheKey; i < len; i++) {
                if (kfs[i].time <= time && kfs[i][fieldName]) {
                    start = kfs[i];
                    this._cacheKey = i;
                    this._cacheTime = time;
                } else if (kfs[i][fieldName]) {
                    end = kfs[i];
                    break;
                }
            }
        }

        if (start && end) {
            var percent = (time-start.time) / (end.time-start.time);
            percent = Math.max(Math.min(percent, 1), 0);
            if (fieldName === "rotation") {
                quat.slerp(this[fieldName]._array, start[fieldName]._array, end[fieldName]._array, percent);
            } else {
                vec3.lerp(this[fieldName]._array, start[fieldName]._array, end[fieldName]._array, percent);
            }
        } else {
            this._cacheKey = 0;
            this._cacheTime = 0;
        }
    }

    var SkinningClip = function(options) {

        Clip.call(this, options);

        this.jointPoses = [];

        if (options.jointPoses && options.jointPoses.length > 0) {    
            for (var j = 0; j < options.jointPoses.length; j++) {
                var jointPoseCfg = options.jointPoses[j];
                this.jointPoses[j] = new JointPose(jointPoseCfg.keyFrames);
            }

            var kfs = options.jointPoses[0].keyFrames;
            if (kfs.length) {
                this._life = kfs[kfs.length-1].time;
            }
        }
    }

    SkinningClip.prototype = Object.create(Clip.prototype);

    SkinningClip.prototype.constructor = SkinningClip;

    SkinningClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            var deltaTime = time - this._startTime;
            for (var i = 0; i < this.jointPoses.length; i++) {
                this.jointPoses[i].setPose(deltaTime);
            }
        }
    }

    SkinningClip.prototype.getSubClip = function(time) {

    }

    return SkinningClip;
});
define(function(require) {

    'use strict';

    var Clip = require('./Clip');

    var TransformClip = require('./TransformClip');

    var glMatrix = require("glmatrix");
    var quat = glMatrix.quat;
    var vec3 = glMatrix.vec3;

    var SkinningClip = function(options) {

        options = options || {};

        this.name = options.name || '';

        Clip.call(this, options);

        this.jointClips = [];

        this.life = 0;
        if (options.jointClips && options.jointClips.length > 0) {    
            for (var j = 0; j < options.jointClips.length; j++) {
                var jointPoseCfg = options.jointClips[j];
                var jointClip = new TransformClip({
                    keyFrames : jointPoseCfg.keyFrames
                });
                jointClip.name = jointPoseCfg.name || '';
                this.jointClips[j] = jointClip;

                this.life = Math.max(jointClip.life, this.life);
            }
        }
    }

    SkinningClip.prototype = Object.create(Clip.prototype);

    SkinningClip.prototype.constructor = SkinningClip;

    SkinningClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            this.setTime(this._elapsedTime);
        }

        return ret;
    }

    SkinningClip.prototype.setTime = function(time) {
        for (var i = 0; i < this.jointClips.length; i++) {
            this.jointClips[i].setTime(time);
        }
    }

    SkinningClip.prototype.addJointClip = function(jointClip) {
        this.jointClips.push(jointClip);
        this.life = Math.max(jointClip.life, this.life);
    }

    SkinningClip.prototype.removeJointClip = function(jointClip) {
        this.jointClips.splice(this.jointClips.indexOf(jointClip), 1);
    }

    SkinningClip.prototype.getSubClip = function(startTime, endTime, isLoop) {
        var subClip = new SkinningClip({
            name : this.name
        });

        for (var i = 0; i < this.jointClips.length; i++) {
            var subJointClip = this.jointClips[i].getSubClip(startTime, endTime);
            subClip.addJointClip(subJointClip);
        }

        if (isLoop !== undefined) {
            subClip.setLoop(isLoop);
        }

        return subClip; 
    }

    SkinningClip.prototype.blend1D = function(clip1, clip2, w) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var c1 = clip1.jointClips[i];
            var c2 = clip2.jointClips[i];
            var tClip = this.jointClips[i];

            tClip.blend1D(c1, c2, w);
        }
    }

    SkinningClip.prototype.additiveBlend = function(clip1, clip2) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var c1 = clip1.jointClips[i];
            var c2 = clip2.jointClips[i];
            var tClip = this.jointClips[i];

            tClip.additiveBlend(c1, c2);
        }
    }

    SkinningClip.prototype.subtractiveBlend = function(clip1, clip2) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var c1 = clip1.jointClips[i];
            var c2 = clip2.jointClips[i];
            var tClip = this.jointClips[i];

            tClip.subtractiveBlend(c1, c2);
        }
    }

    SkinningClip.prototype.blend2D = function(clip1, clip2, clip3, f, g) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var c1 = clip1.jointClips[i];
            var c2 = clip2.jointClips[i];
            var c3 = clip3.jointClips[i];
            var tClip = this.jointClips[i];

            tClip.blend2D(c1, c2, c3, f, g);
        }
    }

    SkinningClip.prototype.copy = function(clip) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var sClip = clip.jointClips[i];
            var tClip = this.jointClips[i];

            vec3.copy(tClip.position, sClip.position);
            vec3.copy(tClip.scale, sClip.scale);
            quat.copy(tClip.rotation, sClip.rotation);
        }
    }

    return SkinningClip;
});
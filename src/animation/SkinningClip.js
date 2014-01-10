define(function(require) {

    'use strict';

    var Clip = require('./Clip');

    var TransformClip = require('./TransformClip');

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
            var deltaTime = time - this._startTime;
            this.setTime(deltaTime);
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

    return SkinningClip;
});
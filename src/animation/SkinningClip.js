define(function(require) {

    var Clip = require('./Clip');

    var TransformClip = require('./TransformClip');

    var SkinningClip = function(options) {

        this.name = options.name

        Clip.call(this, options);

        this.jointClips = [];

        if (options.jointClips && options.jointClips.length > 0) {    
            for (var j = 0; j < options.jointClips.length; j++) {
                var jointPoseCfg = options.jointClips[j];
                var jointClip = new TransformClip({
                    keyFrames : jointPoseCfg.keyFrames
                });
                jointClip.name = jointPoseCfg.name || '';
                this.jointClips[j] = jointClip;
            }

            var kfs = options.jointClips[0].keyFrames;
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
            for (var i = 0; i < this.jointClips.length; i++) {
                this.jointClips[i].setTime(deltaTime);
            }
        }
    }

    return SkinningClip;
});
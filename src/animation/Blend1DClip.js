// 1D Blend clip of blend tree
// http://docs.unity3d.com/Documentation/Manual/1DBlending.html
define(function(require) {

    var Clip = require('./Clip');

    var clipSortFunc = function(a, b) {
        return a.position < b.position;
    }

    var Blend1DClip = function(opts) {

        opts = opts || {};

        Clip.call(this, opts);

        this.output = opts.output || null;
        // 
        // {
        //  position : 
        //  clip : 
        // }
        this.inputs = opts.inputs || [];

        this.position = 0;

        this._cacheKey = 0;
        this._cachePosition = -Infinity;

        this.inputs.sort(clipSortFunc);
    }

    Blend1DClip.prototype = new Clip();
    Blend1DClip.prototype.constructor = Blend1DClip;

    Blend1DClip.prototype.addInput = function(position, inputClip) {
        var obj = {
            position : position,
            clip : inputClip
        }
        if (!this.inputs.length) {
            this.inputs.push(obj);
            return;
        }
        var len = this.inputs.length;
        if (this.inputs[0].position > position) {
            this.inputs.unshift(obj);
        } else if (this.inputs[len - 1].position <= position) {
            this.inputs.push(obj);
        } else {
            var key = this._findKey(position);
            this.inputs.splice(key, obj);
        }

        this.life = Math.max(inputClip.life, this.life);
    }

    Blend1DClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            var deltaTime = time - this._startTime;
            this.setTime(deltaTime);
        }

        return ret;
    }

    Blend1DClip.prototype.setTime = function(time) {
        var position = this.position;
        var inputs = this.inputs;
        var len = inputs.length;
        var min = inputs[0].position;
        var max = inputs[len-1].position;

        if (position <= min) {
            var clip = inputs[0].clip;
            clip.setTime(time % clip.life);
            this.output.copy(clip);
        } else if (position >= max) {
            var clip = inputs[len-1].clip;
            clip.setTime(time % clip.life);
            this.output.copy(clip);
        } else {
            var key = this._findKey(position);
            var input1 = inputs[key];
            var input2 = inputs[key + 1];
            var clip1 = input1.clip;
            var clip2 = input2.clip;
            clip1.setTime(time % clip1.life);
            clip2.setTime(time % clip2.life);

            var w = (this.position - input1.position) / (input2.position - input1.position);
            this.output.blend1D(clip1, clip2, w);
        }
    }

    // Find the key where position in range [inputs[key].position, inputs[key+1].position)
    Blend1DClip.prototype._findKey = function(position) {
        var key = -1;
        var inputs = this.inputs;
        var len = inputs.length;
        if (this._cachePosition < position) {
            for (var i = this._cacheKey; i < len-1; i++) {
                if (position >= inputs[i].position && position < inputs[i+1].position) {
                    key = i;
                }
            }
        } else {
            var s = Math.min(len-2, this._cacheKey);
            for (var i = s; i >= 0; i--) {
                if (position >= inputs[i].position && position < inputs[i+1].position) {
                    key = i;
                }
            }
        }
        if (key >= 0) {
            this._cacheKey = key;
            this._cachePosition = position;
        }

        return key;
    }

    return Blend1DClip;
});
// 2D Blend clip of blend tree
// http://docs.unity3d.com/Documentation/Manual/1DBlending.html
define(function(require) {

    var Clip = require('./Clip');

    var glMatrix = require("glmatrix");
    var quat = glMatrix.quat;
    var vec3 = glMatrix.vec3;

    var clipSortFunc = function(a, b) {
        return a.position < b.position;
    }

    var Blend2DClip = function(opts) {

        Clip.call(this, opts);

        this.output = opts.output || null;

        // {
        //  position : 
        //  clip : 
        // }
        this.inputs = opts.inputs || [];

        this.position = 0;

        this._cacheKey = 0;
        this._cacheBlend = 0;

        this.inputs.sort(clipSortFunc);
    }

    Blend2DClip.prototype = new Clip();
    Blend2DClip.prototype.constructor = Blend2DClip;

    Blend2DClip.prototype.addInput = function(position, inputClip) {
        
    }

    Blend2DClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            var deltaTime = time - this._startTime;
            this.setTime(deltaTime);
        }

        return ret;
    }

    Blend2DClip.prototype.setTime = function(time) {
        
    }

    // Find the key where position in range [inputs[key].position, inputs[key+1].position)
    Blend2DClip.prototype._findKey = function(position) {
        
    }

    return Blend2DClip;
});
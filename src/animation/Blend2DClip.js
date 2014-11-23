// 2D Blend clip of blend tree
// http://docs.unity3d.com/Documentation/Manual/2DBlending.html
define(function(require) {

    'use strict';

    var Clip = require('./Clip');

    var delaunay = require('../util/delaunay');
    var Vector2 = require('../math/Vector2');

    /**
     * @typedef {Object} qtek.animation.Blend2DClip.IClipInput
     * @property {qtek.math.Vector2} position
     * @property {qtek.animation.Clip} clip
     * @property {number} offset
     */
    
    /**
     * 2d blending node in animation blend tree.
     * output clip must have blend2D method
     * @constructor
     * @alias qtek.animation.Blend2DClip
     * @extends qtek.animation.Clip
     * 
     * @param {Object} [opts]
     * @param {string} [opts.name]
     * @param {Object} [opts.target]
     * @param {number} [opts.life]
     * @param {number} [opts.delay]
     * @param {number} [opts.gap]
     * @param {number} [opts.playbackRatio]
     * @param {boolean|number} [opts.loop] If loop is a number, it indicate the loop count of animation
     * @param {string|Function} [opts.easing]
     * @param {Function} [opts.onframe]
     * @param {Function} [opts.ondestroy]
     * @param {Function} [opts.onrestart]
     * @param {object[]} [opts.inputs]
     * @param {qtek.math.Vector2} [opts.position]
     * @param {qtek.animation.Clip} [opts.output]
     */
    var Blend2DClip = function(opts) {

        opts = opts || {};
        
        Clip.call(this, opts);
        /**
         * Output clip must have blend2D method
         * @type {qtek.animation.Clip}
         */
        this.output = opts.output || null;
        /**
         * @type {qtek.animation.Blend2DClip.IClipInput[]}
         */
        this.inputs = opts.inputs || [];
        /**
         * @type {qtek.math.Vector2}
         */
        this.position = new Vector2();

        this._cacheTriangle = null;

        this._triangles = [];

        this._updateTriangles();
    };

    Blend2DClip.prototype = new Clip();
    Blend2DClip.prototype.constructor = Blend2DClip;
    /**
     * @param {qtek.math.Vector2} position
     * @param {qtek.animation.Clip} inputClip
     * @param {number} [offset]
     * @return {qtek.animation.Blend2DClip.IClipInput}
     */
    Blend2DClip.prototype.addInput = function(position, inputClip, offset) {
        var obj = {
            position : position,
            clip : inputClip,
            offset : offset || 0
        };
        this.inputs.push(obj);
        this.life = Math.max(inputClip.life, this.life);
        // TODO Change to incrementally adding
        this._updateTriangles();

        return obj;
    };

    // Delaunay triangulate
    Blend2DClip.prototype._updateTriangles = function() {
        var inputs = this.inputs.map(function(a) {
            return a.position;
        });
        this._triangles = delaunay.triangulate(inputs, '_array');
    };

    Blend2DClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            this.setTime(this._elapsedTime);
        }

        return ret;
    };

    Blend2DClip.prototype.setTime = function(time) {
        var res = this._findTriangle(this.position);
        if (!res) {
            return;
        }
        // In Barycentric
        var a = res[1]; // Percent of clip2
        var b = res[2]; // Percent of clip3

        var tri = res[0];

        var in1 = this.inputs[tri.indices[0]];
        var in2 = this.inputs[tri.indices[1]];
        var in3 = this.inputs[tri.indices[2]];
        var clip1 = in1.clip;
        var clip2 = in2.clip;
        var clip3 = in3.clip;

        clip1.setTime((time + in1.offset) % clip1.life);
        clip2.setTime((time + in2.offset) % clip2.life);
        clip3.setTime((time + in3.offset) % clip3.life);
        
        var c1 = clip1.output instanceof Clip ? clip1.output : clip1;
        var c2 = clip2.output instanceof Clip ? clip2.output : clip2;
        var c3 = clip3.output instanceof Clip ? clip3.output : clip3;

        this.output.blend2D(c1, c2, c3, a, b);
    };

    /**
     * Clone a new Blend2D clip
     * @param {boolean} cloneInputs True if clone the input clips
     * @return {qtek.animation.Blend2DClip}
     */
    Blend2DClip.prototype.clone = function (cloneInputs) {
        var clip = Clip.prototype.clone.call(this);
        clip.output = this.output.clone();
        for (var i = 0; i < this.inputs.length; i++) {
            var inputClip = cloneInputs ? this.inputs[i].clip.clone(true) : this.inputs[i].clip; 
            clip.addInput(this.inputs[i].position, inputClip, this.inputs[i].offset);
        }
        return clip;
    };

    Blend2DClip.prototype._findTriangle = function(position) {
        if (this._cacheTriangle) {
            var res = delaunay.contains(this._cacheTriangle.vertices, position._array);
            if (res) {
                return [this._cacheTriangle, res[0], res[1]];
            }
        }
        for (var i = 0; i < this._triangles.length; i++) {
            var tri = this._triangles[i];
            var res = delaunay.contains(tri.vertices, this.position._array);
            if (res) {
                this._cacheTriangle = tri;
                return [tri, res[0], res[1]];
            }
        }
    };

    return Blend2DClip;
});
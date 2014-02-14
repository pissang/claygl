// 2D Blend clip of blend tree
// http://docs.unity3d.com/Documentation/Manual/2DBlending.html
define(function(require) {

    var Clip = require('./Clip');

    var delaunay = require('../util/delaunay');
    var Vector2 = require('../math/Vector2');

    var glMatrix = require("glmatrix");
    var quat = glMatrix.quat;
    var vec3 = glMatrix.vec3;

    var Blend2DClip = function(opts) {

        opts = opts || {};
        
        Clip.call(this, opts);

        this.output = opts.output || null;

        // {
        //  position : Vector2()
        //  clip : Clip()
        //  offset : 0
        // }
        this.inputs = opts.inputs || [];

        this.position = new Vector2();

        this._cacheTriangle = null;

        this._triangles = [];

        this.updateTriangles();
    }

    Blend2DClip.prototype = new Clip();
    Blend2DClip.prototype.constructor = Blend2DClip;

    Blend2DClip.prototype.addInput = function(position, inputClip, offset) {
        var obj = {
            position : position,
            clip : inputClip,
            offset : offset || 0
        }
        this.inputs.push(obj);
        this.life = Math.max(inputClip.life, this.life);
        // TODO Change to incrementally adding
        this.updateTriangles();

        return obj;
    }

    // Delaunay triangulate
    Blend2DClip.prototype.updateTriangles = function() {
        var inputs = this.inputs.map(function(a) {
            return a.position;
        });
        this._triangles = delaunay.triangulate(inputs, '_array');
    }

    Blend2DClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            this.setTime(this._elapsedTime);
        }

        return ret;
    }

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
    }

    // Find the key where position in range [inputs[key].position, inputs[key+1].position)
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
    }

    return Blend2DClip;
});
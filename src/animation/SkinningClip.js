define(function(require) {

    'use strict';

    var Clip = require('./Clip');

    var TransformClip = require('./TransformClip');

    var glMatrix = require('../dep/glmatrix');
    var quat = glMatrix.quat;
    var vec3 = glMatrix.vec3;

    /**
     * @constructor
     * @alias qtek.animation.SkinningClip
     * 
     * @extends qtek.animation.Clip
     * @param {Object} [opts]
     * @param {string} [opts.name]
     * @param {Object} [opts.target]
     * @param {number} [opts.life]
     * @param {number} [opts.delay]
     * @param {number} [opts.gap]
     * @param {number} [opts.playbackRatio]
     * @param {boolean|number} [opts.loop] If loop is a number, it indicate the loop count of animation
     * @param {string|function} [opts.easing]
     * @param {function} [opts.onframe]
     * @param {function} [opts.ondestroy]
     * @param {function} [opts.onrestart]
     */
    var SkinningClip = function(opts) {

        opts = opts || {};
        
        Clip.call(this, opts);

        this.jointClips = [];

        this.life = 0;
        if (opts.jointClips && opts.jointClips.length > 0) {    
            for (var j = 0; j < opts.jointClips.length; j++) {
                var jointPoseCfg = opts.jointClips[j];
                var jointClip = new TransformClip({
                    keyFrames: jointPoseCfg.keyFrames
                });
                jointClip.name = jointPoseCfg.name || '';
                this.jointClips[j] = jointClip;

                this.life = Math.max(jointClip.life, this.life);
            }
        }
    };

    SkinningClip.prototype = Object.create(Clip.prototype);

    SkinningClip.prototype.constructor = SkinningClip;

    SkinningClip.prototype.step = function(time) {

        var ret = Clip.prototype.step.call(this, time);

        if (ret !== 'destroy') {
            this.setTime(this._elapsedTime);
        }

        return ret;
    };

    SkinningClip.prototype.setTime = function(time) {
        for (var i = 0; i < this.jointClips.length; i++) {
            this.jointClips[i].setTime(time);
        }
    };

    /**
     * @param {qtek.animation.TransformClip|qtek.animation.SamplerClip} jointClip
     */
    SkinningClip.prototype.addJointClip = function(jointClip) {
        this.jointClips.push(jointClip);
        this.life = Math.max(jointClip.life, this.life);
    };

    /**
     * @param {qtek.animation.TransformClip|qtek.animation.SamplerClip} jointClip
     */
    SkinningClip.prototype.removeJointClip = function(jointClip) {
        this.jointClips.splice(this.jointClips.indexOf(jointClip), 1);
    };

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @param {boolean} isLoop
     * @return {qtek.animation.SkinningClip}
     */
    SkinningClip.prototype.getSubClip = function(startTime, endTime, isLoop) {
        var subClip = new SkinningClip({
            name: this.name
        });

        for (var i = 0; i < this.jointClips.length; i++) {
            var subJointClip = this.jointClips[i].getSubClip(startTime, endTime);
            subClip.addJointClip(subJointClip);
        }

        if (isLoop !== undefined) {
            subClip.setLoop(isLoop);
        }

        return subClip; 
    };

    /**
     * 1d blending between two skinning clips
     * @param  {qtek.animation.SkinningClip} clip1
     * @param  {qtek.animation.SkinningClip} clip2
     * @param  {number} w
     */
    SkinningClip.prototype.blend1D = function(clip1, clip2, w) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var c1 = clip1.jointClips[i];
            var c2 = clip2.jointClips[i];
            var tClip = this.jointClips[i];

            tClip.blend1D(c1, c2, w);
        }
    };

    /**
     * Additive blending between two skinning clips
     * @param  {qtek.animation.SkinningClip} clip1
     * @param  {qtek.animation.SkinningClip} clip2
     */
    SkinningClip.prototype.additiveBlend = function(clip1, clip2) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var c1 = clip1.jointClips[i];
            var c2 = clip2.jointClips[i];
            var tClip = this.jointClips[i];

            tClip.additiveBlend(c1, c2);
        }
    };

    /**
     * Subtractive blending between two skinning clips
     * @param  {qtek.animation.SkinningClip} clip1
     * @param  {qtek.animation.SkinningClip} clip2
     */
    SkinningClip.prototype.subtractiveBlend = function(clip1, clip2) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var c1 = clip1.jointClips[i];
            var c2 = clip2.jointClips[i];
            var tClip = this.jointClips[i];

            tClip.subtractiveBlend(c1, c2);
        }
    };

    /**
     * 2D blending between three skinning clips
     * @param  {qtek.animation.SkinningClip} clip1
     * @param  {qtek.animation.SkinningClip} clip2
     * @param  {qtek.animation.SkinningClip} clip3
     * @param  {number} f
     * @param  {number} g
     */
    SkinningClip.prototype.blend2D = function(clip1, clip2, clip3, f, g) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var c1 = clip1.jointClips[i];
            var c2 = clip2.jointClips[i];
            var c3 = clip3.jointClips[i];
            var tClip = this.jointClips[i];

            tClip.blend2D(c1, c2, c3, f, g);
        }
    };

    /**
     * Copy SRT of all joints clips from another SkinningClip
     * @param  {qtek.animation.SkinningClip} clip
     */
    SkinningClip.prototype.copy = function(clip) {
        for (var i = 0; i < this.jointClips.length; i++) {
            var sClip = clip.jointClips[i];
            var tClip = this.jointClips[i];

            vec3.copy(tClip.position, sClip.position);
            vec3.copy(tClip.scale, sClip.scale);
            quat.copy(tClip.rotation, sClip.rotation);
        }
    };

    SkinningClip.prototype.clone = function () {
        var clip = Clip.prototype.clone.call(this);
        for (var i = 0; i < this.jointClips.length; i++) {
            clip.addJointClip(this.jointClips[i].clone());
        }
        return clip;
    };

    return SkinningClip;
});
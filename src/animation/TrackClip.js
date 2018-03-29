import Clip from './Clip';

import quat from '../glmatrix/quat';
import vec3 from '../glmatrix/vec3';


/**
 *
 * Animation clip that manage a collection of {@link clay.animation.SamplerTrack}
 * @constructor
 * @alias clay.animation.TrackClip
 *
 * @extends clay.animation.Clip
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
 * @param {Function} [opts.onfinish]
 * @param {Function} [opts.onrestart]
 * @param {Array.<clay.animation.SamplerTrack>} [opts.tracks]
 */
var TrackClip = function (opts) {

    opts = opts || {};

    Clip.call(this, opts);

    /**
     *
     * @type {clay.animation.SamplerTrack[]}
     */
    this.tracks = opts.tracks || [];

    this.calcLifeFromTracks();
};

TrackClip.prototype = Object.create(Clip.prototype);

TrackClip.prototype.constructor = TrackClip;

TrackClip.prototype.step = function (time, dTime, silent) {

    var ret = Clip.prototype.step.call(this, time, dTime, true);

    if (ret !== 'finish') {
        var time = this.getElapsedTime();
        // TODO life may be changed.
        if (this._range) {
            time = this._range[0] + time;
        }
        this.setTime(time);
    }

    // PENDING Schedule
    if (!silent && ret !== 'paused') {
        this.fire('frame');
    }

    return ret;
};

/**
 * @param {Array.<number>} range
 */
TrackClip.prototype.setRange = function (range) {
    this.calcLifeFromTracks();
    this._range = range;
    if (range) {
        range[1] = Math.min(range[1], this.life);
        range[0] = Math.min(range[0], this.life);
        this.life = (range[1] - range[0]);
    }
};

TrackClip.prototype.setTime = function (time) {
    for (var i = 0; i < this.tracks.length; i++) {
        this.tracks[i].setTime(time);
    }
};

TrackClip.prototype.calcLifeFromTracks = function () {
    this.life = 0;
    for (var i = 0; i < this.tracks.length; i++) {
        this.life = Math.max(this.life, this.tracks[i].getMaxTime());
    }
};

/**
 * @param {clay.animation.SamplerTrack} track
 */
TrackClip.prototype.addTrack = function (track) {
    this.tracks.push(track);
    this.calcLifeFromTracks();
};

/**
 * @param {clay.animation.SamplerTrack} track
 */
TrackClip.prototype.removeTarck = function (track) {
    var idx = this.tracks.indexOf(track);
    if (idx >= 0) {
        this.tracks.splice(idx, 1);
    }
};

/**
 * @param {number} startTime
 * @param {number} endTime
 * @param {boolean} isLoop
 * @return {clay.animation.TrackClip}
 */
TrackClip.prototype.getSubClip = function (startTime, endTime, isLoop) {
    var subClip = new TrackClip({
        name: this.name
    });

    for (var i = 0; i < this.tracks.length; i++) {
        var subTrack = this.tracks[i].getSubTrack(startTime, endTime);
        subClip.addTrack(subTrack);
    }

    if (isLoop !== undefined) {
        subClip.setLoop(isLoop);
    }

    subClip.life = endTime - startTime;

    return subClip;
};

/**
 * 1d blending from two skinning clips
 * @param  {clay.animation.TrackClip} clip1
 * @param  {clay.animation.TrackClip} clip2
 * @param  {number} w
 */
TrackClip.prototype.blend1D = function (clip1, clip2, w) {
    for (var i = 0; i < this.tracks.length; i++) {
        var c1 = clip1.tracks[i];
        var c2 = clip2.tracks[i];
        var tClip = this.tracks[i];

        tClip.blend1D(c1, c2, w);
    }
};

/**
 * Additive blending from two skinning clips
 * @param  {clay.animation.TrackClip} clip1
 * @param  {clay.animation.TrackClip} clip2
 */
TrackClip.prototype.additiveBlend = function (clip1, clip2) {
    for (var i = 0; i < this.tracks.length; i++) {
        var c1 = clip1.tracks[i];
        var c2 = clip2.tracks[i];
        var tClip = this.tracks[i];

        tClip.additiveBlend(c1, c2);
    }
};

/**
 * Subtractive blending from two skinning clips
 * @param  {clay.animation.TrackClip} clip1
 * @param  {clay.animation.TrackClip} clip2
 */
TrackClip.prototype.subtractiveBlend = function (clip1, clip2) {
    for (var i = 0; i < this.tracks.length; i++) {
        var c1 = clip1.tracks[i];
        var c2 = clip2.tracks[i];
        var tClip = this.tracks[i];

        tClip.subtractiveBlend(c1, c2);
    }
};

/**
 * 2D blending from three skinning clips
 * @param  {clay.animation.TrackClip} clip1
 * @param  {clay.animation.TrackClip} clip2
 * @param  {clay.animation.TrackClip} clip3
 * @param  {number} f
 * @param  {number} g
 */
TrackClip.prototype.blend2D = function (clip1, clip2, clip3, f, g) {
    for (var i = 0; i < this.tracks.length; i++) {
        var c1 = clip1.tracks[i];
        var c2 = clip2.tracks[i];
        var c3 = clip3.tracks[i];
        var tClip = this.tracks[i];

        tClip.blend2D(c1, c2, c3, f, g);
    }
};

/**
 * Copy SRT of all joints clips from another TrackClip
 * @param  {clay.animation.TrackClip} clip
 */
TrackClip.prototype.copy = function (clip) {
    for (var i = 0; i < this.tracks.length; i++) {
        var sTrack = clip.tracks[i];
        var tTrack = this.tracks[i];

        vec3.copy(tTrack.position, sTrack.position);
        vec3.copy(tTrack.scale, sTrack.scale);
        quat.copy(tTrack.rotation, sTrack.rotation);
    }
};

TrackClip.prototype.clone = function () {
    var clip = Clip.prototype.clone.call(this);
    for (var i = 0; i < this.tracks.length; i++) {
        clip.addTrack(this.tracks[i].clone());
    }
    clip.life = this.life;
    return clip;
};

export default TrackClip;

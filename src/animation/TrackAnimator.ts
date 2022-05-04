import * as quat from '../glmatrix/quat';
import * as vec3 from '../glmatrix/vec3';
import { BlendAnimatorTarget } from './BlendAnimator';
import Clip from './Clip';
import SamplerTrack from './SamplerTrack';

function isTrackAnimator(animator: BlendAnimatorTarget): animator is TrackAnimator {
  return !!(animator as TrackAnimator).tracks;
}

interface TrackAnimatorOpts {
  name: string;
  tracks: SamplerTrack[];
  loop: boolean;
}

interface TrackAnimator extends BlendAnimatorTarget {}
/**
 * Animation clip that manage a collection of {@link clay.animation.SamplerTrack}
 */
class TrackAnimator {
  tracks: SamplerTrack[];

  name: string;

  private _range?: number[];

  private _life: number = 0;

  private _loop: boolean;

  private _clip?: Clip;

  constructor(opts?: Partial<TrackAnimatorOpts>) {
    opts = opts || {};
    this.tracks = opts.tracks || [];
    this.name = opts.name || '';
    this._loop = opts.loop || false;
    this.calcLifeFromTracks();
  }

  start() {
    this._clip = new Clip({
      life: this._life,
      loop: this._loop,
      onframe: (percent, elapsedTime) => {
        const range = this._range;
        this.setTime(elapsedTime + (range ? range[0] : 0));
      }
    });

    if (this.timeline) {
      this.timeline.addClip(this._clip);
    }
  }

  setRange(range: number[]) {
    this.calcLifeFromTracks();
    this._range = range;
    const clip = this._clip;
    if (range) {
      range[1] = Math.min(range[1], this._life);
      range[0] = Math.min(range[0], this._life);

      clip && clip.setLife(range[1] - range[0]);
    } else {
      clip && clip.setLife(this._life);
    }
  }

  setTime(time: number) {
    for (let i = 0; i < this.tracks.length; i++) {
      this.tracks[i].setTime(time);
    }
  }

  calcLifeFromTracks() {
    this._life = 0;
    for (let i = 0; i < this.tracks.length; i++) {
      this._life = Math.max(this._life, this.tracks[i].getMaxTime());
    }
  }

  addTrack(track: SamplerTrack) {
    this.tracks.push(track);
    this.calcLifeFromTracks();
  }

  removeTarck(track: SamplerTrack) {
    const idx = this.tracks.indexOf(track);
    if (idx >= 0) {
      this.tracks.splice(idx, 1);
    }
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   * @param {boolean} isLoop
   * @return {clay.animation.TrackClip}
   */
  getSubAnimator(startTime: number, endTime: number, isLoop?: boolean) {
    const subAnimator = new TrackAnimator({
      name: this.name,
      loop: isLoop
    });

    for (let i = 0; i < this.tracks.length; i++) {
      const subTrack = this.tracks[i].getSubTrack(startTime, endTime);
      subAnimator.addTrack(subTrack);
    }

    subAnimator._life = endTime - startTime;

    return subAnimator;
  }

  /**
   * 1d blending from two skinning animators
   */
  blend1D(animator1: BlendAnimatorTarget, animator2: BlendAnimatorTarget, w: number) {
    if (isTrackAnimator(animator1) && isTrackAnimator(animator2)) {
      for (let i = 0; i < this.tracks.length; i++) {
        const c1 = animator1.tracks[i];
        const c2 = animator2.tracks[i];
        const tAnimator = this.tracks[i];

        tAnimator.blend1D(c1, c2, w);
      }
    }
  }

  /**
   * Additive blending from two skinning clips
   */
  additiveBlend(animator1: BlendAnimatorTarget, animator2: BlendAnimatorTarget) {
    if (isTrackAnimator(animator1) && isTrackAnimator(animator2)) {
      for (let i = 0; i < this.tracks.length; i++) {
        const c1 = animator1.tracks[i];
        const c2 = animator2.tracks[i];
        const tClip = this.tracks[i];

        tClip.additiveBlend(c1, c2);
      }
    }
  }

  /**
   * Subtractive blending from two skinning animators
   */
  subtractiveBlend(animator1: BlendAnimatorTarget, animator2: BlendAnimatorTarget) {
    if (isTrackAnimator(animator1) && isTrackAnimator(animator2)) {
      for (let i = 0; i < this.tracks.length; i++) {
        const c1 = animator1.tracks[i];
        const c2 = animator2.tracks[i];
        const tAnimator = this.tracks[i];

        tAnimator.subtractiveBlend(c1, c2);
      }
    }
  }

  /**
   * 2D blending from three skinning animators
   */
  blend2D(
    animator1: TrackAnimator,
    animator2: TrackAnimator,
    animator3: TrackAnimator,
    f: number,
    g: number
  ) {
    for (let i = 0; i < this.tracks.length; i++) {
      const c1 = animator1.tracks[i];
      const c2 = animator2.tracks[i];
      const c3 = animator3.tracks[i];
      const tAnimator = this.tracks[i];

      tAnimator.blend2D(c1, c2, c3, f, g);
    }
  }

  /**
   * Copy SRT of all joints clips from another TrackClip
   */
  copy(animator: TrackAnimator) {
    for (let i = 0; i < this.tracks.length; i++) {
      const sTrack = animator.tracks[i];
      const tTrack = this.tracks[i];

      vec3.copy(tTrack.position, sTrack.position);
      vec3.copy(tTrack.scale, sTrack.scale);
      quat.copy(tTrack.rotation, sTrack.rotation);
    }
  }

  clone() {
    const animator = new TrackAnimator();
    for (let i = 0; i < this.tracks.length; i++) {
      animator.addTrack(this.tracks[i].clone());
    }
    animator._life = this._life;
    return animator;
  }

  getLife() {
    return this._life;
  }

  setLife(life: number) {
    this._life = life;
  }

  getClip() {
    return this._clip;
  }
}

export default TrackAnimator;

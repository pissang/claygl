import Vector3 from '../math/Vector3';
import Particle from './Particle';
import * as Value from '../math/Value';
import { assign } from '../core/util';

interface ParticleEmitterOpts {
  /**
   * Maximum number of particles created by this emitter
   */
  max: number;
  /**
   * Number of particles created by this emitter each shot
   */
  amount: number;

  // Init status for each particle
  /**
   * Particle life generator
   */
  life?: Value.Value<number>;
  /**
   * Particle position generator
   */
  position?: Value.Value<Vector3>;
  /**
   * Particle rotation generator
   */
  rotation?: Value.Value<Vector3>;
  /**
   * Particle velocity generator
   */
  velocity?: Value.Value<Vector3>;
  /**
   * Particle angular velocity generator
   */
  angularVelocity?: Value.Value<Vector3>;
  /**
   * Particle sprite size generator
   */
  spriteSize?: Value.Value<number>;
  /**
   * Particle weight generator
   */
  weight?: Value.Value<number>;
}

interface ParticleEmitter extends ParticleEmitterOpts {}
class ParticleEmitter {
  /** @lends clay.particle.Emitter# */
  /**
   * Maximum number of particles created by this emitter
   * @type {number}
   */
  max = 1000;
  /*
   * Number of particles created by this emitter each shot
   * @type {number}
   */
  amount = 20;

  _particlePool: Particle[] = [];
  constructor(opts?: Partial<ParticleEmitterOpts>) {
    assign(this, opts);

    // TODO Reduce heap memory
    for (let i = 0; i < this.max; i++) {
      const particle = new Particle();
      particle.emitter = this;
      this._particlePool.push(particle);

      if (this.velocity) {
        particle.velocity = new Vector3();
      }
      if (this.angularVelocity) {
        particle.angularVelocity = new Vector3();
      }
    }
  }
  /**
   * Emitter number of particles and push them to a given particle list. Emmit number is defined by amount property
   */
  emit(out: Particle[]) {
    const amount = Math.min(this._particlePool.length, this.amount);

    let particle;
    for (let i = 0; i < amount; i++) {
      particle = this._particlePool.pop()!;
      // Initialize particle status
      if (this.position) {
        this.position.get(particle.position);
      }
      if (this.rotation) {
        this.rotation.get(particle.rotation);
      }
      if (this.velocity) {
        this.velocity.get(particle.velocity);
      }
      if (this.angularVelocity) {
        this.angularVelocity.get(particle.angularVelocity);
      }
      if (this.life) {
        particle.life = this.life.get();
      }
      if (this.spriteSize) {
        particle.spriteSize = this.spriteSize.get();
      }
      if (this.weight) {
        particle.weight = this.weight.get();
      }
      particle.age = 0;

      out.push(particle);
    }
  }
  /**
   * Kill a dead particle and put it back in the pool
   */
  kill(particle: Particle) {
    this._particlePool.push(particle);
  }
  /**
   * Create a constant 1d value generator. Alias for {@link clay.Value.constant}
   * @function clay.particle.Emitter.constant
   */
  static constant = Value.constant;

  /**
   * Create a constant vector value(2d or 3d) generator. Alias for {@link clay.Value.vector}
   */
  static vector = Value.vector;

  /**
   * Create a random 1d value generator. Alias for {@link clay.Value.random1D}
   */
  static random1D = Value.random1D;

  /**
   * Create a random 2d value generator. Alias for {@link clay.Value.random2D}
   */
  static random2D = Value.random2D;

  /**
   * Create a random 3d value generator. Alias for {@link clay.Value.random3D}
   */
  static random3D = Value.random3D;
}

export default ParticleEmitter;

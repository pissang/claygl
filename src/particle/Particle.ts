import Vector3 from '../math/Vector3';
import * as vec3 from '../glmatrix/vec3';
import ParticleEmitter from './Emitter';

class Particle {
  position = new Vector3();

  /**
   * Use euler angle to represent particle rotation
   */
  rotation = new Vector3();

  velocity?: Vector3;

  angularVelocity?: Vector3;

  life = 1;

  age = 0;

  spriteSize = 1;

  weight = 1;

  emitter?: ParticleEmitter;

  /**
   * Update particle position
   */
  update(deltaTime: number) {
    if (this.velocity) {
      vec3.scaleAndAdd(this.position.array, this.position.array, this.velocity.array, deltaTime);
    }
    if (this.angularVelocity) {
      vec3.scaleAndAdd(
        this.rotation.array,
        this.rotation.array,
        this.angularVelocity.array,
        deltaTime
      );
    }
  }
}

export default Particle;

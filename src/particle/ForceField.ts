import ParticleField from './Field';
import Vector3 from '../math/Vector3';
import * as vec3 from '../glmatrix/vec3';

export class ForceParticleField implements ParticleField {
  force: Vector3;
  constructor(force: Vector3) {
    this.force = force;
  }
  applyTo(velocity: Vector3, position: Vector3, weight: number, deltaTime: number) {
    if (weight > 0) {
      vec3.scaleAndAdd(velocity.array, velocity.array, this.force.array, deltaTime / weight);
    }
  }
}

export default ForceParticleField;

import Vector3 from '../math/Vector3';

export default interface ParticleField {
  /**
   * Apply a field to the particle and update the particle velocity
   */
  applyTo(
    velocity: Vector3 | undefined,
    position: Vector3,
    weight: number | undefined,
    deltaTime: number
  ): void;
}

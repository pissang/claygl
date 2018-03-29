import Vector3 from '../math/Vector3';
import vec3 from '../glmatrix/vec3';

/**
 * @constructor
 * @alias clay.particle.Particle
 */
var Particle = function() {
    /**
     * @type {clay.Vector3}
     */
    this.position = new Vector3();

    /**
     * Use euler angle to represent particle rotation
     * @type {clay.Vector3}
     */
    this.rotation = new Vector3();

    /**
     * @type {?clay.Vector3}
     */
    this.velocity = null;

    /**
     * @type {?clay.Vector3}
     */
    this.angularVelocity = null;

    /**
     * @type {number}
     */
    this.life = 1;

    /**
     * @type {number}
     */
    this.age = 0;

    /**
     * @type {number}
     */
    this.spriteSize = 1;

    /**
     * @type {number}
     */
    this.weight = 1;

    /**
     * @type {clay.particle.Emitter}
     */
    this.emitter = null;
};

/**
 * Update particle position
 * @param  {number} deltaTime
 */
Particle.prototype.update = function(deltaTime) {
    if (this.velocity) {
        vec3.scaleAndAdd(this.position.array, this.position.array, this.velocity.array, deltaTime);
    }
    if (this.angularVelocity) {
        vec3.scaleAndAdd(this.rotation.array, this.rotation.array, this.angularVelocity.array, deltaTime);
    }
};

export default Particle;

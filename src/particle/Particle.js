define(function(require) {

    var Vector3 = require('../math/Vector3');
    var glMatrix = require('../dep/glmatrix');
    var vec3 = glMatrix.vec3;

    /**
     * @constructor
     * @alias qtek.particleSystem.Particle
     */
    var Particle = function() {
        /**
         * @type {qtek.math.Vector3}
         */
        this.position = new Vector3();

        /**
         * Use euler angle to represent particle rotation
         * @type {qtek.math.Vector3}
         */
        this.rotation = new Vector3();

        /**
         * @type {?qtek.math.Vector3}
         */
        this.velocity = null;

        /**
         * @type {?qtek.math.Vector3}
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
         * @type {qtek.particleSystem.Emitter}
         */
        this.emitter = null;
    };

    /**
     * Update particle position
     * @param  {number} deltaTime
     */
    Particle.prototype.update = function(deltaTime) {
        if (this.velocity) {
            vec3.scaleAndAdd(this.position._array, this.position._array, this.velocity._array, deltaTime);
        }
        if (this.angularVelocity) {
            vec3.scaleAndAdd(this.rotation._array, this.rotation._array, this.angularVelocity._array, deltaTime);
        }
    };

    return Particle;
});
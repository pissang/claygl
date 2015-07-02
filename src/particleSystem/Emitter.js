define(function(require) {

    var Base = require('../core/Base');
    var Vector3 = require('../math/Vector3');
    var Particle = require('./Particle');
    var Value = require('../math/Value');
    var glMatrix = require('../dep/glmatrix');
    var vec3 =  glMatrix.vec3;

    /**
     * @constructor qtek.particleSystem.Emitter
     * @extends qtek.core.Base
     */
    var Emitter = Base.derive(
    /** @lends qtek.particleSystem.Emitter# */
    {
        /**
         * Maximum number of particles created by this emitter
         * @type {number}
         */
        max: 1000,
        /**
         * Number of particles created by this emitter each shot
         * @type {number}
         */
        amount: 20,

        // Init status for each particle
        /**
         * Particle life generator
         * @type {?qtek.math.Value.<number>}
         */
        life: null,
        /**
         * Particle position generator
         * @type {?qtek.math.Value.<qtek.math.Vector3>}
         */
        position: null,
        /**
         * Particle rotation generator
         * @type {?qtek.math.Value.<qtek.math.Vector3>}
         */
        rotation: null,
        /**
         * Particle velocity generator
         * @type {?qtek.math.Value.<qtek.math.Vector3>}
         */
        velocity: null,
        /**
         * Particle angular velocity generator
         * @type {?qtek.math.Value.<qtek.math.Vector3>}
         */
        angularVelocity: null,
        /**
         * Particle sprite size generator
         * @type {?qtek.math.Value.<number>}
         */
        spriteSize: null,
        /**
         * Particle weight generator
         * @type {?qtek.math.Value.<number>}
         */
        weight: null,

        _particlePool: null
        
    }, function() {
        
        this._particlePool = [];

        // TODO Reduce heap memory
        for (var i = 0; i < this.max; i++) {
            var particle = new Particle();
            particle.emitter = this;
            this._particlePool.push(particle);

            if (this.velocity) {
                particle.velocity = new Vector3();
            }
            if (this.angularVelocity) {
                particle.angularVelocity = new Vector3();
            }
        }
    },
    /** @lends qtek.particleSystem.Emitter.prototype */
    {
        /**
         * Emitter number of particles and push them to a given particle list. Emmit number is defined by amount property
         * @param  {Array.<qtek.particleSystem.Particle>} out
         */
        emit: function(out) {
            var amount = Math.min(this._particlePool.length, this.amount);

            var particle;
            for (var i = 0; i < amount; i++) {
                particle = this._particlePool.pop();
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
        },
        /**
         * Kill a dead particle and put it back in the pool
         * @param  {qtek.particleSystem.Particle} particle
         */
        kill: function(particle) {
            this._particlePool.push(particle);
        }
    });
    
    /**
     * Create a constant 1d value generator. Alias for {@link qtek.math.Value.constant}
     * @method qtek.particleSystem.Emitter.constant
     */
    Emitter.constant = Value.constant;

    /**
     * Create a constant vector value(2d or 3d) generator. Alias for {@link qtek.math.Value.vector}
     * @method qtek.particleSystem.Emitter.vector
     */
    Emitter.vector = Value.vector;

    /**
     * Create a random 1d value generator. Alias for {@link qtek.math.Value.random1D}
     * @method qtek.particleSystem.Emitter.random1D
     */
    Emitter.random1D = Value.random1D;

    /**
     * Create a random 2d value generator. Alias for {@link qtek.math.Value.random2D}
     * @method qtek.particleSystem.Emitter.random2D
     */
    Emitter.random2D = Value.random2D;

    /**
     * Create a random 3d value generator. Alias for {@link qtek.math.Value.random3D}
     * @method qtek.particleSystem.Emitter.random3D
     */
    Emitter.random3D = Value.random3D;

    return Emitter;
});
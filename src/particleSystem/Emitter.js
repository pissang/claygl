define(function(require) {

    var Base = require('../core/Base');
    var Vector3 = require('../math/Vector3');
    var Particle = require('./Particle');
    var Value = require('../math/Value');
    var glMatrix = require('glmatrix');
    var vec3 =  glMatrix.vec3;

    var Emitter = Base.derive({

        max : 1000,
        amount : 20,

        // Init status for each particle
        life : null,
        position : null,
        rotation : null,
        velocity : null,
        angularVelocity : null,
        spriteSize : null,
        weight : null,

        _particlePool : null
        
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

    }, {

        emit : function(out) {
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

        kill : function(particle) {
            this._particlePool.push(particle);
        }
    });
    
    Emitter.constant = Value.constant;
    Emitter.vector = Value.vector;
    Emitter.random1D = Value.random1D;
    Emitter.random2D = Value.random2D;
    Emitter.random3D = Value.random3D;

    return Emitter;
});
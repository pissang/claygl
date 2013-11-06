define(function(require) {

    var Vector3 = require('core/Vector3');
    var Base = require('core/base');
    var Particle = require('./particle');
    var Value = require('core/Value');
    var glMatrix = require('glmatrix');
    var vec3 =  glMatrix.vec3;

    var Emitter = Base.derive(function() {
        return {
            max : 1000,
            amount : 20,

            // Init status for each particle
            life : Value.constant(1),
            position : Value.vector(new Vector3()),
            rotation : Value.constant(0),
            velocity : Value.vector(new Vector3()),
            angularVelocity : Value.constant(0),
            spriteSize : Value.constant(1),

            _particlePool : []
        }
    }, function() {
        for (var i = 0; i < this.max; i++) {
            this._particlePool.push(new Particle());
        }
    }, {

        emit : function(out) {
            var amount;
            if (this._particlePool.length > this.amount) {
                amount = this.amount;
            } else {
                amount = this._particlePool.length;
            }
            var particle;
            for (var i = 0; i < amount; i++) {
                particle = this._particlePool.pop();
                // Initialize particle status
                this.position.get(particle.position);
                particle.rotation = this.rotation.get();
                this.velocity.get(particle.velocity);
                particle.angularVelocity = this.angularVelocity.get();
                particle.life = this.life.get();
                particle.spriteSize = this.spriteSize.get();
                particle.age = 0;

                out.push(particle);
            }
        },

        kill : function(particle) {
            this._particlePool.push(particle);
        }
    });

    return Emitter;
});
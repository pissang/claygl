define(function(require) {

    var Vector3 = require('../math/Vector3');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    var Particle = function() {
        
        this.position = new Vector3();

        // Use euler angle to represent rotation
        this.rotation = new Vector3();

        this.velocity = null;

        this.angularVelocity = null;

        this.life = 1;

        this.age = 0;

        this.spriteSize = 1;

        this.weight = 1;

        this.emitter = null;
    }

    Particle.prototype.update = function(deltaTime) {
        if (this.velocity) {
            vec3.scaleAndAdd(this.position._array, this.position._array, this.velocity._array, deltaTime);
        }
        if (this.angularVelocity) {
            vec3.scaleAndAdd(this.rotation._array, this.rotation._array, this.angularVelocity._array, deltaTime);
        }
    }

    return Particle;
});
define(function(require) {

    var Vector3 = require('../math/Vector3');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    var Particle = function() {
        
        this.position = new Vector3();

        this.rotation = 0;

        this.velocity = new Vector3();

        this.angularVelocity = 0;

        this.life = 0;

        this.age = 0;

        this.spriteSize = 1;

        this.weight = 1;

        this.emitter = null;
    }

    Particle.prototype.update = function(deltaTime) {
        vec3.scaleAndAdd(this.position._array, this.position._array, this.velocity._array, deltaTime);
        this.rotation += this.angularVelocity;
    }

    return Particle;
});
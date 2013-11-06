define(function(require) {

    var Vector3 = require('core/Vector3');
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

        this.weight = 0;
    }

    Particle.prototype.update = function(deltaTime) {
        vec3.add(this.position._array, this.position._array, this.velocity._array);
    }

    return Particle;
});
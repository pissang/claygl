define(function(require) {

    var Node = require('../Node');
    var Vector3 = require('core/Vector3');
    var Value = require('core/Value');

    var Geometry = require('../Geometry');
    var Mesh = require('../Mesh');
    var Material = require('../Material');
    var Shader = require('../Shader');

    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    Shader.import(require('text!./particle.essl'));

    var ParticleSystem = Node.derive(function() {
        return {
            emitter : null,

            loop : true,

            duration : 1,

            geometry : new Geometry({
                hint : Geometry.DYNAMIC_DRAW
            }),
            material : null,

            mode : Mesh.POINTS,

            _particles : [],

            _fields : []

        }
    }, function(){
        
        this.geometry.attributes.age = {
            type : 'float',
            size : 1,
            value : []
        }
        this.geometry.attributes.spriteSize = {
            type : 'float',
            size : 1,
            value : []
        }

        var particleShader = new Shader({
            vertex : Shader.source('buildin.particle.vertex'),
            fragment : Shader.source('buildin.particle.fragment')
        });
        // particleShader.enableTexture('sprite');
        // particleShader.enableTexture('gradient');
        
        if (!this.material) {
            this.material = new Material({
                shader : particleShader,
                transparent : true,
                depthMask : false
            });
        }
    }, {

        addField : function(field) {
            this._fields.push(field);
        },

        removeField : function(field) {
            this._fields.splice(this._fields.indexOf(field), 1);
        },

        update : function(deltaTime) {
            // MS => Seconds
            deltaTime /= 1000;
            var particles = this._particles;

            this.emitter.emit(particles);

            // Aging
            var len = particles.length;
            for (var i = 0; i < len;) {
                var p = particles[i];
                p.age += deltaTime;
                if (p.age >= p.life) {
                    this.emitter.kill(p);
                    particles[i] = particles[len-1];
                    particles.pop();
                    len--;
                } else {
                    i++;
                }
            }

            for (var i = 0; i < len; i++) {
                // Update
                var p = particles[i];
                if (this._fields.length > 0) {
                    for (var j = 0; j < this._fields.length; j++) {
                        this._fields[j].applyTo(p.velocity, p.position, p.weight, deltaTime);
                    }
                }
                p.update(deltaTime);
            }
        },

        render : function(_gl) {
            var particles = this._particles;
            var geometry = this.geometry;
            var positions = geometry.attributes.position.value;
            var ages = geometry.attributes.age.value;
            var spriteSizes = geometry.attributes.spriteSize.value;
            var len = this._particles.length;
            for (var i = 0; i < len; i++) {
                var particle = this._particles[i];
                positions[i] = particle.position._array;
                ages[i] = particle.age / particle.life;
                spriteSizes[i] = particle.spriteSize;
            }
            ages.length = len;
            spriteSizes.length = len;
            positions.length = len;

            geometry.dirty('position');
            geometry.dirty('age');
            geometry.dirty('spriteSize');
            
            return Mesh.prototype.render.call(this, _gl);
        }
    });

    return ParticleSystem;
});
define(function(require) {

    'use strict';

    var Node = require('../Node');
    var Vector3 = require('../math/Vector3');

    var DynamicGeometry = require('../DynamicGeometry');
    var Mesh = require('../Mesh');
    var Material = require('../Material');
    var Shader = require('../Shader');

    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    Shader.import(require('text!./particle.essl'));

    var ParticleSystem = Node.derive(function() {
        return {
            loop : true,

            duration : 1,

            geometry : new DynamicGeometry(),
            material : null,

            mode : Mesh.POINTS,

            _drawCache : {},

            _particles : [],

            _fields : [],

            _emitters : []
        }
    }, function(){

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

        visible : true,

        isRenderable : function() {
            return this.visible;
        },

        addEmitter : function(emitter) {
            this._emitters.push(emitter);
        },

        removeEmitter : function(emitter) {
            this._emitters.splice(this._emitters.indexOf(emitter), 1);
        },

        addField : function(field) {
            this._fields.push(field);
        },

        removeField : function(field) {
            this._fields.splice(this._fields.indexOf(field), 1);
        },

        updateParticles : function(deltaTime) {
            // MS => Seconds
            deltaTime /= 1000;
            var particles = this._particles;

            for (var i = 0; i < this._emitters.length; i++) {
                this._emitters[i].emit(particles);
            }

            // Aging
            var len = particles.length;
            for (var i = 0; i < len;) {
                var p = particles[i];
                p.age += deltaTime;
                if (p.age >= p.life) {
                    p.emitter.kill(p);
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
            // Put particle status in normal
            var normals = geometry.attributes.normal.value;
            var len = this._particles.length;
            for (var i = 0; i < len; i++) {
                var particle = this._particles[i];
                positions[i] = particle.position._array;
                if (!normals[i]) {
                    normals[i] = [];
                }
                normals[i][0] = particle.age / particle.life;
                normals[i][1] = particle.rotation;
                normals[i][2] = particle.spriteSize;
            }
            positions.length = len;
            normals.length = len;

            geometry.dirty('position');
            geometry.dirty('normal');
            
            return Mesh.prototype.render.call(this, _gl);
        }
    });

    return ParticleSystem;
});
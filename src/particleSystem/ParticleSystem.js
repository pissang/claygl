define(function(require) {

    'use strict';

    var Node = require('../Node');
    var Vector3 = require('../math/Vector3');
    var glenum = require("../core/glenum");

    var StaticGeometry = require('../StaticGeometry');
    var Mesh = require('../Mesh');
    var Material = require('../Material');
    var Shader = require('../Shader');

    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    Shader.import(require('text!./particle.essl'));

    var ParticleSystem = Node.derive({
        
        loop : true,

        duration : 1,

        geometry : null,
        material : null,

        mode : Mesh.POINTS,

        _elapsedTime : 0

    }, function(){

        this.geometry = new StaticGeometry({
            hint : glenum.DYNAMIC_DRAW
        });

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

        this._drawCache = {};
        this._particles = [];
        this._fields = [];
        this._emitters = [];

        this._renderInfo = new Mesh.RenderInfo();

    }, {

        visible : true,

        culling : false,
        cullFace : glenum.BACK,
        frontFace : glenum.CCW,

        frustumCulling : false,

        castShadow : false,
        receiveShadow : false,

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
            this._elapsedTime += deltaTime;

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

        _updateVertices : function() {
            var particles = this._particles;
            var geometry = this.geometry;
            var positions = geometry.attributes.position.value;
            // Put particle status in normal
            var normals = geometry.attributes.normal.value;
            var len = this._particles.length;
            if (!positions || positions.length !== len * 3) {
                positions = geometry.attributes.position.value = new Float32Array(len * 3);
                normals = geometry.attributes.normal.value = new Float32Array(len * 3);
            }
            for (var i = 0; i < len; i++) {
                var particle = this._particles[i];
                var offset = i * 3;
                for (var j = 0; j < 3; j++) {
                    positions[offset + j] = particle.position._array[j];
                    normals[offset] = particle.age / particle.life;
                    normals[offset + 1] = particle.rotation;
                    normals[offset + 2] = particle.spriteSize;
                }
            }

            geometry.dirty('position');
            geometry.dirty('normal');
        },

        render : function(_gl) {
            this._updateVertices();
            return Mesh.prototype.render.call(this, _gl);
        },

        isFinished : function() {
            return this._elapsedTime > this.duration && !this.loop;
        },

        dispose : function() {
            // Put all the particles back
            for (var i = 0; i < this._particles.length; i++) {
                var p = this._particles[i];
                p.emitter.kill(p);
            }
        }
    });

    return ParticleSystem;
});
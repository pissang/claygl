define(function(require) {

    'use strict';

    var Renderable = require('../Renderable');
    var Vector3 = require('../math/Vector3');
    var glenum = require('../core/glenum');

    var StaticGeometry = require('../StaticGeometry');
    var Material = require('../Material');
    var Shader = require('../Shader');

    var glMatrix = require('../dep/glmatrix');
    var vec3 = glMatrix.vec3;

    Shader['import'](require('text!./particle.essl'));

    var particleShader = new Shader({
        vertex: Shader.source('buildin.particle.vertex'),
        fragment: Shader.source('buildin.particle.fragment')
    });
    particleShader.enableTexture('sprite');

    /**
     * @constructor qtek.particleSystem.ParticleRenderable
     * @extends qtek.Renderable
     *
     * @example
     *     var particleRenderable = new qtek.particleSystem.ParticleRenderable({
     *         spriteAnimationTileX: 4,
     *         spriteAnimationTileY: 4,
     *         spriteAnimationRepeat: 1
     *     });
     *     scene.add(particleRenderable);
     *     // Enable uv animation in the shader
     *     particleRenderable.material.shader.define('both', 'UV_ANIMATION');
     *     var Emitter = qtek.particleSystem.Emitter;
     *     var Vector3 = qtek.math.Vector3;
     *     var emitter = new Emitter({
     *         max: 2000,
     *         amount: 100,
     *         life: Emitter.random1D(10, 20),
     *         position: Emitter.vector(new Vector3()),
     *         velocity: Emitter.random3D(new Vector3(-10, 0, -10), new Vector3(10, 0, 10));
     *     });
     *     particleRenderable.addEmitter(emitter);
     *     var gravityField = new qtek.particleSystem.ForceField();
     *     gravityField.force.y = -10;
     *     particleRenderable.addField(gravityField);
     *     ...
     *     animation.on('frame', function(frameTime) {
     *         particleRenderable.updateParticles(frameTime);
     *         renderer.render(scene, camera);
     *     });
     */
    var ParticleRenderable = Renderable.derive(
    /** @lends qtek.particleSystem.ParticleRenderable# */
    {
        /**
         * @type {boolean}
         */
        loop: true,
        /**
         * @type {boolean}
         */
        oneshot: false,
        /**
         * Duration of particle system in milliseconds
         * @type {number}
         */
        duration: 1,

        // UV Animation
        /**
         * @type {number}
         */
        spriteAnimationTileX: 1,
        /**
         * @type {number}
         */
        spriteAnimationTileY: 1,
        /**
         * @type {number}
         */
        spriteAnimationRepeat: 0,

        mode: Renderable.POINTS,

        _elapsedTime: 0,

        _emitting: true

    }, function(){

        this.geometry = new StaticGeometry({
            dynamic: true
        });
        
        if (!this.material) {
            this.material = new Material({
                shader: particleShader,
                transparent: true,
                depthMask: false
            });
        }

        this._particles = [];
        this._fields = [];
        this._emitters = [];
    },
    /** @lends qtek.particleSystem.ParticleRenderable.prototype */
    {

        culling: false,

        frustumCulling: false,

        castShadow: false,
        receiveShadow: false,

        /**
         * Add emitter
         * @param {qtek.particleSystem.Emitter} emitter
         */
        addEmitter: function(emitter) {
            this._emitters.push(emitter);
        },

        /**
         * Remove emitter
         * @param {qtek.particleSystem.Emitter} emitter
         */
        removeEmitter: function(emitter) {
            this._emitters.splice(this._emitters.indexOf(emitter), 1);
        },

        /**
         * Add field
         * @param {qtek.particleSystem.Field} field
         */
        addField: function(field) {
            this._fields.push(field);
        },

        /**
         * Remove field
         * @param {qtek.particleSystem.Field} field
         */
        removeField: function(field) {
            this._fields.splice(this._fields.indexOf(field), 1);
        },

        /**
         * Reset the particle system.
         */
        reset: function() {
            // Put all the particles back
            for (var i = 0; i < this._particles.length; i++) {
                var p = this._particles[i];
                p.emitter.kill(p);
            }
            this._particles.length = 0;
            this._elapsedTime = 0;
            this._emitting = true;
        },

        /**
         * @param  {number} deltaTime
         */
        updateParticles: function(deltaTime) {

            // MS => Seconds
            deltaTime /= 1000;
            this._elapsedTime += deltaTime;

            var particles = this._particles;

            if (this._emitting) {
                for (var i = 0; i < this._emitters.length; i++) {
                    this._emitters[i].emit(particles);
                }
                if (this.oneshot) {
                    this._emitting = false;
                }
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

        _updateVertices: function() {
            var geometry = this.geometry;
            // If has uv animation
            var animTileX = this.spriteAnimationTileX;
            var animTileY = this.spriteAnimationTileY;
            var animRepeat = this.spriteAnimationRepeat;
            var nUvAnimFrame = animTileY * animTileX * animRepeat;
            var hasUvAnimation = nUvAnimFrame > 1;
            var positions = geometry.attributes.position.value;
            // Put particle status in normal
            var normals = geometry.attributes.normal.value;
            var uvs = geometry.attributes.texcoord0.value;
            var uvs2 = geometry.attributes.texcoord1.value;

            var len = this._particles.length;
            if (!positions || positions.length !== len * 3) {
                // TODO Optimize
                positions = geometry.attributes.position.value = new Float32Array(len * 3);
                normals = geometry.attributes.normal.value = new Float32Array(len * 3);
                if (hasUvAnimation) {
                    uvs = geometry.attributes.texcoord0.value = new Float32Array(len * 2);
                    uvs2 = geometry.attributes.texcoord1.value = new Float32Array(len * 2);
                }
            }

            var invAnimTileX = 1 / animTileX;
            for (var i = 0; i < len; i++) {
                var particle = this._particles[i];
                var offset = i * 3;
                for (var j = 0; j < 3; j++) {
                    positions[offset + j] = particle.position._array[j];
                    normals[offset] = particle.age / particle.life;
                    // normals[offset + 1] = particle.rotation;
                    normals[offset + 1] = 0;
                    normals[offset + 2] = particle.spriteSize;
                }
                var offset2 = i * 2;
                if (hasUvAnimation) {
                    // TODO 
                    var p = particle.age / particle.life;
                    var stage = Math.round(p * (nUvAnimFrame - 1)) * animRepeat;
                    var v = Math.floor(stage * invAnimTileX);
                    var u = stage - v * animTileX;
                    uvs[offset2] = u / animTileX;
                    uvs[offset2 + 1] = 1 - v / animTileY;
                    uvs2[offset2] = (u + 1) / animTileX;
                    uvs2[offset2 + 1] = 1 - (v + 1) / animTileY;
                }
            }

            geometry.dirty();
        },

        render: function(_gl) {
            this._updateVertices();
            return Renderable.prototype.render.call(this, _gl);
        },

        /**
         * @return {boolean}
         */
        isFinished: function() {
            return this._elapsedTime > this.duration && !this.loop;
        },

        /**
         * @param  {WebGLRenderingContext} _gl
         */
        dispose: function(_gl) {
            // Put all the particles back
            for (var i = 0; i < this._particles.length; i++) {
                var p = this._particles[i];
                p.emitter.kill(p);
            }
            this.geometry.dispose(_gl);
            // TODO Dispose texture, shader ?
        },

        /**
         * @return {qtek.particleSystem.ParticleRenderable}
         */
        clone: function() {
            var particleSystem = new ParticleRenderable({
                material: this.material
            });
            particleSystem.loop = this.loop;
            particleSystem.duration = this.duration;
            particleSystem.oneshot = this.oneshot;
            particleSystem.spriteAnimationRepeat = this.spriteAnimationRepeat;
            particleSystem.spriteAnimationTileY = this.spriteAnimationTileY;
            particleSystem.spriteAnimationTileX = this.spriteAnimationTileX;

            particleSystem.position.copy(this.position);
            particleSystem.rotation.copy(this.rotation);
            particleSystem.scale.copy(this.scale);

            for (var i = 0; i < this._children.length; i++) {
                particleSystem.add(this._children[i].clone());
            }
            return particleSystem;
        }
    });

    return ParticleRenderable;
});
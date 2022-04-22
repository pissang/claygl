// @ts-nocheck
import Renderable from '../Renderable';

import Geometry from '../Geometry';
import Material from '../Material';
import Shader from '../Shader';

import particleEssl from './particle.glsl.js';
Shader.import(particleEssl);

const particleShader = new Shader(
  Shader.source('clay.particle.vertex'),
  Shader.source('clay.particle.fragment')
);

/**
 * @constructor clay.particle.ParticleRenderable
 * @extends clay.Renderable
 *
 * @example
 *     const particleRenderable = new clay.particle.ParticleRenderable({
 *         spriteAnimationTileX: 4,
 *         spriteAnimationTileY: 4,
 *         spriteAnimationRepeat: 1
 *     });
 *     scene.add(particleRenderable);
 *     // Enable uv animation in the shader
 *     particleRenderable.material.define('both', 'UV_ANIMATION');
 *     const Emitter = clay.particle.Emitter;
 *     const Vector3 = clay.Vector3;
 *     const emitter = new Emitter({
 *         max: 2000,
 *         amount: 100,
 *         life: Emitter.random1D(10, 20),
 *         position: Emitter.vector(new Vector3()),
 *         velocity: Emitter.random3D(new Vector3(-10, 0, -10), new Vector3(10, 0, 10));
 *     });
 *     particleRenderable.addEmitter(emitter);
 *     const gravityField = new clay.particle.ForceField();
 *     gravityField.force.y = -10;
 *     particleRenderable.addField(gravityField);
 *     ...
 *     animation.on('frame', function(frameTime) {
 *         particleRenderable.updateParticles(frameTime);
 *         renderer.render(scene, camera);
 *     });
 */
const ParticleRenderable = Renderable.extend(
  /** @lends clay.particle.ParticleRenderable# */ {
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

    ignorePicking: true,

    _elapsedTime: 0,

    _emitting: true
  },
  function () {
    this.geometry = new Geometry({
      dynamic: true
    });

    if (!this.material) {
      this.material = new Material({
        shader: particleShader,
        transparent: true,
        depthMask: false
      });

      this.material.enableTexture('sprite');
    }

    this._particles = [];
    this._fields = [];
    this._emitters = [];
  },
  /** @lends clay.particle.ParticleRenderable.prototype */
  {
    culling: false,

    frustumCulling: false,

    castShadow: false,
    receiveShadow: false,

    /**
     * Add emitter
     * @param {clay.particle.Emitter} emitter
     */
    addEmitter: function (emitter) {
      this._emitters.push(emitter);
    },

    /**
     * Remove emitter
     * @param {clay.particle.Emitter} emitter
     */
    removeEmitter: function (emitter) {
      this._emitters.splice(this._emitters.indexOf(emitter), 1);
    },

    /**
     * Add field
     * @param {clay.particle.Field} field
     */
    addField: function (field) {
      this._fields.push(field);
    },

    /**
     * Remove field
     * @param {clay.particle.Field} field
     */
    removeField: function (field) {
      this._fields.splice(this._fields.indexOf(field), 1);
    },

    /**
     * Reset the particle system.
     */
    reset: function () {
      // Put all the particles back
      for (let i = 0; i < this._particles.length; i++) {
        const p = this._particles[i];
        p.emitter.kill(p);
      }
      this._particles.length = 0;
      this._elapsedTime = 0;
      this._emitting = true;
    },

    /**
     * @param  {number} deltaTime
     */
    updateParticles: function (deltaTime) {
      // MS => Seconds
      deltaTime /= 1000;
      this._elapsedTime += deltaTime;

      const particles = this._particles;

      if (this._emitting) {
        for (let i = 0; i < this._emitters.length; i++) {
          this._emitters[i].emit(particles);
        }
        if (this.oneshot) {
          this._emitting = false;
        }
      }

      // Aging
      let len = particles.length;
      for (let i = 0; i < len; ) {
        const p = particles[i];
        p.age += deltaTime;
        if (p.age >= p.life) {
          p.emitter.kill(p);
          particles[i] = particles[len - 1];
          particles.pop();
          len--;
        } else {
          i++;
        }
      }

      for (let i = 0; i < len; i++) {
        // Update
        const p = particles[i];
        if (this._fields.length > 0) {
          for (let j = 0; j < this._fields.length; j++) {
            this._fields[j].applyTo(p.velocity, p.position, p.weight, deltaTime);
          }
        }
        p.update(deltaTime);
      }

      this._updateVertices();
    },

    _updateVertices: function () {
      const geometry = this.geometry;
      // If has uv animation
      const animTileX = this.spriteAnimationTileX;
      const animTileY = this.spriteAnimationTileY;
      const animRepeat = this.spriteAnimationRepeat;
      const nUvAnimFrame = animTileY * animTileX * animRepeat;
      const hasUvAnimation = nUvAnimFrame > 1;
      let positions = geometry.attributes.position.value;
      // Put particle status in normal
      let normals = geometry.attributes.normal.value;
      let uvs = geometry.attributes.texcoord0.value;
      let uvs2 = geometry.attributes.texcoord1.value;

      const len = this._particles.length;
      if (!positions || positions.length !== len * 3) {
        // TODO Optimize
        positions = geometry.attributes.position.value = new Float32Array(len * 3);
        normals = geometry.attributes.normal.value = new Float32Array(len * 3);
        if (hasUvAnimation) {
          uvs = geometry.attributes.texcoord0.value = new Float32Array(len * 2);
          uvs2 = geometry.attributes.texcoord1.value = new Float32Array(len * 2);
        }
      }

      const invAnimTileX = 1 / animTileX;
      for (let i = 0; i < len; i++) {
        const particle = this._particles[i];
        const offset = i * 3;
        for (let j = 0; j < 3; j++) {
          positions[offset + j] = particle.position.array[j];
          normals[offset] = particle.age / particle.life;
          // normals[offset + 1] = particle.rotation;
          normals[offset + 1] = 0;
          normals[offset + 2] = particle.spriteSize;
        }
        const offset2 = i * 2;
        if (hasUvAnimation) {
          // TODO
          const p = particle.age / particle.life;
          const stage = Math.round(p * (nUvAnimFrame - 1)) * animRepeat;
          const v = Math.floor(stage * invAnimTileX);
          const u = stage - v * animTileX;
          uvs[offset2] = u / animTileX;
          uvs[offset2 + 1] = 1 - v / animTileY;
          uvs2[offset2] = (u + 1) / animTileX;
          uvs2[offset2 + 1] = 1 - (v + 1) / animTileY;
        }
      }

      geometry.dirty();
    },

    /**
     * @return {boolean}
     */
    isFinished: function () {
      return this._elapsedTime > this.duration && !this.loop;
    },

    /**
     * @param  {clay.Renderer} renderer
     */
    dispose: function (renderer) {
      // Put all the particles back
      for (let i = 0; i < this._particles.length; i++) {
        const p = this._particles[i];
        p.emitter.kill(p);
      }
      this.geometry.dispose(renderer);
      // TODO Dispose texture ?
    },

    /**
     * @return {clay.particle.ParticleRenderable}
     */
    clone: function () {
      const particleRenderable = new ParticleRenderable({
        material: this.material
      });
      particleRenderable.loop = this.loop;
      particleRenderable.duration = this.duration;
      particleRenderable.oneshot = this.oneshot;
      particleRenderable.spriteAnimationRepeat = this.spriteAnimationRepeat;
      particleRenderable.spriteAnimationTileY = this.spriteAnimationTileY;
      particleRenderable.spriteAnimationTileX = this.spriteAnimationTileX;

      particleRenderable.position.copy(this.position);
      particleRenderable.rotation.copy(this.rotation);
      particleRenderable.scale.copy(this.scale);

      for (let i = 0; i < this._children.length; i++) {
        particleRenderable.add(this._children[i].clone());
      }
      return particleRenderable;
    }
  }
);

export default ParticleRenderable;

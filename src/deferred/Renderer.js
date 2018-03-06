// Light-pre pass deferred rendering
// http://www.realtimerendering.com/blog/deferred-lighting-approaches/
import Base from '../core/Base';
import Shader from '../Shader';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import FullQuadPass from '../compositor/Pass';
import Texture2D from '../Texture2D';
import Texture from '../Texture';
import Mesh from '../Mesh';
import SphereGeo from '../geometry/Sphere';
import ConeGeo from '../geometry/Cone';
import CylinderGeo from '../geometry/Cylinder';
import Matrix4 from '../math/Matrix4';
import Vector3 from '../math/Vector3';
import GBuffer from './GBuffer';

import prezGlsl from '../shader/source/prez.glsl.js';
import utilGlsl from '../shader/source/util.glsl.js';

import lightvolumeGlsl from '../shader/source/deferred/lightvolume.glsl.js';
// Light shaders
import spotGlsl from '../shader/source/deferred/spot.glsl.js';
import directionalGlsl from '../shader/source/deferred/directional.glsl.js';
import ambientGlsl from '../shader/source/deferred/ambient.glsl.js';
import ambientshGlsl from '../shader/source/deferred/ambientsh.glsl.js';
import ambientcubemapGlsl from '../shader/source/deferred/ambientcubemap.glsl.js';
import pointGlsl from '../shader/source/deferred/point.glsl.js';
import sphereGlsl from '../shader/source/deferred/sphere.glsl.js';
import tubeGlsl from '../shader/source/deferred/tube.glsl.js';

Shader.import(prezGlsl);
Shader.import(utilGlsl);
Shader.import(lightvolumeGlsl);

// Light shaders
Shader.import(spotGlsl);
Shader.import(directionalGlsl);
Shader.import(ambientGlsl);
Shader.import(ambientshGlsl);
Shader.import(ambientcubemapGlsl);
Shader.import(pointGlsl);
Shader.import(sphereGlsl);
Shader.import(tubeGlsl);

Shader.import(prezGlsl);

/**
 * Deferred renderer
 * @constructor
 * @alias clay.deferred.Renderer
 * @extends clay.core.Base
 */
var DeferredRenderer = Base.extend(function () {

    var fullQuadVertex = Shader.source('clay.compositor.vertex');
    var lightVolumeVertex = Shader.source('clay.deferred.light_volume.vertex');

    var directionalLightShader = new Shader(fullQuadVertex, Shader.source('clay.deferred.directional_light'));

    var lightAccumulateBlendFunc = function (gl) {
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
    };

    var createLightPassMat = function (shader) {
        return new Material({
            shader: shader,
            blend: lightAccumulateBlendFunc,
            transparent: true,
            depthMask: false
        });
    };

    var createVolumeShader = function (name) {
        return new Shader(lightVolumeVertex, Shader.source('clay.deferred.' + name));
    };

    // Rotate and positioning to fit the spot light
    // Which the cusp of cone pointing to the positive z
    // and positioned on the origin
    var coneGeo = new ConeGeo({
        capSegments: 10
    });
    var mat = new Matrix4();
    mat.rotateX(Math.PI / 2)
        .translate(new Vector3(0, -1, 0));

    coneGeo.applyTransform(mat);

    var cylinderGeo = new CylinderGeo({
        capSegments: 10
    });
    // Align with x axis
    mat.identity().rotateZ(Math.PI / 2);
    cylinderGeo.applyTransform(mat);

    return /** @lends clay.deferred.Renderer# */ {

        /**
         * Provide ShadowMapPass for shadow rendering.
         * @type {clay.prePass.ShadowMap}
         */
        shadowMapPass: null,
        /**
         * If enable auto resizing from given defualt renderer size.
         * @type {boolean}
         */
        autoResize: true,

        _createLightPassMat: createLightPassMat,

        _gBuffer: new GBuffer(),

        _lightAccumFrameBuffer: new FrameBuffer(),

        _lightAccumTex: new Texture2D({
            // FIXME Device not support float texture
            type: Texture.HALF_FLOAT,
            minFilter: Texture.NEAREST,
            magFilter: Texture.NEAREST
        }),

        _fullQuadPass: new FullQuadPass({
            blendWithPrevious: true
        }),

        _directionalLightMat: createLightPassMat(directionalLightShader),

        _ambientMat: createLightPassMat(new Shader(
            fullQuadVertex, Shader.source('clay.deferred.ambient_light')
        )),
        _ambientSHMat: createLightPassMat(new Shader(
            fullQuadVertex, Shader.source('clay.deferred.ambient_sh_light')
        )),
        _ambientCubemapMat: createLightPassMat(new Shader(
            fullQuadVertex, Shader.source('clay.deferred.ambient_cubemap_light')
        )),

        _spotLightShader: createVolumeShader('spot_light'),
        _pointLightShader: createVolumeShader('point_light'),

        _sphereLightShader: createVolumeShader('sphere_light'),
        _tubeLightShader: createVolumeShader('tube_light'),

        _lightSphereGeo: new SphereGeo({
            widthSegments: 10,
            heightSegements: 10
        }),

        _lightConeGeo: coneGeo,

        _lightCylinderGeo: cylinderGeo,

        _outputPass: new FullQuadPass({
            fragment: Shader.source('clay.compositor.output')
        })
    };
}, /** @lends clay.deferred.Renderer# */ {
    /**
     * Do render
     * @param {clay.Renderer} renderer
     * @param {clay.Scene} scene
     * @param {clay.Camera} camera
     * @param {Object} [opts]
     * @param {boolean} [opts.renderToTarget = false] If not ouput and render to the target texture
     * @param {boolean} [opts.notUpdateShadow = true] If not update the shadow.
     * @param {boolean} [opts.notUpdateScene = true] If not update the scene.
     */
    render: function (renderer, scene, camera, opts) {

        opts = opts || {};
        opts.renderToTarget = opts.renderToTarget || false;
        opts.notUpdateShadow = opts.notUpdateShadow || false;
        opts.notUpdateScene = opts.notUpdateScene || false;

        if (!opts.notUpdateScene) {
            scene.update(false, true);
        }
        scene.updateLights();
        // Render list will be updated in gbuffer.

        camera.update(true);

        // PENDING For stereo rendering
        var dpr = renderer.getDevicePixelRatio();
        if (this.autoResize
            && (renderer.getWidth() * dpr !== this._lightAccumTex.width
            || renderer.getHeight() * dpr !== this._lightAccumTex.height)
        ) {
            this.resize(renderer.getWidth() * dpr, renderer.getHeight() * dpr);
        }

        this._gBuffer.update(renderer, scene, camera);

        // Accumulate light buffer
        this._accumulateLightBuffer(renderer, scene, camera, !opts.notUpdateShadow);

        if (!opts.renderToTarget) {
            this._outputPass.setUniform('texture', this._lightAccumTex);

            this._outputPass.render(renderer);
            // this._gBuffer.renderDebug(renderer, camera, 'normal');
        }
    },

    /**
     * @return {clay.Texture2D}
     */
    getTargetTexture: function () {
        return this._lightAccumTex;
    },

    /**
     * @return {clay.FrameBuffer}
     */
    getTargetFrameBuffer: function () {
        return this._lightAccumFrameBuffer;
    },

    /**
     * @return {clay.deferred.GBuffer}
     */
    getGBuffer: function () {
        return this._gBuffer;
    },

    // TODO is dpr needed?
    setViewport: function (x, y, width, height, dpr) {
        this._gBuffer.setViewport(x, y, width, height, dpr);
        this._lightAccumFrameBuffer.viewport = this._gBuffer.getViewport();
    },

    // getFullQuadLightPass: function () {
    //     return this._fullQuadPass;
    // },

    /**
     * Set renderer size.
     * @param {number} width
     * @param {number} height
     */
    resize: function (width, height) {
        this._lightAccumTex.width = width;
        this._lightAccumTex.height = height;

        // PENDING viewport ?
        this._gBuffer.resize(width, height);
    },

    _accumulateLightBuffer: function (renderer, scene, camera, updateShadow) {
        var gl = renderer.gl;
        var lightAccumTex = this._lightAccumTex;
        var lightAccumFrameBuffer = this._lightAccumFrameBuffer;

        var eyePosition = camera.getWorldPosition().array;

        // Update volume meshes
        for (var i = 0; i < scene.lights.length; i++) {
            if (!scene.lights[i].invisible) {
                this._updateLightProxy(scene.lights[i]);
            }
        }

        var shadowMapPass = this.shadowMapPass;
        if (shadowMapPass && updateShadow) {
            gl.clearColor(1, 1, 1, 1);
            this._prepareLightShadow(renderer, scene, camera);
        }

        this.trigger('beforelightaccumulate', renderer, scene, camera, updateShadow);

        lightAccumFrameBuffer.attach(lightAccumTex);
        lightAccumFrameBuffer.bind(renderer);
        var clearColor = renderer.clearColor;

        var viewport = lightAccumFrameBuffer.viewport;
        if (viewport) {
            var dpr = viewport.devicePixelRatio;
            // use scissor to make sure only clear the viewport
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(viewport.x * dpr, viewport.y * dpr, viewport.width * dpr, viewport.height * dpr);
        }
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        if (viewport) {
            gl.disable(gl.SCISSOR_TEST);
        }

        this.trigger('startlightaccumulate', renderer, scene, camera);

        var viewProjectionInv = new Matrix4();
        Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);

        var volumeMeshList = [];

        for (var i = 0; i < scene.lights.length; i++) {
            var light = scene.lights[i];
            if (light.invisible) {
                continue;
            }

            var uTpl = light.uniformTemplates;

            var volumeMesh = light.volumeMesh || light.__volumeMesh;

            if (volumeMesh) {
                var material = volumeMesh.material;
                // Volume mesh will affect the scene bounding box when rendering
                // if castShadow is true
                volumeMesh.castShadow = false;

                var unknownLightType = false;
                switch (light.type) {
                    case 'POINT_LIGHT':
                        material.setUniform('lightColor', uTpl.pointLightColor.value(light));
                        material.setUniform('lightRange', uTpl.pointLightRange.value(light));
                        material.setUniform('lightPosition', uTpl.pointLightPosition.value(light));
                        break;
                    case 'SPOT_LIGHT':
                        material.setUniform('lightPosition', uTpl.spotLightPosition.value(light));
                        material.setUniform('lightColor', uTpl.spotLightColor.value(light));
                        material.setUniform('lightRange', uTpl.spotLightRange.value(light));
                        material.setUniform('lightDirection', uTpl.spotLightDirection.value(light));
                        material.setUniform('umbraAngleCosine', uTpl.spotLightUmbraAngleCosine.value(light));
                        material.setUniform('penumbraAngleCosine', uTpl.spotLightPenumbraAngleCosine.value(light));
                        material.setUniform('falloffFactor', uTpl.spotLightFalloffFactor.value(light));
                        break;
                    case 'SPHERE_LIGHT':
                        material.setUniform('lightColor', uTpl.sphereLightColor.value(light));
                        material.setUniform('lightRange', uTpl.sphereLightRange.value(light));
                        material.setUniform('lightRadius', uTpl.sphereLightRadius.value(light));
                        material.setUniform('lightPosition', uTpl.sphereLightPosition.value(light));
                        break;
                    case 'TUBE_LIGHT':
                        material.setUniform('lightColor', uTpl.tubeLightColor.value(light));
                        material.setUniform('lightRange', uTpl.tubeLightRange.value(light));
                        material.setUniform('lightExtend', uTpl.tubeLightExtend.value(light));
                        material.setUniform('lightPosition', uTpl.tubeLightPosition.value(light));
                        break;
                    default:
                        unknownLightType = true;
                }

                if (unknownLightType) {
                    continue;
                }

                material.setUniform('eyePosition', eyePosition);
                material.setUniform('viewProjectionInv', viewProjectionInv.array);
                material.setUniform('gBufferTexture1', this._gBuffer.getTargetTexture1());
                material.setUniform('gBufferTexture2', this._gBuffer.getTargetTexture2());
                material.setUniform('gBufferTexture3', this._gBuffer.getTargetTexture3());

                volumeMeshList.push(volumeMesh);

            }
            else {
                var pass = this._fullQuadPass;
                var unknownLightType = false;
                // Full quad light
                switch (light.type) {
                    case 'AMBIENT_LIGHT':
                        pass.material = this._ambientMat;
                        pass.material.setUniform('lightColor', uTpl.ambientLightColor.value(light));
                        break;
                    case 'AMBIENT_SH_LIGHT':
                        pass.material = this._ambientSHMat;
                        pass.material.setUniform('lightColor', uTpl.ambientSHLightColor.value(light));
                        pass.material.setUniform('lightCoefficients', uTpl.ambientSHLightCoefficients.value(light));
                        break;
                    case 'AMBIENT_CUBEMAP_LIGHT':
                        pass.material = this._ambientCubemapMat;
                        pass.material.setUniform('lightColor', uTpl.ambientCubemapLightColor.value(light));
                        pass.material.setUniform('lightCubemap', uTpl.ambientCubemapLightCubemap.value(light));
                        pass.material.setUniform('brdfLookup', uTpl.ambientCubemapLightBRDFLookup.value(light));
                        break;
                    case 'DIRECTIONAL_LIGHT':
                        var hasShadow = shadowMapPass && light.castShadow;
                        pass.material = this._directionalLightMat;
                        pass.material[hasShadow ? 'define' : 'undefine']('fragment', 'SHADOWMAP_ENABLED');
                        if (hasShadow) {
                            pass.material.define('fragment', 'SHADOW_CASCADE', light.shadowCascade);
                        }
                        pass.material.setUniform('lightColor', uTpl.directionalLightColor.value(light));
                        pass.material.setUniform('lightDirection', uTpl.directionalLightDirection.value(light));
                        break;
                    default:
                        // Unkonw light type
                        unknownLightType = true;
                }
                if (unknownLightType) {
                    continue;
                }

                var passMaterial = pass.material;
                passMaterial.setUniform('eyePosition', eyePosition);
                passMaterial.setUniform('viewProjectionInv', viewProjectionInv.array);
                passMaterial.setUniform('gBufferTexture1', this._gBuffer.getTargetTexture1());
                passMaterial.setUniform('gBufferTexture2', this._gBuffer.getTargetTexture2());
                passMaterial.setUniform('gBufferTexture3', this._gBuffer.getTargetTexture3());

                // TODO
                if (shadowMapPass && light.castShadow) {
                    passMaterial.setUniform('lightShadowMap', light.__shadowMap);
                    passMaterial.setUniform('lightMatrices', light.__lightMatrices);
                    passMaterial.setUniform('shadowCascadeClipsNear', light.__cascadeClipsNear);
                    passMaterial.setUniform('shadowCascadeClipsFar', light.__cascadeClipsFar);

                    passMaterial.setUniform('lightShadowMapSize', light.shadowResolution);
                }

                pass.renderQuad(renderer);
            }
        }

        this._renderVolumeMeshList(renderer, scene, camera, volumeMeshList);

        this.trigger('lightaccumulate', renderer, scene, camera);

        lightAccumFrameBuffer.unbind(renderer);

        this.trigger('afterlightaccumulate', renderer, scene, camera);

    },

    _prepareLightShadow: (function () {
        var worldView = new Matrix4();
        return function (renderer, scene, camera) {

            for (var i = 0; i < scene.lights.length; i++) {
                var light = scene.lights[i];
                var volumeMesh = light.volumeMesh || light.__volumeMesh;
                if (!light.castShadow || light.invisible) {
                    continue;
                }

                switch (light.type) {
                    case 'POINT_LIGHT':
                    case 'SPOT_LIGHT':
                        // Frustum culling
                        Matrix4.multiply(worldView, camera.viewMatrix, volumeMesh.worldTransform);
                        if (scene.isFrustumCulled(volumeMesh, camera, worldView.array)) {
                            continue;
                        }

                        this._prepareSingleLightShadow(
                            renderer, scene, camera, light, volumeMesh.material
                        );
                        break;
                    case 'DIRECTIONAL_LIGHT':
                        this._prepareSingleLightShadow(
                            renderer, scene, camera, light, null
                        );
                }
            }
        };
    })(),

    _prepareSingleLightShadow: function (renderer, scene, camera, light, material) {
        switch (light.type) {
            case 'POINT_LIGHT':
                var shadowMaps = [];
                this.shadowMapPass.renderPointLightShadow(
                    renderer, scene, light, shadowMaps
                );
                material.setUniform('lightShadowMap', shadowMaps[0]);
                material.setUniform('lightShadowMapSize', light.shadowResolution);
                break;
            case 'SPOT_LIGHT':
                var shadowMaps = [];
                var lightMatrices = [];
                this.shadowMapPass.renderSpotLightShadow(
                    renderer, scene, light, lightMatrices, shadowMaps
                );
                material.setUniform('lightShadowMap', shadowMaps[0]);
                material.setUniform('lightMatrix', lightMatrices[0]);
                material.setUniform('lightShadowMapSize', light.shadowResolution);
                break;
            case 'DIRECTIONAL_LIGHT':
                var shadowMaps = [];
                var lightMatrices = [];
                var cascadeClips = [];
                this.shadowMapPass.renderDirectionalLightShadow(
                    renderer, scene, camera, light, cascadeClips, lightMatrices, shadowMaps
                );
                var cascadeClipsNear = cascadeClips.slice();
                var cascadeClipsFar = cascadeClips.slice();
                cascadeClipsNear.pop();
                cascadeClipsFar.shift();

                // Iterate from far to near
                cascadeClipsNear.reverse();
                cascadeClipsFar.reverse();
                lightMatrices.reverse();

                light.__cascadeClipsNear = cascadeClipsNear;
                light.__cascadeClipsFar = cascadeClipsFar;
                light.__shadowMap = shadowMaps[0];
                light.__lightMatrices = lightMatrices;
                break;
        }
    },

    // Update light volume mesh
    // Light volume mesh is rendered in light accumulate pass instead of full quad.
    // It will reduce pixels significantly when local light is relatively small.
    // And we can use custom volume mesh to shape the light.
    //
    // See "Deferred Shading Optimizations" in GDC2011
    _updateLightProxy: function (light) {
        var volumeMesh;
        if (light.volumeMesh) {
            volumeMesh = light.volumeMesh;
        }
        else {
            switch (light.type) {
                // Only local light (point and spot) needs volume mesh.
                // Directional and ambient light renders in full quad
                case 'POINT_LIGHT':
                case 'SPHERE_LIGHT':
                    var shader = light.type === 'SPHERE_LIGHT'
                        ? this._sphereLightShader : this._pointLightShader;
                    // Volume mesh created automatically
                    if (!light.__volumeMesh) {
                        light.__volumeMesh = new Mesh({
                            material: this._createLightPassMat(shader),
                            geometry: this._lightSphereGeo,
                            // Disable culling
                            // if light volume mesh intersect camera near plane
                            // We need mesh inside can still be rendered
                            culling: false
                        });
                    }
                    volumeMesh = light.__volumeMesh;
                    var r = light.range + (light.radius || 0);
                    volumeMesh.scale.set(r, r, r);
                    break;
                case 'SPOT_LIGHT':
                    light.__volumeMesh = light.__volumeMesh || new Mesh({
                        material: this._createLightPassMat(this._spotLightShader),
                        geometry: this._lightConeGeo,
                        culling: false
                    });
                    volumeMesh = light.__volumeMesh;
                    var aspect = Math.tan(light.penumbraAngle * Math.PI / 180);
                    var range = light.range;
                    volumeMesh.scale.set(aspect * range, aspect * range, range / 2);
                    break;
                case 'TUBE_LIGHT':
                    light.__volumeMesh = light.__volumeMesh || new Mesh({
                        material: this._createLightPassMat(this._tubeLightShader),
                        geometry: this._lightCylinderGeo,
                        culling: false
                    });
                    volumeMesh = light.__volumeMesh;
                    var range = light.range;
                    volumeMesh.scale.set(light.length / 2 + range, range, range);
                    break;
            }
        }
        if (volumeMesh) {
            volumeMesh.update();
            // Apply light transform
            Matrix4.multiply(volumeMesh.worldTransform, light.worldTransform, volumeMesh.worldTransform);
            var hasShadow = this.shadowMapPass && light.castShadow;
            volumeMesh.material[hasShadow ? 'define' : 'undefine']('fragment', 'SHADOWMAP_ENABLED');
        }
    },

    _renderVolumeMeshList: (function () {
        var worldView = new Matrix4();
        var preZMaterial = new Material({
            shader: new Shader(Shader.source('clay.prez.vertex'), Shader.source('clay.prez.fragment'))
        });
        function getPreZMaterial() {
            return preZMaterial;
        }
        return function (renderer, scene, camera, volumeMeshList) {
            var gl = renderer.gl;

            gl.depthFunc(gl.LEQUAL);

            for (var i = 0; i < volumeMeshList.length; i++) {
                var volumeMesh = volumeMeshList[i];

                // Frustum culling
                Matrix4.multiply(worldView, camera.viewMatrix, volumeMesh.worldTransform);
                if (scene.isFrustumCulled(volumeMesh, camera, worldView.array)) {
                    continue;
                }

                // Use prez to avoid one pixel rendered twice
                gl.colorMask(false, false, false, false);
                gl.depthMask(true);
                // depthMask must be enabled before clear DEPTH_BUFFER
                gl.clear(gl.DEPTH_BUFFER_BIT);

                renderer.renderPass([volumeMesh], camera, {
                    getMaterial: getPreZMaterial
                });

                // Render light
                gl.colorMask(true, true, true, true);

                volumeMesh.material.depthMask = true;
                renderer.renderPass([volumeMesh], camera);
            }

            gl.depthFunc(gl.LESS);
        };
    })(),

    /**
     * @param  {clay.Renderer} renderer
     */
    dispose: function (renderer) {
        this._gBuffer.dispose(renderer);

        this._lightAccumFrameBuffer.dispose(renderer);
        this._lightAccumTex.dispose(renderer);

        this._lightConeGeo.dispose(renderer);
        this._lightCylinderGeo.dispose(renderer);
        this._lightSphereGeo.dispose(renderer);

        this._fullQuadPass.dispose(renderer);
        this._outputPass.dispose(renderer);

        this._directionalLightMat.dispose(renderer);

        this.shadowMapPass.dispose(renderer);
    }
});

export default DeferredRenderer;

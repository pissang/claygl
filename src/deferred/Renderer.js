// Light-pre pass deferred rendering
// http://www.realtimerendering.com/blog/deferred-lighting-approaches/
define(function (require) {

    'use strict';

    var Base = require('../core/Base');
    var Shader = require('../Shader');
    var Material = require('../Material');
    var FrameBuffer = require('../FrameBuffer');
    var FullQuadPass = require('../compositor/Pass');
    var Texture2D = require('../Texture2D');
    var Texture = require('../Texture');
    var Mesh = require('../Mesh');
    var SphereGeo = require('../geometry/Sphere');
    var ConeGeo = require('../geometry/Cone');
    var CylinderGeo = require('../geometry/Cylinder');
    var Matrix4 = require('../math/Matrix4');
    var Vector3 = require('../math/Vector3');
    var GBuffer = require('./GBuffer');

    Shader.import(require('../shader/source/util.essl'));
    Shader.import(require('../shader/source/deferred/lightvolume.essl'));

    // Light shaders
    Shader.import(require('../shader/source/deferred/spot.essl'));
    Shader.import(require('../shader/source/deferred/directional.essl'));
    Shader.import(require('../shader/source/deferred/ambient.essl'));
    Shader.import(require('../shader/source/deferred/point.essl'));
    Shader.import(require('../shader/source/deferred/sphere.essl'));
    Shader.import(require('../shader/source/deferred/tube.essl'));

    Shader.import(require('../shader/source/prez.essl'));

    var errorShader = {};

    var DeferredRenderer = Base.extend(function () {

        var fullQuadVertex = Shader.source('qtek.compositor.vertex');
        var lightVolumeVertex = Shader.source('qtek.deferred.light_volume.vertex');

        var directionalLightShader = new Shader({
            vertex: fullQuadVertex,
            fragment: Shader.source('qtek.deferred.directional_light')
        });
        var directionalLightShaderWithShadow = directionalLightShader.clone();
        directionalLightShaderWithShadow.define('fragment', 'SHADOWMAP_ENABLED');

        var lightAccumulateBlendFunc = function (gl) {
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ONE, gl.ONE);
        };

        var createLightPassMat = function (shader) {
            return new Material({
                shader: shader,
                blend: lightAccumulateBlendFunc,
                transparent: true,
                depthMask: false
            });
        };

        var createVolumeShader = function (name, enableShadow) {
            var shader = new Shader({
                vertex: lightVolumeVertex,
                fragment: Shader.source('qtek.deferred.' + name)
            });
            if (enableShadow) {
                shader.define('fragment', 'SHADOWMAP_ENABLED');
            }
            return shader;
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

        return {

            shadowMapPass: null,

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
            _directionalLightMatWithShadow: createLightPassMat(directionalLightShaderWithShadow),

            _ambientMat: createLightPassMat(new Shader({
                vertex: fullQuadVertex,
                fragment: Shader.source('qtek.deferred.ambient_light')
            })),

            _spotLightShader: createVolumeShader('spot_light'),
            _pointLightShader: createVolumeShader('point_light'),
            _spotLightShaderWithShadow: createVolumeShader('spot_light', true),
            _pointLightShaderWithShadow: createVolumeShader('point_light', true),

            _sphereLightShader: createVolumeShader('sphere_light'),
            _tubeLightShader: createVolumeShader('tube_light'),

            _lightSphereGeo: new SphereGeo({
                widthSegments: 10,
                heightSegements: 10
            }),

            _lightConeGeo: coneGeo,

            _lightCylinderGeo: cylinderGeo,

            _outputPass: new FullQuadPass({
                fragment: Shader.source('qtek.compositor.output')
            })
        };
    }, {
        render: function (renderer, scene, camera, notDirectOutput) {

            scene.update(false, true);
            camera.update(true);

            this._gBuffer.update(renderer, scene, camera);

            if (renderer.getWidth() !== this._lightAccumTex.width
                && renderer.getHeight() !== this._lightAccumTex.height
            ) {
                this._resize(renderer.getWidth(), renderer.getHeight());
            }

            // Accumulate light buffer
            this._accumulateLightBuffer(renderer, scene, camera);

            if (!notDirectOutput) {
                this._outputPass.setUniform('texture', this._lightAccumTex);
                this._outputPass.render(renderer);
                // this._gBuffer.renderDebug(renderer, camera, 'normal');
            }
        },

        getTargetTexture: function () {
            return this._lightAccumTex;
        },

        getGBuffer: function () {
            return this._gBuffer;
        },

        _resize: function (width, height) {
            this._lightAccumTex.width = width;
            this._lightAccumTex.height = height;
            this._lightAccumTex.dirty();
        },

        _accumulateLightBuffer: function (renderer, scene, camera) {
            var gl = renderer.gl;
            var lightAccumTex = this._lightAccumTex;
            var lightAccumFrameBuffer = this._lightAccumFrameBuffer;

            var eyePosition = camera.getWorldPosition()._array;

            // Update volume meshes
            for (var i = 0; i < scene.lights.length; i++) {
                this._updateLightProxy(scene.lights[i]);
            }

            var shadowMapPass = this.shadowMapPass;
            if (shadowMapPass) {
                this._prepareLightShadow(renderer, scene, camera);
            }

            lightAccumFrameBuffer.attach(gl, lightAccumTex);
            lightAccumFrameBuffer.bind(renderer);
            var color = renderer.color;
            gl.clearColor(color[0], color[1], color[2], color[3]);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);

            var viewProjectionInv = new Matrix4();
            Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);

            var volumeMeshList = [];
            var viewportSize = [lightAccumTex.width, lightAccumTex.height];


            for (var i = 0; i < scene.lights.length; i++) {
                var light = scene.lights[i];
                var uTpl = light.uniformTemplates;

                var volumeMesh = light.volumeMesh || light.__volumeMesh;

                if (volumeMesh) {
                    var material = volumeMesh.material;

                    // Volume mesh will affect the scene bounding box when rendering
                    // if castShadow is true
                    volumeMesh.castShadow = false;

                    material.setUniform('eyePosition', eyePosition);
                    material.setUniform('viewportSize', viewportSize);
                    material.setUniform('viewProjectionInv', viewProjectionInv._array);
                    material.setUniform('gBufferTexture1', this._gBuffer.getTargetTexture1());
                    material.setUniform('gBufferTexture2', this._gBuffer.getTargetTexture2());
                    material.setUniform('gBufferTexture3', this._gBuffer.getTargetTexture3());

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
                    }

                    volumeMeshList.push(volumeMesh);

                }
                else {
                    var pass = this._fullQuadPass;
                    // Full quad light
                    switch (light.type) {
                        case 'AMBIENT_LIGHT':
                            pass.material = this._ambientMat;
                            pass.material.setUniform('lightColor', uTpl.ambientLightColor.value(light));
                            break;
                        case 'DIRECTIONAL_LIGHT':
                            var hasShadow = shadowMapPass && light.castShadow;
                            pass.material = hasShadow
                                ? this._directionalLightMatWithShadow
                                : this._directionalLightMat;
                            if (hasShadow) {
                                pass.material.shader.define('fragment', 'SHADOW_CASCADE', light.shadowCascade);
                            }
                            pass.material.setUniform('lightColor', uTpl.directionalLightColor.value(light));
                            pass.material.setUniform('lightDirection', uTpl.directionalLightDirection.value(light));
                            break;
                    }

                    var passMaterial = pass.material;
                    passMaterial.setUniform('eyePosition', eyePosition);
                    passMaterial.setUniform('viewportSize', viewportSize);
                    passMaterial.setUniform('viewProjectionInv', viewProjectionInv._array);
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

            this._renderVolumeMeshList(renderer, camera, volumeMeshList);

            if (shadowMapPass) {
                shadowMapPass.restoreMaterial(
                    this._shadowCasters
                );
            }

            lightAccumFrameBuffer.unbind(renderer);
        },

        _prepareLightShadow: (function () {
            var worldView = new Matrix4();
            return function (renderer, scene, camera) {
                var shadowCasters;

                shadowCasters = this._shadowCasters || (this._shadowCasters = []);
                var count = 0;
                var queue = scene.opaqueQueue;
                for (var i = 0; i < queue.length; i++) {
                    if (queue[i].castShadow) {
                        shadowCasters[count++] = queue[i];
                    }
                }
                shadowCasters.length = count;

                this.shadowMapPass.saveMaterial(shadowCasters);

                for (var i = 0; i < scene.lights.length; i++) {
                    var light = scene.lights[i];
                    var volumeMesh = light.volumeMesh || light.__volumeMesh;
                    if (!light.castShadow) {
                        continue;
                    }

                    switch (light.type) {
                        case 'POINT_LIGHT':
                        case 'SPOT_LIGHT':
                            // Frustum culling
                            Matrix4.multiply(worldView, camera.viewMatrix, volumeMesh.worldTransform);
                            if (renderer.isFrustumCulled(
                                volumeMesh, camera, worldView._array, camera.projectionMatrix._array
                            )) {
                                continue;
                            }

                            this._prepareSingleLightShadow(
                                renderer, scene, camera, light, shadowCasters, volumeMesh.material
                            );
                            break;
                        case 'DIRECTIONAL_LIGHT':
                            this._prepareSingleLightShadow(
                                renderer, scene, camera, light, shadowCasters, null
                            );
                    }
                }
            };
        })(),

        _prepareSingleLightShadow: function (renderer, scene, camera, light, casters, material) {
            switch (light.type) {
                case 'POINT_LIGHT':
                    var shadowMaps = [];
                    this.shadowMapPass.renderPointLightShadow(
                        renderer, light, casters, shadowMaps
                    );
                    material.setUniform('lightShadowMap', shadowMaps[0]);
                    material.setUniform('lightShadowMapSize', light.shadowResolution);
                    break;
                case 'SPOT_LIGHT':
                    var shadowMaps = [];
                    var lightMatrices = [];
                    this.shadowMapPass.renderSpotLightShadow(
                        renderer, light, casters, lightMatrices, shadowMaps
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
                        renderer, scene, camera, light, casters, cascadeClips, lightMatrices, shadowMaps
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
                var hasShadow = this.shadowMapPass && light.castShadow;
                switch (light.type) {
                    // Only local light (point and spot) needs volume mesh.
                    // Directional and ambient light renders in full quad
                    case 'POINT_LIGHT':
                    case 'SPHERE_LIGHT':
                        // Volume mesh created automatically
                        var shader = light.type === 'SPHERE_LIGHT'
                            ? this._sphereLightShader
                            : (hasShadow ? this._pointLightShaderWithShadow : this._pointLightShader);
                        light.__volumeMesh = light.__volumeMesh || new Mesh({
                            material: this._createLightPassMat(shader),
                            geometry: this._lightSphereGeo,
                            // Disable culling
                            // if light volume mesh intersect camera near plane
                            // We need mesh inside can still be rendered
                            culling: false
                        });
                        volumeMesh = light.__volumeMesh;
                        // castShadow changed
                        if (volumeMesh.material.shader !== shader) {
                            volumeMesh.material.attachShader(shader, true);
                        }
                        var r = light.range + (light.radius || 0);
                        volumeMesh.scale.set(r, r, r);
                        break;
                    case 'SPOT_LIGHT':
                        var shader = hasShadow ? this._spotLightShaderWithShadow : this._spotLightShader;
                        light.__volumeMesh = light.__volumeMesh || new Mesh({
                            material: this._createLightPassMat(shader),
                            geometry: this._lightConeGeo,
                            culling: false
                        });
                        volumeMesh = light.__volumeMesh;
                        // castShadow changed
                        if (volumeMesh.material.shader !== shader) {
                            volumeMesh.material.attachShader(shader, true);
                        }

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
            }
        },

        _renderVolumeMeshList: (function () {
            var worldViewProjection = new Matrix4();
            var worldView = new Matrix4();
            var preZMaterial = new Material({
                shader: new Shader({
                    vertex: Shader.source('qtek.prez.vertex'),
                    fragment: Shader.source('qtek.prez.fragment')
                })
            });
            return function (renderer, camera, volumeMeshList) {
                var gl = renderer.gl;

                gl.enable(gl.DEPTH_TEST);
                gl.disable(gl.CULL_FACE);
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
                gl.depthFunc(gl.LEQUAL);
                for (var i = 0; i < volumeMeshList.length; i++) {
                    var volumeMesh = volumeMeshList[i];

                    // Frustum culling
                    Matrix4.multiply(worldView, camera.viewMatrix, volumeMesh.worldTransform);
                    if (renderer.isFrustumCulled(
                        volumeMesh, camera, worldView._array, camera.projectionMatrix._array
                    )) {
                        continue;
                    }

                    // Use prez to avoid one pixel rendered twice
                    gl.colorMask(false, false, false, false);
                    gl.depthMask(true);
                    // depthMask must be enabled before clear DEPTH_BUFFER
                    gl.clear(gl.DEPTH_BUFFER_BIT);

                    Matrix4.multiply(worldViewProjection, camera.projectionMatrix, worldView);

                    var prezShader = preZMaterial.shader;
                    this._bindShader(renderer, prezShader);

                    var semanticInfo = prezShader.matrixSemantics.WORLDVIEWPROJECTION;
                    prezShader.setUniform(gl, semanticInfo.type, semanticInfo.symbol, worldViewProjection._array);
                    volumeMesh.render(gl, preZMaterial);

                    // Render light
                    gl.colorMask(true, true, true, true);
                    gl.depthMask(false);
                    var shader = volumeMesh.material.shader;
                    this._bindShader(renderer, shader);

                    var semanticInfo = shader.matrixSemantics.WORLDVIEWPROJECTION;
                    shader.setUniform(gl, semanticInfo.type, semanticInfo.symbol, worldViewProjection._array);
                    volumeMesh.material.bind(gl);
                    volumeMesh.render(gl);
                }

                gl.depthFunc(gl.LESS);
            };
        })(),

        _bindShader: function (renderer, shader) {
            var errMsg = shader.bind(renderer.gl);
            if (errMsg) {

                if (errorShader[shader.__GUID__]) {
                    return;
                }
                errorShader[shader.__GUID__] = true;

                if (renderer.throwError) {
                    throw new Error(errMsg);
                }
                else {
                    renderer.trigger('error', errMsg);
                }
            }
        },


        /**
         * @param  {qtek.Renderer|WebGLRenderingContext} [renderer]
         */
        dispose: function (renderer) {
            var gl = renderer.gl || renderer;

            this._gBuffer.dispose(gl);

            this._lightAccumFrameBuffer.dispose(gl);
            this._lightAccumTex.dispose(gl);

            this._pointLightShader.dispose(gl);
            this._pointLightShaderWithShadow.dispose(gl);
            this._spotLightShader.dispose(gl);
            this._spotLightShaderWithShadow.dispose(gl);
            this._sphereLightShader.dispose(gl);
            this._tubeLightShader.dispose(gl);

            this._lightConeGeo.dispose(gl);
            this._lightCylinderGeo.dispose(gl);
            this._lightSphereGeo.dispose(gl);

            this._fullQuadPass.dispose(gl);
            this._outputPass.dispose(gl);

            this._directionalLightMat.dispose(gl);
            this._directionalLightMatWithShadow.dispose(gl);

            this.shadowMapPass.dispose(gl);
        }
    });

    return DeferredRenderer;
});
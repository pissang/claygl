// Light-pre pass deferred rendering
// http://www.realtimerendering.com/blog/deferred-lighting-approaches/
define(function (require) {
    
    'use strict';

    var Base = require('../core/Base');
    var Shader = require('../Shader');
    var StandardMaterial = require('./StandardMaterial');
    var Material = require('../Material');
    var FrameBuffer = require('../FrameBuffer');
    var FullQuadPass = require('../compositor/Pass');
    var Texture2D = require('../Texture2D');
    var Texture = require('../Texture');
    var boundingBox = require('../math/BoundingBox');
    var Mesh = require('../Mesh');
    var SphereGeo = require('../geometry/Sphere');
    var ConeGeo = require('../geometry/Cone');
    var CylinderGeo = require('../geometry/Cylinder');
    var Matrix4 = require('../math/Matrix4');
    var Vector3 = require('../math/Vector3');
    var ForwardRenderer = require('../Renderer');

    Shader.import(require('text!../shader/source/util.essl'));
    Shader.import(require('text!../shader/source/deferred/gbuffer.essl'));
    Shader.import(require('text!../shader/source/deferred/chunk.essl'));

    Shader.import(require('text!../shader/source/deferred/lightvolume.essl'));

    // Light shaders
    Shader.import(require('text!../shader/source/deferred/spot.essl'));
    Shader.import(require('text!../shader/source/deferred/directional.essl'));
    Shader.import(require('text!../shader/source/deferred/ambient.essl'));
    Shader.import(require('text!../shader/source/deferred/point.essl'));
    Shader.import(require('text!../shader/source/deferred/sphere.essl'));
    Shader.import(require('text!../shader/source/deferred/tube.essl'));

    Shader.import(require('text!../shader/source/deferred/output.essl'));

    Shader.import(require('text!../shader/source/prez.essl'));

    var errorShader = {};

    var DeferredRenderer = Base.derive(function () {

        var gBufferShader = new Shader({
            vertex: Shader.source('buildin.deferred.gbuffer.vertex'),
            fragment: Shader.source('buildin.deferred.gbuffer.fragment')
        });

        var gBufferDiffShader = gBufferShader.clone();
        gBufferDiffShader.enableTexture('diffuseMap');
        var gBufferNormShader = gBufferShader.clone();
        gBufferNormShader.enableTexture('normalMap');
        var gBufferDiffNormShader = gBufferDiffShader.clone();
        gBufferDiffNormShader.enableTexture('normalMap');

        var outputShader = new Shader({
            vertex: Shader.source('buildin.deferred.output.vertex'),
            fragment: Shader.source('buildin.deferred.output.fragment')
        });
        var outputDiffShader = outputShader.clone();
        outputDiffShader.enableTexture('diffuseMap');

        var fullQuadVertex = Shader.source('buildin.compositor.vertex');
        var lightVolumeVertex = Shader.source('buildin.deferred.light_volume.vertex');

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
            })
        };

        var createVolumeShader = function (name) {
            return new Shader({
                vertex: lightVolumeVertex,
                fragment: Shader.source('buildin.deferred.' + name)
            })
        }

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
            // GBuffer shaders
            _gBufferShader: gBufferShader,

            _gBufferDiffShader: gBufferDiffShader,

            _gBufferDiffNormShader: gBufferDiffNormShader,

            _gBufferNormShader: gBufferNormShader,

            _outputShader: outputShader,

            _outputDiffShader: outputDiffShader,

            _gBufferFrameBuffer: new FrameBuffer(),

            _gBufferTex: new Texture2D({
                width: 0,
                height: 0,
                // FIXME Device not support float texture
                // FIXME Half float seems has problem
                type: Texture.FLOAT,
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST
            }),

            // _depthTex: new Texture2D({
            //     type: Texture.UNSIGNED_SHORT,
            //     format: Texture.DEPTH_COMPONENT
            // }),

            _lightAccumFrameBuffer: new FrameBuffer(),

            _lightAccumTex: new Texture2D({
                // FIXME Device not support float texture
                type: Texture.FLOAT,
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST
            }),

            _fullQuadPass: new FullQuadPass(),

            _directionalLightMat: createLightPassMat(new Shader({
                vertex: fullQuadVertex,
                fragment: Shader.source('buildin.deferred.directional_light')
            })),
            _ambientMat: createLightPassMat(new Shader({
                vertex: fullQuadVertex,
                fragment: Shader.source('buildin.deferred.ambient_light')
            })),

            _spotLightShader: createVolumeShader('spot_light'),

            _pointLightShader: createVolumeShader('point_light'),

            _sphereLightShader: createVolumeShader('sphere_light'),

            _tubeLightShader: createVolumeShader('tube_light'),

            _createLightPassMat: createLightPassMat,

            _lightSphereGeo: new SphereGeo({
                widthSegments: 10,
                heightSegements: 10
            }),

            _lightConeGeo: coneGeo,

            _lightCylinderGeo: cylinderGeo
        }
    }, {
        render: function (renderer, scene, camera) {

            var gl = renderer.gl;

            scene.update(false, true);

            camera.update(true);

            var opaqueQueue = scene.opaqueQueue;
            opaqueQueue.sort(ForwardRenderer.opaqueSortFunc);

            // Replace material
            for (var i = 0; i < opaqueQueue.length; i++) {
                this._replaceGBufferMaterial(opaqueQueue[i]);
            }

            // Resize GBuffer
            var width = renderer.getWidth();
            var height = renderer.getHeight();
            var gBufferFrameBuffer = this._gBufferFrameBuffer;
            var gBufferTex = this._gBufferTex;
            // var depthTex = this._depthTex;
            var lightAccumTex = this._lightAccumTex;
            if (width !== gBufferTex.width || height !== gBufferTex.height) {
                gBufferTex.width = width;
                gBufferTex.height = height;
                // depthTex.width = width;
                // depthTex.height = height;
                lightAccumTex.width = width;
                lightAccumTex.height = height;
                gBufferTex.dirty();
                // depthTex.dirty();
                lightAccumTex.dirty();
            }
            // Render normal and glossiness to GBuffer
            gBufferFrameBuffer.attach(gl, gBufferTex);
            // FIXME Device that not support depth texture
            // gBufferFrameBuffer.attach(gl, depthTex, gl.DEPTH_ATTACHMENT);
            gBufferFrameBuffer.bind(renderer);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.BLEND);
            renderer.renderQueue(opaqueQueue, camera);
            gBufferFrameBuffer.unbind(renderer);

            // Accumulate light buffer
            this._accumulateLightBuffer(renderer, scene, camera);

            // Final output rendering
            var eyePosition = camera.getWorldPosition()._array;
            for (var i = 0; i < opaqueQueue.length; i++) {
                this._swapOutputMaterial(opaqueQueue[i], eyePosition);
            }

            // Clear
            if (renderer.clear) {
                var cc = renderer.color;
                gl.clearColor(cc[0], cc[1], cc[2], cc[3]);
                gl.clear(renderer.clear);
            }

            gl.disable(gl.BLEND);
            renderer.renderQueue(opaqueQueue, camera);

            for (var i = 0; i < opaqueQueue.length; i++) {
                // Swap material back
                opaqueQueue[i].material = opaqueQueue[i].__standardMat;
            }
        },

        _accumulateLightBuffer: function (renderer, scene, camera) {
            var gl = renderer.gl;
            var lightAccumTex = this._lightAccumTex;
            var lightAccumFrameBuffer = this._lightAccumFrameBuffer;
            var lightVolumeMeshList = this._lightVolumeMeshList;
            var listLen = 0;
            var eyePosition = camera.getWorldPosition()._array;

            lightAccumFrameBuffer.attach(gl, lightAccumTex);
            lightAccumFrameBuffer.bind(renderer);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);

            var viewProjectionInv = new Matrix4();
            Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);

            var viewportSize = [lightAccumTex.width, lightAccumTex.height];
            var volumeMeshList = [];

            for (var i = 0; i < scene.lights.length; i++) {
                var light = scene.lights[i];
                var uTpl = light.uniformTemplates;

                this._updateLightProxy(light);

                var volumeMesh = light.volumeMesh || light.__volumeMesh;

                if (volumeMesh) {
                    var material = volumeMesh.material;
                    // Volume mesh will affect the scene bounding box when rendering 
                    // if castShadow is true
                    volumeMesh.castShadow = false;

                    material.setUniform('eyePosition', eyePosition);
                    material.setUniform('viewportSize', viewportSize);
                    material.setUniform('viewProjectionInv', viewProjectionInv._array);
                    material.setUniform('normalTex', this._gBufferTex);

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
                            pass.material.set('lightColor', uTpl.ambientLightColor.value(light));
                            break;
                        case 'DIRECTIONAL_LIGHT':
                            pass.material = this._directionalLightMat;
                            pass.material.set('lightColor', uTpl.directionalLightColor.value(light));
                            pass.material.set('lightDirection', uTpl.directionalLightDirection.value(light));
                            break;
                    }
                    pass.material.set('eyePosition', eyePosition);
                    pass.material.set('viewportSize', viewportSize);
                    pass.material.set('viewProjectionInv', viewProjectionInv._array);
                    pass.material.set('normalTex', this._gBufferTex);

                    pass.renderQuad(renderer);
                }
            }

            this._renderVolumeMeshList(renderer, camera, volumeMeshList);

            lightAccumFrameBuffer.unbind(renderer);
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
                        // Volume mesh created automatically
                        var shader = light.type === 'SPHERE_LIGHT' ? this._sphereLightShader : this._pointLightShader;
                        light.__volumeMesh = light.__volumeMesh || new Mesh({
                            material: this._createLightPassMat(shader),
                            geometry: this._lightSphereGeo,
                            // Disable culling
                            // if light volume mesh intersect camera near plane
                            // We need mesh inside can still be rendered
                            culling: false
                        });
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
            }
        },

        _renderVolumeMeshList: (function () {
            var worldViewProjection = new Matrix4();
            var worldView = new Matrix4();
            var preZMaterial = new Material({
                shader: new Shader({
                    vertex: Shader.source('buildin.prez.vertex'),
                    fragment: Shader.source('buildin.prez.fragment')
                })
            });
            return function (renderer, camera, volumeMeshList) {
                var gl = renderer.gl;

                gl.clear(gl.DEPTH_BUFFER_BIT);

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
            }
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
                } else {
                    renderer.trigger('error', errMsg);
                }
            }
        },

        _replaceGBufferMaterial: function (renderable) {
            if (renderable.material instanceof StandardMaterial) {
                var standardMat = renderable.material;
                renderable.__standardMat = standardMat;
                var isDiffuseAlphaGlossiness = standardMat.diffuseMap
                    && standardMat.diffuseAlphaUsage === 'glossiness';
                renderable.__gBufferMat = renderable.__gBufferMat || new Material();
                var gBufferMat = renderable.__gBufferMat;

                var shader;
                if (standardMat.normalMap) {
                    if (isDiffuseAlphaGlossiness) {
                        // FIXME Toggle shader may be too frequently
                        if (gBufferMat.shader !== this._gBufferDiffNormShader) {
                            gBufferMat.attachShader(this._gBufferDiffNormShader, true);
                        }
                        gBufferMat.setUniform('diffuseMap', standardMat.diffuseMap);
                    }
                    else {
                        if (gBufferMat.shader !== this._gBufferNormShader) {
                            gBufferMat.attachShader(this._gBufferNormShader, true);
                        }
                    }
                    gBufferMat.setUniform('normalMap', standardMat.normalMap);
                }
                else {
                    if (isDiffuseAlphaGlossiness) {
                        if (gBufferMat.shader !== this._gBufferDiffShader) {
                            gBufferMat.attachShader(this._gBufferDiffShader, true);
                        }
                        gBufferMat.setUniform('diffuseMap', standardMat.diffuseMap);
                    }
                    else {
                        if (gBufferMat.shader !== this._gBufferShader) {
                            gBufferMat.attachShader(this._gBufferShader, true);
                        }
                    }
                }

                gBufferMat.set('uvOffset', standardMat.uvOffset);
                gBufferMat.set('uvRepeat', standardMat.uvRepeat);
                gBufferMat.setUniform('glossiness', standardMat.glossiness);

                renderable.material = gBufferMat;
            }
            else {
                console.warn('Deferred renderer only support StandardMaterial');
            }
        },

        _swapOutputMaterial: function (renderable, eyePosition) {
            if (renderable.__standardMat) {
                var standardMat = renderable.__standardMat;

                renderable.__deferredOutputMat = renderable.__deferredOutputMat || new Material();
                var outputMat = renderable.__deferredOutputMat;

                if (standardMat.diffuseMap) {
                    if (outputMat.shader !== this._outputDiffShader) {
                        outputMat.attachShader(this._outputDiffShader, true);
                    }

                    outputMat.setUniform('diffuseMap', standardMat.diffuseMap);
                }
                else {
                    if (outputMat.shader !== this._outputShader) {
                        outputMat.attachShader(this._outputShader, true);
                    }
                }

                outputMat.set('eyePosition', eyePosition);
                
                outputMat.set('color', standardMat.color);
                outputMat.set('emission', standardMat.emission);
                outputMat.set('specularColor', standardMat.specularColor);

                outputMat.set('uvRepeat', standardMat.uvRepeat);
                outputMat.set('uvOffset', standardMat.uvOffset);
                outputMat.set('specularColor', standardMat.specularColor);

                outputMat.set('lightAccumTex', this._lightAccumTex);
                outputMat.set('normalTex', this._gBufferTex);

                renderable.material = outputMat;
            }
        }
    });

    return DeferredRenderer;
});
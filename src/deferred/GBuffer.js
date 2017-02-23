define(function (require) {

    'use strict';

    var Base = require('../core/Base');
    var Texture2D = require('../Texture2D');
    var Texture = require('../Texture');
    var Material = require('../Material');
    var FrameBuffer = require('../FrameBuffer');
    var Shader = require('../Shader');
    var ForwardRenderer = require('../Renderer');
    var Pass = require('../compositor/Pass');
    var Matrix4 = require('../math/Matrix4');
    var glinfo = require('../core/glinfo');

    function createFillCanvas(color) {
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = color || '#000';
        ctx.fillRect(0, 0, 1, 1);

        return canvas;
    }

    function attachTextureToSlot(gl, shader, symbol, texture, slot) {
        shader.setUniform(gl, '1i', symbol, slot);

        gl.activeTexture(gl.TEXTURE0 + slot);
        // Maybe texture is not loaded yet;
        if (texture.isRenderable()) {
            texture.bind(gl);
        }
        else {
            // Bind texture to null
            texture.unbind(gl);
        }
    }

    function getBeforeRenderHook1 (gl, defaultNormalMap, defaultRoughnessMap) {

        var previousNormalMap;
        var previousRougnessMap;
        var previousRenderable;

        return function (renderable, prevMaterial, prevShader) {
            // Material not change
            if (previousRenderable && previousRenderable.__standardMat === renderable.__standardMat) {
                return;
            }

            var standardMaterial = renderable.__standardMat;
            var gBufferMat = renderable.material;

            var roughness = standardMaterial.get('roughness');

            var normalMap = standardMaterial.get('normalMap') || defaultNormalMap;
            var roughnessMap = standardMaterial.get('roughnessMap');
            var uvRepeat = standardMaterial.get('uvRepeat');
            var uvOffset = standardMaterial.get('uvOffset');
            var useRoughnessMap = !!roughnessMap;

            roughnessMap = roughnessMap || defaultRoughnessMap;

            if (prevMaterial !== gBufferMat) {
                gBufferMat.set('glossiness', 1.0 - roughness);
                gBufferMat.set('normalMap', normalMap);
                gBufferMat.set('roughnessMap', roughnessMap);
                gBufferMat.set('useRoughnessMap', +useRoughnessMap);
                gBufferMat.set('uvRepeat', uvRepeat);
                gBufferMat.set('uvOffset', uvOffset);
            }
            else {
                gBufferMat.shader.setUniform(
                    gl, '1f', 'glossiness', 1.0 - roughness
                );

                if (previousNormalMap !== normalMap) {
                    attachTextureToSlot(gl, gBufferMat.shader, 'normalMap', normalMap, 0);
                }
                if (previousRougnessMap !== roughnessMap) {
                    attachTextureToSlot(gl, gBufferMat.shader, 'roughnessMap', roughnessMap, 1);
                }
                gBufferMat.shader.setUniform(gl, '1i', 'useRoughnessMap', +useRoughnessMap);
                if (uvRepeat != null) {
                    gBufferMat.shader.setUniform(gl, '2f', 'uvRepeat', uvRepeat);
                }
                if (uvOffset != null) {
                    gBufferMat.shader.setUniform(gl, '2f', 'uvOffset', uvOffset);
                }
            }

            previousNormalMap = normalMap;
            previousRougnessMap = roughnessMap;

            previousRenderable = renderable;
        };
    }

    function getBeforeRenderHook2(gl, defaultDiffuseMap, defaultMetalnessMap) {
        var previousDiffuseMap;
        var previousRenderable;
        var previousMetalnessMap;

        return function (renderable, prevMaterial, prevShader) {
            // Material not change
            if (previousRenderable && previousRenderable.__standardMat === renderable.__standardMat) {
                return;
            }

            var standardMaterial = renderable.__standardMat;
            var gBufferMat = renderable.material;

            var color = standardMaterial.get('color');
            var metalness = standardMaterial.get('metalness');

            var diffuseMap = standardMaterial.get('diffuseMap');
            var metalnessMap = standardMaterial.get('metalnessMap');

            var uvRepeat = standardMaterial.get('uvRepeat');
            var uvOffset = standardMaterial.get('uvOffset');

            var useMetalnessMap = !!metalnessMap;

            diffuseMap = diffuseMap || defaultDiffuseMap;
            metalnessMap = metalnessMap || defaultMetalnessMap;

            if (prevMaterial !== gBufferMat) {
                gBufferMat.set('color', color);
                gBufferMat.set('metalness', metalness);
                gBufferMat.set('diffuseMap', diffuseMap);
                gBufferMat.set('metalnessMap', metalnessMap);
                gBufferMat.set('useMetalnessMap', +useMetalnessMap);
                gBufferMat.set('uvRepeat', uvRepeat);
                gBufferMat.set('uvOffset', uvOffset);

                gBufferMat.set('linear', +standardMaterial.linear);
            }
            else {
                gBufferMat.shader.setUniform(
                    gl, '1f', 'metalness', metalness
                );

                gBufferMat.shader.setUniform(gl, '3f', 'color', color);
                if (previousDiffuseMap !== diffuseMap) {
                    attachTextureToSlot(gl, gBufferMat.shader, 'diffuseMap', diffuseMap, 0);
                }
                if (previousMetalnessMap !== metalnessMap) {
                    attachTextureToSlot(gl, gBufferMat.shader, 'metalnessMap', metalnessMap, 1);
                }
                gBufferMat.shader.setUniform(gl, '1i', 'useMetalnessMap', +useMetalnessMap);
                gBufferMat.shader.setUniform(gl, '2f', 'uvRepeat', uvRepeat);
                gBufferMat.shader.setUniform(gl, '2f', 'uvOffset', uvOffset);

                gBufferMat.shader.setUniform(gl, '1i', 'linear', +standardMaterial.linear);
            }

            previousDiffuseMap = diffuseMap;
            previousMetalnessMap = metalnessMap;

            previousRenderable = renderable;
        };
    }

    Shader.import(require('../shader/source/deferred/gbuffer.essl'));
    Shader.import(require('../shader/source/deferred/chunk.essl'));

    var GBuffer = Base.extend(function () {

        return {

            enableTargetTexture1: true,

            enableTargetTexture2: true,

            enableTargetTexture3: true,

            // - R: normal.x
            // - G: normal.y
            // - B: normal.z
            // - A: glossiness
            _gBufferTex1: new Texture2D({
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST,
                // PENDING
                type: Texture.HALF_FLOAT
            }),

            // - R: depth
            _gBufferTex2: new Texture2D({
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST,
                // format: Texture.DEPTH_COMPONENT,
                // type: Texture.UNSIGNED_INT

                format: Texture.DEPTH_STENCIL,
                type: Texture.UNSIGNED_INT_24_8_WEBGL
            }),

            // - R: albedo.r
            // - G: albedo.g
            // - B: albedo.b
            // - A: metalness
            _gBufferTex3: new Texture2D({
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST
            }),

            _defaultNormalMap: new Texture2D({
                image: createFillCanvas('#000')
            }),
            _defaultRoughnessMap: new Texture2D({
                image: createFillCanvas('#fff')
            }),
            _defaultMetalnessMap: new Texture2D({
                image: createFillCanvas('#fff')
            }),
            _defaultDiffuseMap: new Texture2D({
                image: createFillCanvas('#fff')
            }),

            _frameBuffer: new FrameBuffer(),

            _gBufferMaterials: {},

            _debugPass: new Pass({
                fragment: Shader.source('qtek.deferred.gbuffer.debug')
            })
        };
    }, {

        resize: function (width, height) {
            if (this._gBufferTex1.width === width
                && this._gBufferTex1.height === height
            ) {
                return;
            }
            this._gBufferTex1.width = width;
            this._gBufferTex1.height = height;
            this._gBufferTex1.dirty();

            this._gBufferTex2.width = width;
            this._gBufferTex2.height = height;
            this._gBufferTex2.dirty();

            this._gBufferTex3.width = width;
            this._gBufferTex3.height = height;
            this._gBufferTex3.dirty();
        },

        // TODO is dpr needed?
        setViewport: function (x, y, width, height, dpr) {
            var viewport;
            if (typeof x === 'object') {
                viewport = x;
            }
            else {
                viewport = {
                    x: x, y: y,
                    width: width, height: height,
                    devicePixelRatio: dpr || 1
                };
            }
            this._frameBuffer.viewport = viewport;
        },

        getViewport: function () {
            if (this._frameBuffer.viewport) {
                return this._frameBuffer.viewport;
            }
            else {
                return {
                    x: 0, y: 0,
                    width: this._gBufferTex1.width,
                    height: this._gBufferTex1.height,
                    devicePixelRatio: 1
                };
            }
        },

        update: function (renderer, scene, camera) {

            var gl = renderer.gl;

            var frameBuffer = this._frameBuffer;
            var viewport = frameBuffer.viewport;
            var opaqueQueue = scene.opaqueQueue;
            var oldBeforeRender = renderer.beforeRenderObject;

            gl.clearColor(0, 0, 0, 0);
            gl.depthMask(true);
            gl.colorMask(true, true, true, true);
            gl.disable(gl.BLEND);

            var enableTargetTexture1 = this.enableTargetTexture1;
            var enableTargetTexture2 = this.enableTargetTexture2;
            var enableTargetTexture3 = this.enableTargetTexture3;
            if (!enableTargetTexture1 && !enableTargetTexture3) {
                console.warn('Can\'t disable targetTexture1 targetTexture2 both');
                enableTargetTexture1 = true;
            }

            if (enableTargetTexture2) {
                frameBuffer.attach(this._gBufferTex2, renderer.gl.DEPTH_STENCIL_ATTACHMENT);
            }

            // PENDING, scene.boundingBoxLastFrame needs be updated if have shadow
            renderer.bindSceneRendering(scene);
            if (enableTargetTexture1) {
                // Pass 1
                frameBuffer.attach(this._gBufferTex1);
                frameBuffer.bind(renderer);

                if (viewport) {
                    var dpr = viewport.devicePixelRatio;
                    // use scissor to make sure only clear the viewport
                    gl.enable(gl.SCISSOR_TEST);
                    gl.scissor(viewport.x * dpr, viewport.y * dpr, viewport.width * dpr, viewport.height * dpr);
                }
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                if (viewport) {
                    gl.disable(gl.SCISSOR_TEST);
                }

                this._resetGBufferMaterials();

                this._replaceGBufferMat(opaqueQueue, 1);
                opaqueQueue.sort(ForwardRenderer.opaqueSortFunc);


                // FIXME Use MRT if possible
                // Pass 1
                renderer.beforeRenderObject = getBeforeRenderHook1(
                    gl,
                    this._defaultNormalMap,
                    this._defaultRoughnessMap
                );
                renderer.renderQueue(opaqueQueue, camera);

            }
            if (enableTargetTexture3) {

                // Pass 2
                frameBuffer.attach(this._gBufferTex3);
                frameBuffer.bind(renderer);

                if (viewport) {
                    var dpr = viewport.devicePixelRatio;
                    // use scissor to make sure only clear the viewport
                    gl.enable(gl.SCISSOR_TEST);
                    gl.scissor(viewport.x * dpr, viewport.y * dpr, viewport.width * dpr, viewport.height * dpr);
                }
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                if (viewport) {
                    gl.disable(gl.SCISSOR_TEST);
                }

                this._replaceGBufferMat(opaqueQueue, 2);
                renderer.beforeRenderObject = getBeforeRenderHook2(
                    gl,
                    this._defaultDiffuseMap,
                    this._defaultMetalnessMap
                );
                renderer.renderQueue(opaqueQueue, camera);

            }

            renderer.bindSceneRendering(null);

            renderer.beforeRenderObject = oldBeforeRender;
            this._cleanGBufferMaterials(renderer.gl);
            this._restoreMaterial(opaqueQueue);

            frameBuffer.unbind(renderer);
        },

        renderDebug: function (renderer, camera, type, viewport) {
            var debugTypes = {
                normal: 0,
                depth: 1,
                position: 2,
                glossiness: 3,
                metalness: 4,
                albedo: 5
            };
            if (debugTypes[type] == null) {
                console.warn('Unkown type "' + type + '"');
                // Default use normal
                type = 'normal';
            }

            renderer.saveClear();
            renderer.saveViewport();
            renderer.clearBit = renderer.gl.DEPTH_BUFFER_BIT;

            if (viewport) {
                renderer.setViewport(viewport);
            }
            var viewProjectionInv = new Matrix4();
            Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);

            var debugPass = this._debugPass;
            debugPass.setUniform('viewportSize', [renderer.getWidth(), renderer.getHeight()]);
            debugPass.setUniform('gBufferTexture1', this._gBufferTex1);
            debugPass.setUniform('gBufferTexture2', this._gBufferTex2);
            debugPass.setUniform('gBufferTexture3', this._gBufferTex3);
            debugPass.setUniform('debug', debugTypes[type]);
            debugPass.setUniform('viewProjectionInv', viewProjectionInv._array);
            debugPass.render(renderer);

            renderer.restoreViewport();
            renderer.restoreClear();
        },

        getTargetTexture1: function () {
            return this._gBufferTex1;
        },

        getTargetTexture2: function () {
            return this._gBufferTex2;
        },

        getTargetTexture3: function () {
            return this._gBufferTex3;
        },

        _getMaterial: function (nJoints) {
            var gBufferMaterials = this._gBufferMaterials;
            var obj = gBufferMaterials[nJoints];
            if (!obj) {
                var mat1 = new Material({
                    shader: new Shader({
                        vertex: Shader.source('qtek.deferred.gbuffer.vertex'),
                        fragment: Shader.source('qtek.deferred.gbuffer1.fragment')
                    })
                });
                var mat2 = new Material({
                    shader: new Shader({
                        vertex: Shader.source('qtek.deferred.gbuffer.vertex'),
                        fragment: Shader.source('qtek.deferred.gbuffer2.fragment')
                    })
                });
                mat1.shader.define('vertex', 'FIRST_PASS');

                if (nJoints > 0) {
                    mat1.shader.define('vertex', 'SKINNING');
                    mat1.shader.define('vertex', 'JOINT_COUNT', nJoints);
                    mat2.shader.define('vertex', 'SKINNING');
                    mat2.shader.define('vertex', 'JOINT_COUNT', nJoints);
                }

                obj = {
                    material1: mat1,
                    material2: mat2
                };

                gBufferMaterials[nJoints] = obj;
            }
            obj.used = true;

            return obj;
        },

        _resetGBufferMaterials: function () {
            for (var key in this._gBufferMaterials) {
                this._gBufferMaterials[key].used = false;
            }
        },

        _cleanGBufferMaterials: function (gl) {
            for (var key in this._gBufferMaterials) {
                var obj = this._gBufferMaterials[key];
                if (!obj.used) {
                    obj.material1.dispose(gl);
                    obj.material2.dispose(gl);
                }
            }
        },

        _replaceGBufferMat: function (queue, pass) {
            for (var i = 0; i < queue.length; i++) {
                var renderable = queue[i];

                if (pass === 1) {
                    renderable.__standardMat = renderable.material;
                }

                var matObj = this._getMaterial(
                    renderable.joints ? renderable.joints.length : 0,
                    false
                );
                renderable.material = pass === 1 ? matObj.material1 : matObj.material2;
            }
        },

        _restoreMaterial: function (queue) {
            for (var i = 0; i < queue.length; i++) {
                var renderable = queue[i];

                if (renderable.__standardMat) {
                    renderable.material = renderable.__standardMat;
                }
            }
        },

        dispose: function (gl) {
            for (var name in this._gBufferMaterials) {
                var matObj = this._gBufferMaterials[name];
                matObj.material1.dispose(gl);
                matObj.material2.dispose(gl);
            }
        }
    });

    return GBuffer;
});
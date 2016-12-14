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

    function getBeforeRenderHook1 (
        gl, defaultNormalMap, defaultRoughnessMap, defaultMetalnessMap
    ) {

        var previousNormalMap;
        var previousRougnessMap;
        var previousMetalnessMap;

        return function (renderable, prevMaterial) {
            var originalMaterial = renderable.__standardMat;
            var gBufferMat = renderable.material;

            var roughness = originalMaterial.get('roughness');
            var metalness = originalMaterial.get('metalness');

            var normalMap = originalMaterial.get('normalMap') || defaultNormalMap;
            var roughnessMap = originalMaterial.get('roughnessMap') || defaultRoughnessMap;
            var metalnessMap = originalMaterial.get('metalnessMap') || defaultMetalnessMap;
            var uvRepeat = originalMaterial.get('uvRepeat');
            var uvOffset = originalMaterial.get('uvOffset');
            var useRoughnessMap = !!roughnessMap;
            var useMetalnessMap = !!metalnessMap;

            roughnessMap = roughnessMap || defaultRoughnessMap;
            metalnessMap = metalnessMap || defaultMetalnessMap;

            if (!prevMaterial) {
                gBufferMat.set('glossiness', 1.0 - roughness);
                gBufferMat.set('metalness', metalness);
                gBufferMat.set('normalMap', normalMap);
                gBufferMat.set('roughnessMap', roughnessMap);
                gBufferMat.set('metalnessMap', metalnessMap);
                gBufferMat.set('useRoughnessMap', +useRoughnessMap);
                gBufferMat.set('useMetalnessMap', +useMetalnessMap);
                gBufferMat.set('uvRepeat', uvRepeat);
                gBufferMat.set('uvOffset', uvOffset);
            }
            else {
                gBufferMat.shader.setUniform(
                    gl, '1f', 'glossiness', 1.0 - roughness
                );

                gBufferMat.shader.setUniform(
                    gl, '1f', 'metalness', metalness
                );

                if (previousNormalMap !== normalMap) {
                    attachTextureToSlot(gl, gBufferMat.shader, 'normalMap', normalMap, 0);
                }
                if (previousRougnessMap !== roughnessMap) {
                    attachTextureToSlot(gl, gBufferMat.shader, 'roughnessMap', roughnessMap, 1);
                }
                if (previousMetalnessMap !== metalnessMap) {
                    attachTextureToSlot(gl, gBufferMat.shader, 'metalnessMap', metalnessMap, 2);
                }
                gBufferMat.shader.setUniform(gl, '1i', 'useRoughnessMap', +useRoughnessMap);
                gBufferMat.shader.setUniform(gl, '1i', 'useMetalnessMap', +useMetalnessMap);

                gBufferMat.shader.setUniform(gl, '2f', 'uvRepeat', uvRepeat);
                gBufferMat.shader.setUniform(gl, '2f', 'uvOffset', uvOffset);
            }

            previousNormalMap = normalMap;
            previousRougnessMap = roughnessMap;
            previousMetalnessMap = metalnessMap;
        };
    }

    function getBeforeRenderHook2(gl, defaultDiffuseMap) {
        var previousDiffuseMap;

        return function (renderable, prevMaterial) {
            var originalMaterial = renderable.__standardMat;
            var gBufferMat = renderable.material;

            var color = originalMaterial.get('color');

            var diffuseMap = originalMaterial.get('diffuseMap') || defaultDiffuseMap;
            var uvRepeat = originalMaterial.get('uvRepeat');
            var uvOffset = originalMaterial.get('uvOffset');

            diffuseMap = diffuseMap || defaultDiffuseMap;

            if (!prevMaterial) {
                gBufferMat.set('color', color);
                gBufferMat.set('diffuseMap', diffuseMap);
                gBufferMat.set('uvRepeat', uvRepeat);
                gBufferMat.set('uvOffset', uvOffset);
            }
            else {
                gBufferMat.shader.setUniform(gl, '3f', 'color', color);
                if (previousDiffuseMap !== diffuseMap) {
                    attachTextureToSlot(gl, gBufferMat.shader, 'diffuseMap', metalnessMap, 2);
                }
                gBufferMat.shader.setUniform(gl, '2f', 'uvRepeat', uvRepeat);
                gBufferMat.shader.setUniform(gl, '2f', 'uvOffset', uvOffset);
            }

            previousDiffuseMap = diffuseMap;
        }
    }

    Shader.import(require('../shader/source/deferred/gbuffer.essl'));
    Shader.import(require('../shader/source/deferred/chunk.essl'));

    var GBuffer = Base.extend(function () {

        return {

            // - R: normal.x
            // - G: normal.y
            // - B: glossiness
            // - A: metalness + sign(normal.z)
            _gBufferTex1: new Texture2D({
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST
            }),

            // - R: depth
            _gBufferTex2: new Texture2D({
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST,
                format: Texture.DEPTH_COMPONENT,
                type: Texture.UNSIGNED_INT
            }),

            // - R: albedo.r
            // - G: albedo.g
            // - B: albedo.b
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

        _resize: function (width, height) {
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

        update: function (renderer, scene, camera) {
            var width = renderer.getWidth();
            var height = renderer.getHeight();

            var gl = renderer.gl;

            if (width !== this._gBufferTex1.width || height !== this._gBufferTex1.height) {
                this._resize(width, height);
            }

            var frameBuffer = this._frameBuffer;
            frameBuffer.bind(renderer);
            frameBuffer.attach(renderer.gl, this._gBufferTex1);
            frameBuffer.attach(renderer.gl, this._gBufferTex2, renderer.gl.DEPTH_ATTACHMENT);
            gl.clearColor(0, 0, 0, 0);
            gl.depthMask(true);
            gl.colorMask(true, true, true, true);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.BLEND);

            var opaqueQueue = scene.opaqueQueue;

            this._resetGBufferMaterials();

            this._replaceGBufferMat(opaqueQueue, 1);
            opaqueQueue.sort(ForwardRenderer.opaqueSortFunc);

            var oldBeforeRender = renderer.beforeRenderObject;

            // FIXME Use MRT if possible
            // Pass 1
            renderer.beforeRenderObject = getBeforeRenderHook1(
                gl,
                this._defaultNormalMap,
                this._defaultRoughnessMap,
                this._defaultMetalnessMap
            );
            renderer.renderQueue(opaqueQueue, camera);

            // Pass 2
            frameBuffer.attach(renderer.gl, this._gBufferTex3);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            this._replaceGBufferMat(opaqueQueue, 2);
            renderer.beforeRenderObject = getBeforeRenderHook2(
                gl, this._defaultDiffuseMap
            );
            renderer.renderQueue(opaqueQueue, camera);


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
            renderer.clear = renderer.gl.DEPTH_BUFFER_BIT;

            if (viewport) {
                renderer.setViewport(viewport);
            }
            var viewProjectionInv = new Matrix4();
            Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);

            this._debugPass.setUniform('gBufferTexture1', this._gBufferTex1);
            this._debugPass.setUniform('gBufferTexture2', this._gBufferTex2);
            this._debugPass.setUniform('gBufferTexture3', this._gBufferTex3);
            this._debugPass.setUniform('debug', debugTypes[type]);
            this._debugPass.setUniform('viewProjectionInv', viewProjectionInv._array);
            this._debugPass.render(renderer);

            renderer.restoreViewport();
            renderer.restoreClear();
        },

        getGBufferTexture1: function () {
            return this._gBufferTex1;
        },

        getGBufferTexture2: function () {
            return this._gBufferTex2;
        },

        getGBufferTexture3: function () {
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
                this._gBufferMaterials[name].dispose(gl);
            }
        }
    });

    return GBuffer;
});
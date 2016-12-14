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

    function createBlankNormalTex() {
        return new Texture2D({
            image: createFillCanvas('#000')
        });
    }

    function createBlankRoughnessTex() {
        return new Texture2D({
            image: createFillCanvas('#fff')
        });
    }

    function createBlankMetalnessTex() {
        return new Texture2D({
            image: createFillCanvas('#fff')
        });
    }

    Shader.import(require('../shader/source/deferred/gbuffer.essl'));
    Shader.import(require('../shader/source/deferred/chunk.essl'));

    var GBuffer = Base.extend(function () {

        return {

            _gBufferTex: new Texture2D({
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST
            }),

            _depthTex: new Texture2D({
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST,
                format: Texture.DEPTH_COMPONENT,
                type: Texture.UNSIGNED_INT
            }),

            // Use depth back texture to calculate thickness
            _backDepthTex: new Texture2D({
                minFilter: Texture.NEAREST,
                magFilter: Texture.NEAREST,
                format: Texture.DEPTH_COMPONENT,
                type: Texture.UNSIGNED_INT
            }),

            _defaultNormalMap: createBlankNormalTex(),
            _defaultRoughnessMap: createBlankRoughnessTex(),
            _defaultMetalnessMap: createBlankMetalnessTex(),

            _frameBuffer: new FrameBuffer(),

            _gBufferMaterials: {},

            _gBufferMateriaUsage: {},

            _debugPass: new Pass({
                fragment: Shader.source('qtek.deferred.gbuffer.debug')
            })
        };
    }, {

        _resize: function (width, height) {
            this._gBufferTex.width = width;
            this._gBufferTex.height = height;
            this._gBufferTex.dirty();

            this._depthTex.width = width;
            this._depthTex.height = height;
            this._depthTex.dirty();

            this._backDepthTex.width = width;
            this._backDepthTex.height = height;
            this._backDepthTex.dirty();
        },

        update: function (renderer, scene, camera) {
            var width = renderer.getWidth();
            var height = renderer.getHeight();

            var gl = renderer.gl;

            if (width !== this._gBufferTex.width || height !== this._gBufferTex.height) {
                this._resize(width, height);
            }

            var frameBuffer = this._frameBuffer;
            frameBuffer.bind(renderer);
            frameBuffer.attach(renderer.gl, this._gBufferTex);
            frameBuffer.attach(renderer.gl, this._depthTex, renderer.gl.DEPTH_ATTACHMENT);
            gl.clearColor(0, 0, 0, 0);
            gl.depthMask(true);
            gl.colorMask(true, true, true, true);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.BLEND);

            var opaqueQueue = scene.opaqueQueue;


            this._resetGBufferMaterials();
            this._replaceGBufferMat(opaqueQueue);
            this._cleanGBufferMaterials(renderer.gl);

            opaqueQueue.sort(ForwardRenderer.opaqueSortFunc);

            var oldBeforeRender = renderer.beforeRenderObject;
            var defaultNormalMap = this._defaultNormalMap;
            var defaultRoughnessMap = this._defaultRoughnessMap;
            var defaultMetalnessMap = this._defaultMetalnessMap;
            var previousNormalMap;
            var previousRougnessMap;
            var previousMetalnessMap;

            function attachTextureToSlot(shader, symbol, texture, slot) {
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

            renderer.beforeRenderObject = function (renderable, prevMaterial) {
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
                    gBufferMat.set('roughnessMap', roughnessMap);
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
                        attachTextureToSlot(gBufferMat.shader, 'normalMap', normalMap, 0);
                    }
                    if (previousRougnessMap !== roughnessMap) {
                        attachTextureToSlot(gBufferMat.shader, 'roughnessMap', roughnessMap, 1);
                    }
                    if (previousMetalnessMap !== metalnessMap) {
                        attachTextureToSlot(gBufferMat.shader, 'metalnessMap', metalnessMap, 2);
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
            renderer.renderQueue(opaqueQueue, camera);
            renderer.beforeRenderObject = oldBeforeRender;

            this._restoreMaterial(opaqueQueue);

            frameBuffer.unbind(renderer);
        },

        renderDebug: function (renderer, camera, type, viewport) {
            var debugTypes = {
                normal: 0,
                depth: 1,
                position: 2,
                glossiness: 3,
                metalness: 4
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

            this._debugPass.setUniform('depthTexture', this._depthTex);
            this._debugPass.setUniform('gBufferTexture', this._gBufferTex);
            this._debugPass.setUniform('debug', debugTypes[type]);
            this._debugPass.setUniform('viewProjectionInv', viewProjectionInv._array);
            this._debugPass.render(renderer);

            renderer.restoreViewport();
            renderer.restoreClear();
        },

        getGBufferTexture: function () {
            return this._gBufferTex;
        },

        getDepthTexture: function () {
            return this._depthTex;
        },

        _getMaterial: function (nJoints) {
            var gBufferMaterials = this._gBufferMaterials;
            var gBufferMaterialUsage = this._gBufferMateriaUsage;
            var mat = gBufferMaterials[nJoints];
            if (!mat) {
                mat = new Material({
                    shader: new Shader({
                        vertex: Shader.source('qtek.deferred.gbuffer.vertex'),
                        fragment: Shader.source('qtek.deferred.gbuffer.fragment')
                    })
                });
                mat.shader.enableTexture(['normalMap', 'roughnessMap', 'metalnessMap']);
                if (nJoints > 0) {
                    mat.shader.define('vertex', 'SKINNING');
                    mat.shader.define('vertex', 'JOINT_COUNT', nJoints);
                }

                gBufferMaterials[nJoints] = mat;
            }
            gBufferMaterialUsage[nJoints] = gBufferMaterialUsage[nJoints] || 0;
            gBufferMaterialUsage[nJoints]++;
            return mat;
        },

        _resetGBufferMaterials: function () {
            for (var key in this._gBufferMateriaUsage) {
                this._gBufferMateriaUsage[key] = 0;
            }
        },

        _cleanGBufferMaterials: function (gl) {
            for (var key in this._gBufferMateriaUsage) {
                if (!this._gBufferMateriaUsage[key]) {
                    this._gBufferMaterials[key].dispose(gl);
                }
            }
        },

        _replaceGBufferMat: function (queue) {
            for (var i = 0; i < queue.length; i++) {
                var renderable = queue[i];

                renderable.__standardMat = renderable.material;
                renderable.material = this._getMaterial(renderable.joints ? renderable.joints.length : 0);
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
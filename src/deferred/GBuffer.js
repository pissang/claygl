import Base from '../core/Base';
import Texture2D from '../Texture2D';
import Texture from '../Texture';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import Shader from '../Shader';
import ForwardRenderer from '../Renderer';
import Pass from '../compositor/Pass';
import Matrix4 from '../math/Matrix4';

import gbufferEssl from '../shader/source/deferred/gbuffer.glsl.js';
import chunkEssl from '../shader/source/deferred/chunk.glsl.js';

Shader.import(gbufferEssl);
Shader.import(chunkEssl);

function createFillCanvas(color) {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = color || '#000';
    ctx.fillRect(0, 0, 1, 1);

    return canvas;
}

function attachTextureToSlot(renderer, shader, symbol, texture, slot) {
    var gl = renderer.gl;
    shader.setUniform(gl, '1i', symbol, slot);

    gl.activeTexture(gl.TEXTURE0 + slot);
    // Maybe texture is not loaded yet;
    if (texture.isRenderable()) {
        texture.bind(renderer);
    }
    else {
        // Bind texture to null
        texture.unbind(renderer);
    }
}

// TODO Use globalShader insteadof globalMaterial?
function getBeforeRenderHook1 (gl, defaultNormalMap, defaultRoughnessMap) {

    var previousNormalMap;
    var previousRougGlossMap;
    var previousRenderable;

    return function (renderable, prevMaterial, prevShader) {
        // Material not change
        if (previousRenderable && previousRenderable.__standardMat === renderable.__standardMat) {
            return;
        }

        var standardMaterial = renderable.__standardMat;
        var gBufferMat = renderable.material;

        var glossiness;
        var roughGlossMap;
        var useRoughnessWorkflow = standardMaterial.shader.isDefined('fragment', 'USE_ROUGHNESS');
        var doubleSided = standardMaterial.shader.isDefined('fragment', 'DOUBLE_SIDED');
        var roughGlossChannel;
        if (useRoughnessWorkflow) {
            glossiness = 1.0 - standardMaterial.get('roughness');
            roughGlossMap = standardMaterial.get('roughnessMap');
            roughGlossChannel = standardMaterial.shader.getDefine('fragment', 'ROUGHNESS_CHANNEL');
        }
        else {
            glossiness = standardMaterial.get('glossiness');
            roughGlossMap = standardMaterial.get('glossinessMap');
            roughGlossChannel = standardMaterial.shader.getDefine('fragment', 'GLOSSINESS_CHANNEL');
        }
        var useRoughGlossMap = !!roughGlossMap;

        var normalMap = standardMaterial.get('normalMap') || defaultNormalMap;
        var uvRepeat = standardMaterial.get('uvRepeat');
        var uvOffset = standardMaterial.get('uvOffset');

        roughGlossMap = roughGlossMap || defaultRoughnessMap;

        if (prevMaterial !== gBufferMat) {
            gBufferMat.set('glossiness', glossiness);
            gBufferMat.set('normalMap', normalMap);
            gBufferMat.set('roughGlossMap', roughGlossMap);
            gBufferMat.set('useRoughGlossMap', +useRoughGlossMap);
            gBufferMat.set('useRoughness', +useRoughnessWorkflow);
            gBufferMat.set('doubleSided', +doubleSided);
            gBufferMat.set('roughGlossChannel', +roughGlossChannel || 0);
            gBufferMat.set('uvRepeat', uvRepeat);
            gBufferMat.set('uvOffset', uvOffset);
        }
        else {
            gBufferMat.shader.setUniform(
                gl, '1f', 'glossiness', glossiness
            );

            if (previousNormalMap !== normalMap) {
                attachTextureToSlot(this, gBufferMat.shader, 'normalMap', normalMap, 0);
            }
            if (previousRougGlossMap !== roughGlossMap) {
                attachTextureToSlot(this, gBufferMat.shader, 'roughGlossMap', roughGlossMap, 1);
            }
            gBufferMat.shader.setUniform(gl, '1i', 'useRoughGlossMap', +useRoughGlossMap);
            gBufferMat.shader.setUniform(gl, '1i', 'useRoughness', +useRoughnessWorkflow);
            gBufferMat.shader.setUniform(gl, '1i', 'doubleSided', +doubleSided);
            gBufferMat.shader.setUniform(gl, '1i', 'roughGlossChannel', +roughGlossChannel || 0);
            if (uvRepeat != null) {
                gBufferMat.shader.setUniform(gl, '2f', 'uvRepeat', uvRepeat);
            }
            if (uvOffset != null) {
                gBufferMat.shader.setUniform(gl, '2f', 'uvOffset', uvOffset);
            }
        }

        previousNormalMap = normalMap;
        previousRougGlossMap = roughGlossMap;

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
                attachTextureToSlot(this, gBufferMat.shader, 'diffuseMap', diffuseMap, 0);
            }
            if (previousMetalnessMap !== metalnessMap) {
                attachTextureToSlot(this, gBufferMat.shader, 'metalnessMap', metalnessMap, 1);
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

/**
 * GBuffer is provided for deferred rendering and SSAO, SSR pass.
 * It will do two passes rendering to three target textures. See
 * + {@link qtek.deferred.GBuffer#getTargetTexture1}
 * + {@link qtek.deferred.GBuffer#getTargetTexture2}
 * + {@link qtek.deferred.GBuffer#getTargetTexture3}
 * @constructor
 * @alias qtek.deferred.GBuffer
 * @extends qtek.core.Base
 */
var GBuffer = Base.extend(function () {

    return {

        enableTargetTexture1: true,

        enableTargetTexture2: true,

        enableTargetTexture3: true,

        _renderQueue: [],
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
}, /** @lends qtek.deferred.GBuffer# */{

    /**
     * Set G Buffer size.
     * @param {number} width
     * @param {number} height
     */
    resize: function (width, height) {
        if (this._gBufferTex1.width === width
            && this._gBufferTex1.height === height
        ) {
            return;
        }
        this._gBufferTex1.width = width;
        this._gBufferTex1.height = height;

        this._gBufferTex2.width = width;
        this._gBufferTex2.height = height;

        this._gBufferTex3.width = width;
        this._gBufferTex3.height = height;
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

    /**
     * Update G Buffer
     * @param {qtek.Renderer} renderer
     * @param {qtek.Scene} scene
     * @param {qtek.camera.Perspective} camera
     */
    update: function (renderer, scene, camera) {

        var gl = renderer.gl;

        var frameBuffer = this._frameBuffer;
        var viewport = frameBuffer.viewport;
        var opaqueQueue = scene.opaqueQueue;
        var transparentQueue = scene.transparentQueue;
        var oldBeforeRender = renderer.beforeRenderObject;

        // StandardMaterial needs updateShader method so shader can be created on demand.
        for (var i = 0; i < opaqueQueue.length; i++) {
            var material = opaqueQueue[i].material;
            material.updateShader && material.updateShader(renderer);
        }
        for (var i = 0; i < transparentQueue.length; i++) {
            var material = transparentQueue[i].material;
            material.updateShader && material.updateShader(renderer);
        }

        opaqueQueue.sort(ForwardRenderer.opaqueSortFunc);
        transparentQueue.sort(ForwardRenderer.transparentSortFunc);

        var offset = 0;
        var renderQueue = this._renderQueue;
        for (var i = 0; i < opaqueQueue.length; i++) {
            if (!opaqueQueue[i].ignoreGBuffer) {
                renderQueue[offset++] = opaqueQueue[i];
            }
        }
        for (var i = 0; i < transparentQueue.length; i++) {
            if (!transparentQueue[i].ignoreGBuffer) {
                renderQueue[offset++] = transparentQueue[i];
            }
        }
        renderQueue.length = offset;


        gl.clearColor(0, 0, 0, 0);
        gl.depthMask(true);
        gl.colorMask(true, true, true, true);
        gl.disable(gl.BLEND);

        var enableTargetTexture1 = this.enableTargetTexture1;
        var enableTargetTexture2 = this.enableTargetTexture2;
        var enableTargetTexture3 = this.enableTargetTexture3;
        if (!enableTargetTexture1 && !enableTargetTexture3) {
            console.warn('Can\'t disable targetTexture1 targetTexture3 both');
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

            this._replaceGBufferMat(renderQueue, 1);

            // FIXME Use MRT if possible
            // Pass 1
            renderer.beforeRenderObject = getBeforeRenderHook1(
                gl,
                this._defaultNormalMap,
                this._defaultRoughnessMap
            );
            renderer.renderQueue(renderQueue, camera);

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

            this._replaceGBufferMat(renderQueue, 2);
            renderer.beforeRenderObject = getBeforeRenderHook2(
                gl,
                this._defaultDiffuseMap,
                this._defaultMetalnessMap
            );
            renderer.renderQueue(renderQueue, camera);

        }

        renderer.bindSceneRendering(null);

        renderer.beforeRenderObject = oldBeforeRender;
        this._cleanGBufferMaterials(renderer);
        this._restoreMaterial(renderQueue);

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

    /**
     * Get first target texture.
     * Channel storage:
     * + R: normal.x * 0.5 + 0.5
     * + G: normal.y * 0.5 + 0.5
     * + B: normal.z * 0.5 + 0.5
     * + A: glossiness
     * @return {qtek.Texture2D}
     */
    getTargetTexture1: function () {
        return this._gBufferTex1;
    },

    /**
     * Get second target texture.
     * Channel storage:
     * + R: depth
     * @return {qtek.Texture2D}
     */
    getTargetTexture2: function () {
        return this._gBufferTex2;
    },

    /**
     * Get third target texture.
     * Channel storage:
     * + R: albedo.r
     * + G: albedo.g
     * + B: albedo.b
     * + A: metalness
     * @return {qtek.Texture2D}
     */
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

    _cleanGBufferMaterials: function (renderer) {
        for (var key in this._gBufferMaterials) {
            var obj = this._gBufferMaterials[key];
            if (!obj.used) {
                obj.material1.dispose(renderer);
                obj.material2.dispose(renderer);
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


    /**
     * @param  {qtek.Renderer} renderer
     */
    dispose: function (renderer) {
        for (var name in this._gBufferMaterials) {
            var matObj = this._gBufferMaterials[name];
            matObj.material1.dispose(renderer);
            matObj.material2.dispose(renderer);
        }
    }
});

export default GBuffer;
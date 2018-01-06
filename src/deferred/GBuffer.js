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

function attachTextureToSlot(renderer, program, symbol, texture, slot) {
    var gl = renderer.gl;
    program.setUniform(gl, '1i', symbol, slot);

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

    return function (renderable, gBufferMat, prevMaterial) {
        // Material not change
        if (previousRenderable && previousRenderable.material === renderable.material) {
            return;
        }

        var standardMaterial = renderable.material;
        var program = renderable.__program;

        var glossiness;
        var roughGlossMap;
        var useRoughnessWorkflow = standardMaterial.isDefined('fragment', 'USE_ROUGHNESS');
        var doubleSided = standardMaterial.isDefined('fragment', 'DOUBLE_SIDED');
        var roughGlossChannel;
        if (useRoughnessWorkflow) {
            glossiness = 1.0 - standardMaterial.get('roughness');
            roughGlossMap = standardMaterial.get('roughnessMap');
            roughGlossChannel = standardMaterial.getDefine('fragment', 'ROUGHNESS_CHANNEL');
        }
        else {
            glossiness = standardMaterial.get('glossiness');
            roughGlossMap = standardMaterial.get('glossinessMap');
            roughGlossChannel = standardMaterial.getDefine('fragment', 'GLOSSINESS_CHANNEL');
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
            program.setUniform(
                gl, '1f', 'glossiness', glossiness
            );

            if (previousNormalMap !== normalMap) {
                attachTextureToSlot(this, program, 'normalMap', normalMap, 0);
            }
            if (previousRougGlossMap !== roughGlossMap) {
                attachTextureToSlot(this, program, 'roughGlossMap', roughGlossMap, 1);
            }
            program.setUniform(gl, '1i', 'useRoughGlossMap', +useRoughGlossMap);
            program.setUniform(gl, '1i', 'useRoughness', +useRoughnessWorkflow);
            program.setUniform(gl, '1i', 'doubleSided', +doubleSided);
            program.setUniform(gl, '1i', 'roughGlossChannel', +roughGlossChannel || 0);
            if (uvRepeat != null) {
                program.setUniform(gl, '2f', 'uvRepeat', uvRepeat);
            }
            if (uvOffset != null) {
                program.setUniform(gl, '2f', 'uvOffset', uvOffset);
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

    return function (renderable, gBufferMat, prevMaterial) {
        // Material not change
        if (previousRenderable && previousRenderable.material === renderable.material) {
            return;
        }

        var program = renderable.__program;
        var standardMaterial = renderable.material;

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
            program.setUniform(gl, '1f', 'metalness', metalness);

            program.setUniform(gl, '3f', 'color', color);
            if (previousDiffuseMap !== diffuseMap) {
                attachTextureToSlot(this, program, 'diffuseMap', diffuseMap, 0);
            }
            if (previousMetalnessMap !== metalnessMap) {
                attachTextureToSlot(this, program, 'metalnessMap', metalnessMap, 1);
            }
            program.setUniform(gl, '1i', 'useMetalnessMap', +useMetalnessMap);
            program.setUniform(gl, '2f', 'uvRepeat', uvRepeat);
            program.setUniform(gl, '2f', 'uvOffset', uvOffset);

            program.setUniform(gl, '1i', 'linear', +standardMaterial.linear);
        }

        previousDiffuseMap = diffuseMap;
        previousMetalnessMap = metalnessMap;

        previousRenderable = renderable;
    };
}

/**
 * GBuffer is provided for deferred rendering and SSAO, SSR pass.
 * It will do two passes rendering to three target textures. See
 * + {@link clay.deferred.GBuffer#getTargetTexture1}
 * + {@link clay.deferred.GBuffer#getTargetTexture2}
 * + {@link clay.deferred.GBuffer#getTargetTexture3}
 * @constructor
 * @alias clay.deferred.GBuffer
 * @extends clay.core.Base
 */
var GBuffer = Base.extend(function () {

    return {

        enableTargetTexture1: true,

        enableTargetTexture2: true,

        enableTargetTexture3: true,

        renderTransparent: false,

        _renderList: [],
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

        _gBufferMaterial1: new Material({
            shader: new Shader(
                Shader.source('clay.deferred.gbuffer.vertex'),
                Shader.source('clay.deferred.gbuffer1.fragment')
            ),
            vertexDefines: {
                FIRST_PASS: null
            },
            fragmentDefines: {
                FIRST_PASS: null
            }
        }),
        _gBufferMaterial2: new Material({
            shader: new Shader(
                Shader.source('clay.deferred.gbuffer.vertex'),
                Shader.source('clay.deferred.gbuffer2.fragment')
            )
        }),

        _debugPass: new Pass({
            fragment: Shader.source('clay.deferred.gbuffer.debug')
        })
    };
}, /** @lends clay.deferred.GBuffer# */{

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
     * @param {clay.Renderer} renderer
     * @param {clay.Scene} scene
     * @param {clay.camera.Perspective} camera
     */
    update: function (renderer, scene, camera) {

        var gl = renderer.gl;

        var frameBuffer = this._frameBuffer;
        var viewport = frameBuffer.viewport;
        var opaqueList = scene.opaqueList;
        var transparentList = scene.transparentList;

        var offset = 0;
        var renderList = this._renderList;
        for (var i = 0; i < opaqueList.length; i++) {
            if (!opaqueList[i].ignoreGBuffer) {
                renderList[offset++] = opaqueList[i];
            }
        }
        if (this.renderTransparent) {
            for (var i = 0; i < transparentList.length; i++) {
                if (!transparentList[i].ignoreGBuffer) {
                    renderList[offset++] = transparentList[i];
                }
            }
        }
        renderList.length = offset;

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
            var gBufferMaterial1 = this._gBufferMaterial1;
            var passConfig = {
                getMaterial: function () {
                    return gBufferMaterial1;
                },
                beforeRender: getBeforeRenderHook1(gl, this._defaultNormalMap, this._defaultRoughnessMap),
                sortCompare: renderer.opaqueSortCompare
            };
            // FIXME Use MRT if possible
            renderer.renderPass(renderList, camera, passConfig);

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

            var gBufferMaterial2 = this._gBufferMaterial2;
            var passConfig = {
                getMaterial: function () {
                    return gBufferMaterial2;
                },
                beforeRender: getBeforeRenderHook2(gl, this._defaultDiffuseMap, this._defaultMetalnessMap),
                sortCompare: renderer.opaqueSortCompare
            };
            renderer.renderPass(renderList, camera, passConfig);
        }

        renderer.bindSceneRendering(null);
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
        debugPass.setUniform('viewProjectionInv', viewProjectionInv.array);
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
     * @return {clay.Texture2D}
     */
    getTargetTexture1: function () {
        return this._gBufferTex1;
    },

    /**
     * Get second target texture.
     * Channel storage:
     * + R: depth
     * @return {clay.Texture2D}
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
     * @return {clay.Texture2D}
     */
    getTargetTexture3: function () {
        return this._gBufferTex3;
    },


    /**
     * @param  {clay.Renderer} renderer
     */
    dispose: function (renderer) {
    }
});

export default GBuffer;
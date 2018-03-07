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

// TODO specularColor
// TODO Performance improvement
function getGetUniformHook1(gl, defaultNormalMap, defaultRoughnessMap, defaultDiffuseMap) {

    return function (renderable, gBufferMat, symbol) {
        var standardMaterial = renderable.material;
        if (symbol === 'doubleSided') {
            return standardMaterial.isDefined('fragment', 'DOUBLE_SIDED');
        }
        else if (symbol === 'uvRepeat' || symbol === 'uvOffset' || symbol === 'alpha') {
            return standardMaterial.get(symbol);
        }
        else if (symbol === 'normalMap') {
            return standardMaterial.get(symbol) || defaultNormalMap;
        }
        else if (symbol === 'diffuseMap') {
            return standardMaterial.get(symbol) || defaultDiffuseMap;
        }
        else if (symbol === 'alphaCutoff') {
            // TODO DIFFUSEMAP_ALPHA_ALPHA
            if (standardMaterial.isDefined('fragment', 'ALPHA_TEST')) {
                var alphaCutoff = standardMaterial.get('alphaCutoff');
                return alphaCutoff == null ? 1.0 : alphaCutoff;
            }
            return 1.0;
        }
        else {
            var useRoughnessWorkflow = standardMaterial.isDefined('fragment', 'USE_ROUGHNESS');
            var roughGlossMap = useRoughnessWorkflow ? standardMaterial.get('roughnessMap') : standardMaterial.get('glossinessMap');
            switch (symbol) {
                case 'glossiness':
                    return useRoughnessWorkflow ? (1.0 - standardMaterial.get('roughness')) : standardMaterial.get('glossiness');
                case 'roughGlossMap':
                    return roughGlossMap;
                case 'useRoughGlossMap':
                    return !!roughGlossMap;
                case 'useRoughness':
                    return useRoughnessWorkflow;
                case 'roughGlossChannel':
                    return useRoughnessWorkflow
                        ? standardMaterial.getDefine('fragment', 'ROUGHNESS_CHANNEL')
                        : standardMaterial.getDefine('fragment', 'GLOSSINESS_CHANNEL');
            }
        }
    };
}

function getGetUniformHook2(gl, defaultDiffuseMap, defaultMetalnessMap) {
    return function (renderable, gBufferMat, symbol) {
        var standardMaterial = renderable.material;
        switch (symbol) {
            case 'color':
            case 'uvRepeat':
            case 'uvOffset':
                return standardMaterial.get(symbol);
            case 'metalness':
                return standardMaterial.get('metalness') || 0;
            case 'diffuseMap':
                return standardMaterial.get(symbol) || defaultDiffuseMap;
            case 'metalnessMap':
                return standardMaterial.get(symbol) || defaultMetalnessMap;
            case 'useMetalnessMap':
                return !!standardMaterial.get('metalnessMap');
            case 'linear':
                return standardMaterial.isDefined('SRGB_DECODE');
        }
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

    return /** @lends clay.deferred.GBuffer# */ {

        enableTargetTexture1: true,

        enableTargetTexture2: true,

        enableTargetTexture3: true,

        renderTransparent: false,

        _gBufferRenderList: [],
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
     * Update GBuffer
     * @param {clay.Renderer} renderer
     * @param {clay.Scene} scene
     * @param {clay.Camera} camera
     */
    update: function (renderer, scene, camera) {

        var gl = renderer.gl;

        var frameBuffer = this._frameBuffer;
        var viewport = frameBuffer.viewport;

        var renderList = scene.updateRenderList(camera, true);

        var opaqueList = renderList.opaque;
        var transparentList = renderList.transparent;

        var offset = 0;
        var gBufferRenderList = this._gBufferRenderList;
        for (var i = 0; i < opaqueList.length; i++) {
            if (!opaqueList[i].ignoreGBuffer) {
                gBufferRenderList[offset++] = opaqueList[i];
            }
        }
        if (this.renderTransparent) {
            for (var i = 0; i < transparentList.length; i++) {
                if (!transparentList[i].ignoreGBuffer) {
                    gBufferRenderList[offset++] = transparentList[i];
                }
            }
        }
        gBufferRenderList.length = offset;

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
                getUniform: getGetUniformHook1(gl, this._defaultNormalMap, this._defaultRoughnessMap, this._defaultDiffuseMap),
                isMaterialChanged: function (renderable, prevRenderable, material, prevMaterial) {
                    return !prevRenderable || renderable.material !== prevRenderable.material;
                },
                sortCompare: renderer.opaqueSortCompare
            };
            // FIXME Use MRT if possible
            renderer.renderPass(gBufferRenderList, camera, passConfig);

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
                getUniform: getGetUniformHook2(gl, this._defaultDiffuseMap, this._defaultMetalnessMap),
                isMaterialChanged: function (renderable, prevRenderable, material, prevMaterial) {
                    return !prevRenderable || renderable.material !== prevRenderable.material;
                },
                sortCompare: renderer.opaqueSortCompare
            };
            renderer.renderPass(gBufferRenderList, camera, passConfig);
        }

        renderer.bindSceneRendering(null);
        frameBuffer.unbind(renderer);
    },

    /**
     * Debug output of gBuffer. Use `type` parameter to choos the debug output type, which can be:
     *
     * + 'normal'
     * + 'depth'
     * + 'position'
     * + 'glossiness'
     * + 'metalness'
     * + 'albedo'
     *
     * @param {clay.Renderer} renderer
     * @param {clay.Camera} camera
     * @param {string} [type='normal']
     */
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
        this._gBufferTex1.dispose(renderer);
        this._gBufferTex2.dispose(renderer);
        this._gBufferTex3.dispose(renderer);

        this._defaultNormalMap.dispose(renderer);
        this._defaultRoughnessMap.dispose(renderer);
        this._defaultMetalnessMap.dispose(renderer);
        this._defaultDiffuseMap.dispose(renderer);
        this._frameBuffer.dispose(renderer);
    }
});

export default GBuffer;
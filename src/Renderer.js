// TODO Resources like shader, texture, geometry reference management
// Trace and find out which shader, texture, geometry can be destroyed
//
// TODO prez skinning
import Base from './core/Base';
import GLInfo from './core/GLInfo';
import glenum from './core/glenum';
import vendor from './core/vendor';
import BoundingBox from './math/BoundingBox';
import Matrix4 from './math/Matrix4';
import shaderLibrary from './shader/library';
import Material from './Material';
import Vector2 from './math/Vector2';
import ProgramManager from './gpu/ProgramManager';

// Light header
import Shader from './Shader';

import lightShader from './shader/source/header/light';
import prezEssl from './shader/source/prez.glsl.js';
Shader['import'](lightShader);
Shader['import'](prezEssl);

import glMatrix from './dep/glmatrix';
var mat4 = glMatrix.mat4;
var vec3 = glMatrix.vec3;

var mat4Create = mat4.create;

var errorShader = {};

/**
 * @constructor qtek.Renderer
 */
var Renderer = Base.extend(function () {
    return /** @lends qtek.Renderer# */ {

        /**
         * @type {HTMLCanvasElement}
         * @readonly
         */
        canvas: null,

        /**
         * Canvas width, set by resize method
         * @type {number}
         * @private
         */
        _width: 100,

        /**
         * Canvas width, set by resize method
         * @type {number}
         * @private
         */
        _height: 100,

        /**
         * Device pixel ratio, set by setDevicePixelRatio method
         * Specially for high defination display
         * @see http://www.khronos.org/webgl/wiki/HandlingHighDPI
         * @type {number}
         * @private
         */
        devicePixelRatio: window.devicePixelRatio || 1.0,

        /**
         * Clear color
         * @type {number[]}
         */
        clearColor: [0.0, 0.0, 0.0, 0.0],

        /**
         * Default:
         *     _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT | _gl.STENCIL_BUFFER_BIT
         * @type {number}
         */
        clearBit: 17664,

        // Settings when getting context
        // http://www.khronos.org/registry/webgl/specs/latest/#2.4

        /**
         * If enable alpha, default true
         * @type {boolean}
         */
        alpha: true,
        /**
         * If enable depth buffer, default true
         * @type {boolean}
         */
        depth: true,
        /**
         * If enable stencil buffer, default false
         * @type {boolean}
         */
        stencil: false,
        /**
         * If enable antialias, default true
         * @type {boolean}
         */
        antialias: true,
        /**
         * If enable premultiplied alpha, default true
         * @type {boolean}
         */
        premultipliedAlpha: true,
        /**
         * If preserve drawing buffer, default false
         * @type {boolean}
         */
        preserveDrawingBuffer: false,
        /**
         * If throw context error, usually turned on in debug mode
         * @type {boolean}
         */
        throwError: true,
        /**
         * WebGL Context created from given canvas
         * @type {WebGLRenderingContext}
         */
        gl: null,
        /**
         * Renderer viewport, read-only, can be set by setViewport method
         * @type {Object}
         */
        viewport: {},

        // Set by FrameBuffer#bind
        __currentFrameBuffer: null,

        _viewportStack: [],
        _clearStack: [],

        _sceneRendering: null
    };
}, function () {

    if (!this.canvas) {
        this.canvas = document.createElement('canvas');
    }
    var canvas = this.canvas;
    try {
        var opts = {
            alpha: this.alpha,
            depth: this.depth,
            stencil: this.stencil,
            antialias: this.antialias,
            premultipliedAlpha: this.premultipliedAlpha,
            preserveDrawingBuffer: this.preserveDrawingBuffer
        };

        this.gl = canvas.getContext('webgl', opts)
            || canvas.getContext('experimental-webgl', opts);

        if (!this.gl) {
            throw new Error();
        }

        this._glinfo = new GLInfo(this.gl);

        if (this.gl.targetRenderer) {
            console.error('Already created a renderer');
        }
        this.gl.targetRenderer = this;

        this.resize();
    }
    catch (e) {
        throw 'Error creating WebGL Context ' + e;
    }

    // Init managers
    this._programMgr = new ProgramManager(this);
},
/** @lends qtek.Renderer.prototype. **/
{
    /**
     * Resize the canvas
     * @param {number} width
     * @param {number} height
     */
    resize: function(width, height) {
        var canvas = this.canvas;
        // http://www.khronos.org/webgl/wiki/HandlingHighDPI
        // set the display size of the canvas.
        var dpr = this.devicePixelRatio;
        if (width != null) {
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            // set the size of the drawingBuffer
            canvas.width = width * dpr;
            canvas.height = height * dpr;

            this._width = width;
            this._height = height;
        }
        else {
            this._width = canvas.width / dpr;
            this._height = canvas.height / dpr;
        }

        this.setViewport(0, 0, this._width, this._height);
    },

    /**
     * Get renderer width
     * @return {number}
     */
    getWidth: function () {
        return this._width;
    },

    /**
     * Get renderer height
     * @return {number}
     */
    getHeight: function () {
        return this._height;
    },

    /**
     * Get viewport aspect,
     * @return {number}
     */
    getViewportAspect: function () {
        var viewport = this.viewport;
        return viewport.width / viewport.height;
    },

    /**
     * Set devicePixelRatio
     * @param {number} devicePixelRatio
     */
    setDevicePixelRatio: function(devicePixelRatio) {
        this.devicePixelRatio = devicePixelRatio;
        this.resize(this._width, this._height);
    },

    /**
     * Get devicePixelRatio
     * @param {number} devicePixelRatio
     */
    getDevicePixelRatio: function () {
        return this.devicePixelRatio;
    },

    /**
     * Get WebGL extension
     * @param {string} name
     * @return {object}
     */
    getGLExtension: function (name) {
        return this._glinfo.getExtension(name);
    },

    /**
     * Get WebGL parameter
     * @param {string} name
     * @return {*}
     */
    getGLParameter: function (name) {
        return this._glinfo.getParameter(name);
    },

    /**
     * Set rendering viewport
     * @param {number|Object} x
     * @param {number} [y]
     * @param {number} [width]
     * @param {number} [height]
     * @param {number} [devicePixelRatio]
     *        Defaultly use the renderere devicePixelRatio
     *        It needs to be 1 when setViewport is called by frameBuffer
     *
     * @example
     *  setViewport(0,0,width,height,1)
     *  setViewport({
     *      x: 0,
     *      y: 0,
     *      width: width,
     *      height: height,
     *      devicePixelRatio: 1
     *  })
     */
    setViewport: function (x, y, width, height, dpr) {

        if (typeof x === 'object') {
            var obj = x;

            x = obj.x;
            y = obj.y;
            width = obj.width;
            height = obj.height;
            dpr = obj.devicePixelRatio;
        }
        dpr = dpr || this.devicePixelRatio;

        this.gl.viewport(
            x * dpr, y * dpr, width * dpr, height * dpr
        );
        // Use a fresh new object, not write property.
        this.viewport = {
            x: x,
            y: y,
            width: width,
            height: height,
            devicePixelRatio: dpr
        };
    },

    /**
     * Push current viewport into a stack
     */
    saveViewport: function () {
        this._viewportStack.push(this.viewport);
    },

    /**
     * Pop viewport from stack, restore in the renderer
     */
    restoreViewport: function () {
        if (this._viewportStack.length > 0) {
            this.setViewport(this._viewportStack.pop());
        }
    },

    /**
     * Push current clear into a stack
     */
    saveClear: function () {
        this._clearStack.push({
            clearBit: this.clearBit,
            clearColor: this.clearColor
        });
    },

    /**
     * Pop clear from stack, restore in the renderer
     */
    restoreClear: function () {
        if (this._clearStack.length > 0) {
            var opt = this._clearStack.pop();
            this.clearColor = opt.clearColor;
            this.clearBit = opt.clearBit;
        }
    },

    bindSceneRendering: function (scene) {
        this._sceneRendering = scene;
    },

    // Hook before and after render each object
    beforeRenderObject: function () {},
    afterRenderObject: function () {},
    /**
     * Render the scene in camera to the screen or binded offline framebuffer
     * @param  {qtek.Scene}       scene
     * @param  {qtek.Camera}      camera
     * @param  {boolean}     [notUpdateScene] If not call the scene.update methods in the rendering, default true
     * @param  {boolean}     [preZ]           If use preZ optimization, default false
     * @return {IRenderInfo}
     */
    render: function(scene, camera, notUpdateScene, preZ) {
        var _gl = this.gl;

        this._sceneRendering = scene;

        var clearColor = this.clearColor;

        if (this.clearBit) {

            // Must set depth and color mask true before clear
            _gl.colorMask(true, true, true, true);
            _gl.depthMask(true);
            var viewport = this.viewport;
            var needsScissor = false;
            var viewportDpr = viewport.devicePixelRatio;
            if (viewport.width !== this._width || viewport.height !== this._height
                || (viewportDpr && viewportDpr !== this.devicePixelRatio)
                || viewport.x || viewport.y
            ) {
                needsScissor = true;
                // http://stackoverflow.com/questions/11544608/how-to-clear-a-rectangle-area-in-webgl
                // Only clear the viewport
                _gl.enable(_gl.SCISSOR_TEST);
                _gl.scissor(viewport.x * viewportDpr, viewport.y * viewportDpr, viewport.width * viewportDpr, viewport.height * viewportDpr);
            }
            _gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
            _gl.clear(this.clearBit);
            if (needsScissor) {
                _gl.disable(_gl.SCISSOR_TEST);
            }
        }

        // If the scene have been updated in the prepass like shadow map
        // There is no need to update it again
        if (!notUpdateScene) {
            scene.update(false);
        }
        // Update if camera not mounted on the scene
        if (!camera.getScene()) {
            camera.update(true);
        }

        // Reset the scene bounding box;
        scene.viewBoundingBoxLastFrame.min.set(Infinity, Infinity, Infinity);
        scene.viewBoundingBoxLastFrame.max.set(-Infinity, -Infinity, -Infinity);

        var opaqueQueue = this.cullRenderQueue(scene.opaqueQueue, scene, camera);
        var transparentQueue = this.cullRenderQueue(scene.transparentQueue, scene, camera);
        var sceneMaterial = scene.material;

        scene.trigger('beforerender', this, scene, camera);

        // Render pre z
        if (preZ) {
            this.renderPreZ(opaqueQueue, scene, camera);
        }
        _gl.depthFunc(_gl.LESS);

        this.prepareRenderQueue(opaqueQueue, scene, camera, sceneMaterial, false);
        this.prepareRenderQueue(transparentQueue, scene, camera, sceneMaterial, true);

        // Render Opaque queue
        scene.trigger('beforerender:opaque', this, opaqueQueue);

        var opaqueRenderInfo = this.renderQueue(opaqueQueue, camera, sceneMaterial);

        scene.trigger('afterrender:opaque', this, opaqueQueue, opaqueRenderInfo);
        scene.trigger('beforerender:transparent', this, transparentQueue);

        var transparentRenderInfo = this.renderQueue(transparentQueue, camera, sceneMaterial);

        scene.trigger('afterrender:transparent', this, transparentQueue, transparentRenderInfo);
        var renderInfo = {};
        for (var name in opaqueRenderInfo) {
            renderInfo[name] = opaqueRenderInfo[name] + transparentRenderInfo[name];
        }

        scene.trigger('afterrender', this, scene, camera, renderInfo);

        // Cleanup
        this._sceneRendering = null;
        return renderInfo;
    },

    getProgram: function (renderable, renderMaterial, scene) {
        return this._programMgr.getProgram(renderable, renderMaterial, scene);
    },

    validateProgram: function (program) {
        if (program.__error) {
            var errorMsg = program.__error;
            if (errorShader[program.__uid__]) {
                return;
            }
            errorShader[program.__uid__] = true;

            if (this.throwError) {
                throw new Error(errorMsg);
            }
            else {
                this.trigger('error', errorMsg);
            }
        }

    },

    updatePrograms: function (queue, scene, globalMaterial) {
        scene = scene || null;
        // Sort based on material.
        // PENDING
        if (!globalMaterial) {
            queue.sort(function (a, b) {
                return a.material.__uid__ - b.material.__uid__;
            });
        }
        for (var i = 0; i < queue.length; i++) {
            var renderable = queue[i];
            var renderMaterial = globalMaterial || renderable.material;
            if (i > 0) {
                var prevRenderable = queue[i - 1];
                var prevJointsLen = prevRenderable.joints ? prevRenderable.joints.length : 0;
                var jointsLen = renderable.joints.length ? renderable.joints.length : 0;
                // Keep program not change if joints, material, lightGroup are same of two renderables.
                if (jointsLen === prevJointsLen
                    && renderable.material === prevRenderable.material
                    && renderable.lightGroup === prevRenderable.lightGroup
                ) {
                    renderable.__program = prevRenderable.__program;
                    continue;
                }
            }

            var program = this._programMgr.getProgram(renderable, renderMaterial, scene);

            this.validateProgram(program);

            renderable.__program = program;
        }
    },

    // resetRenderStatus: function () {
    //     this._currentShader = null;
    // },

    /**
     * Callback during rendering process to determine if render given renderable.
     * @param {qtek.Renderable} given renderable.
     * @return {boolean}
     */
    ifRenderObject: function (obj) {
        return true;
    },

    /**
     * Do frustum culling on render queue
     */
    cullRenderQueue: function (queue, scene, camera) {
        var culledRenderQueue = [];
        for (var i = 0; i < queue.length; i++) {
            var renderable = queue[i];
            // PENDING
            if (!this.ifRenderObject(renderable)) {
                continue;
            }

            var worldM = renderable.isSkinnedMesh() ? matrices.IDENTITY : renderable.worldTransform._array;
            var geometry = renderable.geometry;

            mat4.multiplyAffine(matrices.WORLDVIEW, camera.viewMatrix._array , worldM);
            if (geometry.boundingBox) {
                if (this.isFrustumCulled(
                    renderable, scene, camera, matrices.WORLDVIEW, camera.projectionMatrix._array
                )) {
                    continue;
                }
            }

            culledRenderQueue.push(renderable);
        }

        return culledRenderQueue;
    },
    /**
     * Prepare for rendering a queue.
     * @param  {qtek.Renderable[]} queue List of all renderables.
     * @param  {qtek.Camera} camera
     * @param  {qtek.Material} [globalMaterial] globalMaterial will override the material of each renderable
     * @param  {boolean} [transparent]
     */
    prepareRenderQueue: function (queue, scene, camera, globalMaterial, transparent) {
        if (queue.length === 0) {
            return;
        }
        // Sort transparent queue
        // Calculate the object depth
        if (transparent && queue.length) {
            var worldViewMat = mat4Create();
            var posViewSpace = vec3.create();
            for (var i = 0; i < queue.length; i++) {
                var renderable = queue[i];
                mat4.multiplyAffine(worldViewMat, camera.viewMatrix._array, renderable.worldTransform._array);
                vec3.transformMat4(posViewSpace, renderable.position._array, worldViewMat);
                renderable.__depth = posViewSpace[2];
            }
        }

        this.updatePrograms(queue, scene, globalMaterial);

        queue.sort(transparent ? this.opaqueSortFunc : this.transparentSortFunc);
    },

    /**
     * Render a single renderable list in camera in sequence
     * @param  {qtek.Renderable[]} queue List of all renderables.
     * @param  {qtek.Camera} camera
     * @param  {qtek.Material} [globalMaterial] globalMaterial will override the material of each renderable
     * @return {IRenderInfo}
     */
    renderQueue: function(queue, camera, globalMaterial) {
        var renderInfo = {
            triangleCount: 0,
            vertexCount: 0,
            drawCallCount: 0,
            meshCount: queue.length,
            renderedMeshCount: 0
        };

        // Some common builtin uniforms
        var viewport = this.viewport;
        var vDpr = viewport.devicePixelRatio;
        var viewportUniform = [
            viewport.x * vDpr, viewport.y * vDpr,
            viewport.width * vDpr, viewport.height * vDpr
        ];
        var windowDpr = this.devicePixelRatio;
        var windowSizeUniform = this.__currentFrameBuffer
            ? [this.__currentFrameBuffer.getTextureWidth(), this.__currentFrameBuffer.getTextureHeight()]
            : [this._width * windowDpr, this._height * windowDpr];
        // DEPRECATED
        var viewportSizeUniform = [
            viewportUniform[2], viewportUniform[3]
        ];
        var time = Date.now();

        // Calculate view and projection matrix
        mat4.copy(matrices.VIEW, camera.viewMatrix._array);
        mat4.copy(matrices.PROJECTION, camera.projectionMatrix._array);
        mat4.multiply(matrices.VIEWPROJECTION, camera.projectionMatrix._array, matrices.VIEW);
        mat4.copy(matrices.VIEWINVERSE, camera.worldTransform._array);
        mat4.invert(matrices.PROJECTIONINVERSE, matrices.PROJECTION);
        mat4.invert(matrices.VIEWPROJECTIONINVERSE, matrices.VIEWPROJECTION);

        var _gl = this.gl;
        var scene = this._sceneRendering;

        var prevMaterial;
        var prevProgram;

        // Status
        var depthTest, depthMask;
        var culling, cullFace, frontFace;
        var transparent;

        for (var i = 0; i < queue.length; i++) {
            var renderable = queue[i];
            if (!this.ifRenderObject(renderable)) {
                continue;
            }

            // Skinned mesh will transformed to joint space. Ignore the mesh transform
            var worldM = renderable.isSkinnedMesh() ? matrices.IDENTITY : renderable.worldTransform._array;

            var material = globalMaterial || renderable.material;

            var program = renderable.__program;
            if (!program) {
                // If updatePrograms is not called before render. In case like render skybox.
                program = this._programMgr.getProgram(renderable, material, scene);
                this.validateProgram(program);
                renderable.__program = program;
            }

            var shader = material.shader;

            mat4.copy(matrices.WORLD, worldM);
            mat4.multiply(matrices.WORLDVIEWPROJECTION, matrices.VIEWPROJECTION , worldM);
            if (shader.matrixSemantics.WORLDINVERSE ||
                shader.matrixSemantics.WORLDINVERSETRANSPOSE) {
                mat4.invert(matrices.WORLDINVERSE, worldM);
            }
            if (shader.matrixSemantics.WORLDVIEWINVERSE ||
                shader.matrixSemantics.WORLDVIEWINVERSETRANSPOSE) {
                mat4.invert(matrices.WORLDVIEWINVERSE, matrices.WORLDVIEW);
            }
            if (shader.matrixSemantics.WORLDVIEWPROJECTIONINVERSE ||
                shader.matrixSemantics.WORLDVIEWPROJECTIONINVERSETRANSPOSE) {
                mat4.invert(matrices.WORLDVIEWPROJECTIONINVERSE, matrices.WORLDVIEWPROJECTION);
            }

            // FIXME Optimize for compositing.
            // var prevShader = this._sceneRendering ? null : this._currentShader;
            // var prevShader = null;

            // Before render hook
            renderable.beforeRender(this);
            this.beforeRenderObject(renderable, material, prevMaterial);

            var programChanged = program !== prevProgram;
            if (programChanged) {
                // Set lights number
                program.bind(this);
                // Set some common uniforms
                program.setUniformOfSemantic(_gl, 'VIEWPORT', viewportUniform);
                program.setUniformOfSemantic(_gl, 'WINDOW_SIZE', windowSizeUniform);
                program.setUniformOfSemantic(_gl, 'NEAR', camera.near);
                program.setUniformOfSemantic(_gl, 'FAR', camera.far);
                program.setUniformOfSemantic(_gl, 'DEVICEPIXELRATIO', vDpr);
                program.setUniformOfSemantic(_gl, 'TIME', time);
                // DEPRECATED
                program.setUniformOfSemantic(_gl, 'VIEWPORT_SIZE', viewportSizeUniform);

                // Set lights uniforms
                // TODO needs optimized
                if (scene) {
                    scene.setLightUniforms(program, renderable.lightGroup, this);
                }

                // Save current used shader in the renderer
                // ALWAYS USE RENDERER TO DRAW THE MESH
                // this._currentShader = shader;
            }
            else {
                program = prevProgram;
            }

            if (prevMaterial !== material) {
                if (material.depthTest !== depthTest) {
                    material.depthTest
                        ? _gl.enable(_gl.DEPTH_TEST)
                        : _gl.disable(_gl.DEPTH_TEST);
                    depthTest = material.depthTest;
                }
                if (material.depthMask !== depthMask) {
                    _gl.depthMask(material.depthMask);
                    depthMask = material.depthMask;
                }
                if (material.transparent !== transparent) {
                    material.transparent
                        ? _gl.enable(_gl.BLEND)
                        : _gl.disable(_gl.BLEND);
                    transparent = material.transparent;
                }
                // TODO cache blending
                if (material.transparent) {
                    if (material.blend) {
                        material.blend(_gl);
                    }
                    else {
                        // Default blend function
                        _gl.blendEquationSeparate(_gl.FUNC_ADD, _gl.FUNC_ADD);
                        _gl.blendFuncSeparate(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA, _gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);
                    }
                }

                material.bind(this, program, prevMaterial, prevProgram);
                prevMaterial = material;
            }

            var matrixSemanticKeys = shader.matrixSemanticKeys;
            for (var k = 0; k < matrixSemanticKeys.length; k++) {
                var semantic = matrixSemanticKeys[k];
                var semanticInfo = shader.matrixSemantics[semantic];
                var matrix = matrices[semantic];
                if (semanticInfo.isTranspose) {
                    var matrixNoTranspose = matrices[semanticInfo.semanticNoTranspose];
                    mat4.transpose(matrix, matrixNoTranspose);
                }
                program.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, matrix);
            }

            if (renderable.cullFace !== cullFace) {
                cullFace = renderable.cullFace;
                _gl.cullFace(cullFace);
            }
            if (renderable.frontFace !== frontFace) {
                frontFace = renderable.frontFace;
                _gl.frontFace(frontFace);
            }
            if (renderable.culling !== culling) {
                culling = renderable.culling;
                culling ? _gl.enable(_gl.CULL_FACE) : _gl.disable(_gl.CULL_FACE);
            }

            var objectRenderInfo = renderable.render(this, material, program);

            if (objectRenderInfo) {
                renderInfo.triangleCount += objectRenderInfo.triangleCount;
                renderInfo.vertexCount += objectRenderInfo.vertexCount;
                renderInfo.drawCallCount += objectRenderInfo.drawCallCount;
                renderInfo.renderedMeshCount ++;
            }

            // After render hook
            this.afterRenderObject(renderable, objectRenderInfo);
            renderable.afterRender(this, objectRenderInfo);

            prevProgram = program;
        }

        // Remove programs incase it's not updated in the other passes.
        for (var i = 0; i < queue.length; i++) {
            queue[i].__program = null;
        }

        return renderInfo;
    },

    renderPreZ: function (queue, scene, camera) {
        var _gl = this.gl;
        var preZPassMaterial = this._prezMaterial || new Material({
            shader: new Shader(Shader.source('qtek.prez.vertex'), Shader.source('qtek.prez.fragment'))
        });
        this._prezMaterial = preZPassMaterial;

        this.updatePrograms(queue, scene, preZPassMaterial);
        queue.sort(this.opaqueSortFunc);

        _gl.colorMask(false, false, false, false);
        _gl.depthMask(true);

        // Status
        this.renderQueue(queue, camera, preZPassMaterial);

        _gl.colorMask(true, true, true, true);
        _gl.depthMask(true);
    },

    /**
     * If an scene object is culled by camera frustum
     *
     * Object can be a renderable or a light
     *
     * @param {qtek.Node} Scene object
     * @param {qtek.Camera} camera
     * @param {Array.<number>} worldViewMat represented with array
     * @param {Array.<number>} projectionMat represented with array
     */
    isFrustumCulled: (function () {
        // Frustum culling
        // http://www.cse.chalmers.se/~uffe/vfc_bbox.pdf
        var cullingBoundingBox = new BoundingBox();
        var cullingMatrix = new Matrix4();
        return function (object, scene, camera, worldViewMat, projectionMat) {
            // Bounding box can be a property of object(like light) or renderable.geometry
            var geoBBox = object.boundingBox || object.geometry.boundingBox;
            cullingMatrix._array = worldViewMat;
            cullingBoundingBox.copy(geoBBox);
            cullingBoundingBox.applyTransform(cullingMatrix);

            // Passingly update the scene bounding box
            // FIXME exclude very large mesh like ground plane or terrain ?
            // FIXME Only rendererable which cast shadow ?

            // FIXME boundingBox becomes much larger after transformd.
            if (scene && object.isRenderable() && object.castShadow) {
                scene.viewBoundingBoxLastFrame.union(cullingBoundingBox);
            }
            // Ignore frustum culling if object is skinned mesh.
            if (object.frustumCulling && !object.isSkinnedMesh())  {
                if (!cullingBoundingBox.intersectBoundingBox(camera.frustum.boundingBox)) {
                    return true;
                }

                cullingMatrix._array = projectionMat;
                if (
                    cullingBoundingBox.max._array[2] > 0 &&
                    cullingBoundingBox.min._array[2] < 0
                ) {
                    // Clip in the near plane
                    cullingBoundingBox.max._array[2] = -1e-20;
                }

                cullingBoundingBox.applyProjection(cullingMatrix);

                var min = cullingBoundingBox.min._array;
                var max = cullingBoundingBox.max._array;

                if (
                    max[0] < -1 || min[0] > 1
                    || max[1] < -1 || min[1] > 1
                    || max[2] < -1 || min[2] > 1
                ) {
                    return true;
                }
            }

            return false;
        };
    })(),

    /**
     * Dispose given scene, including all geometris, textures and shaders in the scene
     * @param {qtek.Scene} scene
     */
    disposeScene: function(scene) {
        this.disposeNode(scene, true, true);
        scene.dispose();
    },

    /**
     * Dispose given node, including all geometries, textures and shaders attached on it or its descendant
     * @param {qtek.Node} node
     * @param {boolean} [disposeGeometry=false] If dispose the geometries used in the descendant mesh
     * @param {boolean} [disposeTexture=false] If dispose the textures used in the descendant mesh
     */
    disposeNode: function(root, disposeGeometry, disposeTexture) {
        var materials = {};
        // Dettached from parent
        if (root.getParent()) {
            root.getParent().remove(root);
        }
        root.traverse(function(node) {
            if (node.geometry && disposeGeometry) {
                node.geometry.dispose(this);
            }
            if (node.material) {
                materials[node.material.__uid__] = node.material;
            }
            // Particle system and AmbientCubemap light need to dispose
            if (node.dispose) {
                node.dispose(this);
            }
        }, this);
        for (var guid in materials) {
            var mat = materials[guid];
            mat.dispose(this, disposeTexture);
        }
    },

    /**
     * Dispose given shader
     * @param {qtek.Shader} shader
     */
    disposeShader: function(shader) {
        shader.dispose(this);
    },

    /**
     * Dispose given geometry
     * @param {qtek.Geometry} geometry
     */
    disposeGeometry: function(geometry) {
        geometry.dispose(this);
    },

    /**
     * Dispose given texture
     * @param {qtek.Texture} texture
     */
    disposeTexture: function(texture) {
        texture.dispose(this);
    },

    /**
     * Dispose given frame buffer
     * @param {qtek.FrameBuffer} frameBuffer
     */
    disposeFrameBuffer: function(frameBuffer) {
        frameBuffer.dispose(this);
    },

    /**
     * Dispose renderer
     */
    dispose: function () {},

    /**
     * Convert screen coords to normalized device coordinates(NDC)
     * Screen coords can get from mouse event, it is positioned relative to canvas element
     * NDC can be used in ray casting with Camera.prototype.castRay methods
     *
     * @param  {number}       x
     * @param  {number}       y
     * @param  {qtek.math.Vector2} [out]
     * @return {qtek.math.Vector2}
     */
    screenToNDC: function(x, y, out) {
        if (!out) {
            out = new Vector2();
        }
        // Invert y;
        y = this._height - y;

        var viewport = this.viewport;
        var arr = out._array;
        arr[0] = (x - viewport.x) / viewport.width;
        arr[0] = arr[0] * 2 - 1;
        arr[1] = (y - viewport.y) / viewport.height;
        arr[1] = arr[1] * 2 - 1;

        return out;
    }
});

/**
 * Opaque renderables compare function
 * @param  {qtek.Renderable} x
 * @param  {qtek.Renderable} y
 * @return {boolean}
 * @static
 */
Renderer.opaqueSortFunc = Renderer.prototype.opaqueSortFunc = function(x, y) {
    // Priority renderOrder -> program -> material -> geometry
    if (x.renderOrder === y.renderOrder) {
        if (x.__program === y.__program) {
            if (x.material === y.material) {
                return x.geometry.__uid__ - y.geometry.__uid__;
            }
            return x.material.__uid__ - y.material.__uid__;
        }
        if (x.__program  && y.__program) {
            return x.__program.__uid__ - y.__program.__uid__;
        }
        return 0;
    }
    return x.renderOrder - y.renderOrder;
};

/**
 * Transparent renderables compare function
 * @param  {qtek.Renderable} a
 * @param  {qtek.Renderable} b
 * @return {boolean}
 * @static
 */
Renderer.transparentSortFunc = Renderer.prototype.transparentSortFunc = function(x, y) {
    // Priority renderOrder -> depth -> program -> material -> geometry

    if (x.renderOrder === y.renderOrder) {
        if (x.__depth === y.__depth) {
            if (x.__program === y.__program) {
                if (x.material === y.material) {
                    return x.geometry.__uid__ - y.geometry.__uid__;
                }
                return x.material.__uid__ - y.material.__uid__;
            }
            if (x.__program  && y.__program) {
                return x.__program.__uid__ - y.__program.__uid__;
            }
            return 0;
        }
        // Depth is negative
        // So farther object has smaller depth value
        return x.__depth - y.__depth;
    }
    return x.renderOrder - y.renderOrder;
};

// Temporary variables
var matrices = {
    IDENTITY: mat4Create(),

    WORLD: mat4Create(),
    VIEW: mat4Create(),
    PROJECTION: mat4Create(),
    WORLDVIEW: mat4Create(),
    VIEWPROJECTION: mat4Create(),
    WORLDVIEWPROJECTION: mat4Create(),

    WORLDINVERSE: mat4Create(),
    VIEWINVERSE: mat4Create(),
    PROJECTIONINVERSE: mat4Create(),
    WORLDVIEWINVERSE: mat4Create(),
    VIEWPROJECTIONINVERSE: mat4Create(),
    WORLDVIEWPROJECTIONINVERSE: mat4Create(),

    WORLDTRANSPOSE: mat4Create(),
    VIEWTRANSPOSE: mat4Create(),
    PROJECTIONTRANSPOSE: mat4Create(),
    WORLDVIEWTRANSPOSE: mat4Create(),
    VIEWPROJECTIONTRANSPOSE: mat4Create(),
    WORLDVIEWPROJECTIONTRANSPOSE: mat4Create(),
    WORLDINVERSETRANSPOSE: mat4Create(),
    VIEWINVERSETRANSPOSE: mat4Create(),
    PROJECTIONINVERSETRANSPOSE: mat4Create(),
    WORLDVIEWINVERSETRANSPOSE: mat4Create(),
    VIEWPROJECTIONINVERSETRANSPOSE: mat4Create(),
    WORLDVIEWPROJECTIONINVERSETRANSPOSE: mat4Create()
};

/**
 * @name qtek.Renderer.COLOR_BUFFER_BIT
 * @type {number}
 */
Renderer.COLOR_BUFFER_BIT = glenum.COLOR_BUFFER_BIT;
/**
 * @name qtek.Renderer.DEPTH_BUFFER_BIT
 * @type {number}
 */
Renderer.DEPTH_BUFFER_BIT = glenum.DEPTH_BUFFER_BIT;
/**
 * @name qtek.Renderer.STENCIL_BUFFER_BIT
 * @type {number}
 */
Renderer.STENCIL_BUFFER_BIT = glenum.STENCIL_BUFFER_BIT;

export default Renderer;

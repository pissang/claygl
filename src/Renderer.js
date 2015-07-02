// TODO Resources like shader, texture, geometry reference management
// Trace and find out which shader, texture, geometry can be destroyed
// 
// TODO prez shader dependency
define(function(require) {

    'use strict';

    var Base = require('./core/Base');
    var Texture = require('./Texture');
    var glinfo = require('./core/glinfo');
    var glenum = require('./core/glenum');
    var BoundingBox = require('./math/BoundingBox');
    var Matrix4 = require('./math/Matrix4');
    var shaderLibrary = require('./shader/library');
    var Material = require('./Material');
    var Vector2 = require('./math/Vector2');

    var Shader = require('./Shader');
    Shader['import'](require('./shader/source/header/light'));

    var glMatrix = require('./dep/glmatrix');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var mat4Create = mat4.create;

    var glid = 0;

    var errorShader = {};

    /**
     * @constructor qtek.Renderer
     */
    var Renderer = Base.derive(function() {
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
            color: [0.0, 0.0, 0.0, 0.0],
            
            /**
             * Default:
             *     _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT | _gl.STENCIL_BUFFER_BIT
             * @type {number}
             */
            clear: 17664,  

            // Settings when getting context
            // http://www.khronos.org/registry/webgl/specs/latest/#2.4

            /**
             * If enable alpha, default true
             * @type {boolean}
             */
            alhpa: true,
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

            _viewportSettings: [],
            _clearSettings: [],

            _sceneRendering: null
        };
    }, function () {

        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }
        var canvas = this.canvas;
        try {
            var opts = {
                alhpa: this.alhpa,
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
            
            if (this.gl.__GLID__ == null) {
                // gl context is not created
                // Otherwise is the case mutiple renderer share the same gl context
                this.gl.__GLID__ = glid++;

                glinfo.initialize(this.gl);
            } 

            this.resize();
        } catch(e) {
            throw 'Error creating WebGL Context ' + e;
        }
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
            if (typeof(width) !== 'undefined') {
                canvas.style.width = width + 'px';
                canvas.style.height = height + 'px';
                // set the size of the drawingBuffer
                canvas.width = width * dpr;
                canvas.height = height * dpr;

                this._width = width;
                this._height = height;
            } else {
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
         * Get WebGL extionsion
         * @return {object}
         */
        getExtension: function (name) {
            return glinfo.getExtension(this.gl, name);
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
         */
        setViewport: function(x, y, width, height, dpr) {

            if (typeof(x) === 'object') {
                var obj = x;
                x = obj.x;
                y = obj.y;
                width = obj.width;
                height = obj.height;
            }
            dpr = dpr || this.devicePixelRatio;

            this.gl.viewport(
                x * dpr, y * dpr, width * dpr, height * dpr
            );

            this.viewport = {
                x: x,
                y: y,
                width: width,
                height: height
            };
        },

        /**
         * Push current viewport into a stack
         */
        saveViewport: function() {
            this._viewportSettings.push(this.viewport);
        },

        /**
         * Pop viewport from stack, restore in the renderer
         */
        restoreViewport: function() {
            if (this._viewportSettings.length > 0) {
                this.setViewport(this._viewportSettings.pop());
            }
        },

        /**
         * Push current clear into a stack
         */
        saveClear: function() {
            this._clearSettings.push(this.clear);
        },

        /**
         * Pop clear from stack, restore in the renderer
         */
        restoreClear: function() {
            if (this._clearSettings.length > 0) {
                this.clear = this._clearSettings.pop();   
            }
        },
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

            var color = this.color;

            if (this.clear) {
                // Must set depth and color mask true before clear
                _gl.colorMask(true, true, true, true);
                _gl.depthMask(true);

                _gl.clearColor(color[0], color[1], color[2], color[3]);
                _gl.clear(this.clear);
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

            var opaqueQueue = scene.opaqueQueue;
            var transparentQueue = scene.transparentQueue;
            var sceneMaterial = scene.material;

            scene.trigger('beforerender', this, scene, camera);
            // Sort render queue
            // Calculate the object depth
            if (transparentQueue.length > 0) {
                var worldViewMat = mat4Create();
                var posViewSpace = vec3.create();
                for (var i = 0; i < transparentQueue.length; i++) {
                    var node = transparentQueue[i];
                    mat4.multiply(worldViewMat, camera.viewMatrix._array, node.worldTransform._array);
                    vec3.transformMat4(posViewSpace, node.position._array, worldViewMat);
                    node.__depth = posViewSpace[2];
                }
            }
            opaqueQueue.sort(Renderer.opaqueSortFunc);
            transparentQueue.sort(Renderer.transparentSortFunc);

            // Render Opaque queue
            scene.trigger('beforerender:opaque', this, opaqueQueue);

            // Reset the scene bounding box;
            camera.sceneBoundingBoxLastFrame.min.set(Infinity, Infinity, Infinity);
            camera.sceneBoundingBoxLastFrame.max.set(-Infinity, -Infinity, -Infinity);

            _gl.disable(_gl.BLEND);
            _gl.enable(_gl.DEPTH_TEST);
            var opaqueRenderInfo = this.renderQueue(opaqueQueue, camera, sceneMaterial, preZ);

            scene.trigger('afterrender:opaque', this, opaqueQueue, opaqueRenderInfo);
            scene.trigger('beforerender:transparent', this, transparentQueue);

            // Render Transparent Queue
            _gl.enable(_gl.BLEND);
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

        /**
         * Render a single renderable list in camera in sequence
         * @param  {qtek.Renderable[]} queue       List of all renderables.
         *                                         Best to be sorted by Renderer.opaqueSortFunc or Renderer.transparentSortFunc
         * @param  {qtek.Camera}       camera
         * @param  {qtek.Material}     [globalMaterial] globalMaterial will override the material of each renderable
         * @param  {boolean}           [preZ]           If use preZ optimization, default false
         * @return {IRenderInfo}
         */
        renderQueue: function(queue, camera, globalMaterial, preZ) {
            var renderInfo = {
                faceNumber: 0,
                vertexNumber: 0,
                drawCallNumber: 0,
                meshNumber: queue.length,
                renderedMeshNumber: 0
            };

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
            var prevShader;
                
            // Status 
            var depthTest, depthMask;
            var culling, cullFace, frontFace;

            var culledRenderQueue;
            if (preZ) {
                var preZPassMaterial = new Material({
                    shader: shaderLibrary.get('buildin.prez')
                });
                var preZPassShader = preZPassMaterial.shader;

                culledRenderQueue = [];
                preZPassShader.bind(_gl);
                _gl.colorMask(false, false, false, false);
                _gl.depthMask(true);
                _gl.enable(_gl.DEPTH_TEST);
                for (var i = 0; i < queue.length; i++) {
                    var renderable = queue[i];
                    var worldM = renderable.worldTransform._array;
                    var geometry = renderable.geometry;
                    mat4.multiply(matrices.WORLDVIEW, matrices.VIEW , worldM);
                    mat4.multiply(matrices.WORLDVIEWPROJECTION, matrices.VIEWPROJECTION , worldM);

                    if (geometry.boundingBox) {
                        if (this.isFrustumCulled(
                            renderable, camera, matrices.WORLDVIEW, matrices.PROJECTION
                        )) {
                            continue;
                        }
                    }
                    if (renderable.skeleton) {  // Skip skinned mesh
                        continue;
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

                    var semanticInfo = preZPassShader.matrixSemantics.WORLDVIEWPROJECTION;
                    preZPassShader.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, matrices.WORLDVIEWPROJECTION);
                    renderable.render(_gl, preZPassMaterial);
                    culledRenderQueue.push(renderable);
                }
                _gl.depthFunc(_gl.LEQUAL);
                _gl.colorMask(true, true, true, true);
                _gl.depthMask(false);
            } else {
                culledRenderQueue = queue;
            }

            culling = null;
            cullFace = null;
            frontFace = null;

            for (var i =0; i < culledRenderQueue.length; i++) {
                var renderable = culledRenderQueue[i];
                var material = globalMaterial || renderable.material;
                var shader = material.shader;
                var geometry = renderable.geometry;

                var worldM = renderable.worldTransform._array;
                // All matrices ralated to world matrix will be updated on demand;
                mat4.copy(matrices.WORLD, worldM);
                mat4.multiply(matrices.WORLDVIEW, matrices.VIEW , worldM);
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
                if (geometry.boundingBox && ! preZ) {
                    if (this.isFrustumCulled(
                        renderable, camera, matrices.WORLDVIEW, matrices.PROJECTION
                    )) {
                        continue;
                    }
                }

                if (prevShader !== shader) {
                    // Set lights number
                    if (scene && scene.isShaderLightNumberChanged(shader)) {
                        scene.setShaderLightNumber(shader);
                    }

                    var errMsg = shader.bind(_gl);
                    if (errMsg) {

                        if (errorShader[shader.__GUID__]) {
                            continue;
                        }
                        errorShader[shader.__GUID__] = true;

                        if (this.throwError) {
                            throw new Error(errMsg);
                        } else {
                            this.trigger('error', errMsg);
                        }
                    }

                    // Set lights uniforms
                    // TODO needs optimized
                    if (scene) {
                        scene.setLightUniforms(shader, _gl);
                    }
                    prevShader = shader;
                }
                if (prevMaterial !== material) {
                    if (!preZ) {
                        if (material.depthTest !== depthTest) {
                            material.depthTest ? 
                                _gl.enable(_gl.DEPTH_TEST) : 
                                _gl.disable(_gl.DEPTH_TEST);
                            depthTest = material.depthTest;
                        }
                        if (material.depthMask !== depthMask) {
                            _gl.depthMask(material.depthMask);
                            depthMask = material.depthMask;
                        }
                    }
                    material.bind(_gl, prevMaterial);
                    prevMaterial = material;

                    // TODO cache blending
                    if (material.transparent) {
                        if (material.blend) {
                            material.blend(_gl);
                        } else {    // Default blend function
                            _gl.blendEquationSeparate(_gl.FUNC_ADD, _gl.FUNC_ADD);
                            _gl.blendFuncSeparate(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA, _gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);
                        } 
                    }
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
                    shader.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, matrix);
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

                var objectRenderInfo = renderable.render(_gl, globalMaterial);

                if (objectRenderInfo) {
                    renderInfo.faceNumber += objectRenderInfo.faceNumber;
                    renderInfo.vertexNumber += objectRenderInfo.vertexNumber;
                    renderInfo.drawCallNumber += objectRenderInfo.drawCallNumber;
                    renderInfo.renderedMeshNumber ++;
                }
            }

            if (preZ) {
                // default depth func
                _gl.depthFunc(_gl.LESS);
            }

            return renderInfo;
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
        isFrustumCulled: (function() {
            // Frustum culling
            // http://www.cse.chalmers.se/~uffe/vfc_bbox.pdf
            var cullingBoundingBox = new BoundingBox();
            var cullingMatrix = new Matrix4();
            return function(object, camera, worldViewMat, projectionMat) {
                // Bounding box can be a property of object(like light) or renderable.geometry
                var geoBBox = object.boundingBox || object.geometry.boundingBox;
                cullingMatrix._array = worldViewMat;
                cullingBoundingBox.copy(geoBBox);
                cullingBoundingBox.applyTransform(cullingMatrix);

                // Passingly update the scene bounding box
                // FIXME exclude very large mesh like ground plane or terrain ?
                // FIXME Only rendererable which cast shadow ?
                if (object.isRenderable() && object.castShadow) {
                    camera.sceneBoundingBoxLastFrame.union(cullingBoundingBox);
                }

                if (object.frustumCulling)  {
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
            var _gl = this.gl;
            // Dettached from parent
            if (root.getParent()) {
                root.getParent().remove(root);
            }
            root.traverse(function(node) {
                if (node.geometry && disposeGeometry) {
                    node.geometry.dispose(_gl);
                }
                if (node.material) {
                    materials[node.material.__GUID__] = node.material;
                }
                // Particle system need to dispose
                if (node.dispose) {
                    node.dispose(_gl);
                }
            });
            for (var guid in materials) {
                var mat = materials[guid];
                mat.dispose(_gl, disposeTexture);
            }
        },

        /**
         * Dispose given shader
         * @param {qtek.Shader} shader
         */
        disposeShader: function(shader) {
            shader.dispose(this.gl);
        },

        /**
         * Dispose given geometry
         * @param {qtek.Geometry} geometry
         */
        disposeGeometry: function(geometry) {
            geometry.dispose(this.gl);
        },

        /**
         * Dispose given texture
         * @param {qtek.Texture} texture
         */
        disposeTexture: function(texture) {
            texture.dispose(this.gl);
        },

        /**
         * Dispose given frame buffer
         * @param {qtek.FrameBuffer} frameBuffer
         */
        disposeFrameBuffer: function(frameBuffer) {
            frameBuffer.dispose(this.gl);
        },
        
        /**
         * Dispose renderer
         */
        dispose: function() {
            glinfo.dispose(this.gl);
        },

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
        screenToNdc: function(x, y, out) {
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
    Renderer.opaqueSortFunc = function(x, y) {
        // Priority shader -> material -> geometry
        if (x.material.shader === y.material.shader) {
            if (x.material === y.material) {
                return x.geometry.__GUID__ - y.geometry.__GUID__;
            }
            return x.material.__GUID__ - y.material.__GUID__;
        }
        return x.material.shader.__GUID__ - y.material.shader.__GUID__;
    };

    /**
     * Transparent renderables compare function
     * @param  {qtek.Renderable} a
     * @param  {qtek.Renderable} b
     * @return {boolean}
     * @static
     */
    Renderer.transparentSortFunc = function(x, y) {
        // Priority depth -> shader -> material -> geometry
        if (x.__depth === y.__depth) {
            if (x.material.shader === y.material.shader) {
                if (x.material === y.material) {
                    return x.geometry.__GUID__ - y.geometry.__GUID__;
                }
                return x.material.__GUID__ - y.material.__GUID__;
            }
            return x.material.shader.__GUID__ - y.material.shader.__GUID__;
        }
        // Depth is negative
        // So farther object has smaller depth value
        return x.__depth - y.__depth;
    };

    // Temporary variables
    var matrices = {
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

    Renderer.COLOR_BUFFER_BIT = glenum.COLOR_BUFFER_BIT;
    Renderer.DEPTH_BUFFER_BIT = glenum.DEPTH_BUFFER_BIT;
    Renderer.STENCIL_BUFFER_BIT = glenum.STENCIL_BUFFER_BIT;

    return Renderer;
});
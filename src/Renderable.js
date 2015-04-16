define(function(require) {

    'use strict';

    var Node = require('./Node');
    var glenum = require('./core/glenum');
    var glinfo = require('./core/glinfo');
    var DynamicGeometry = require('./DynamicGeometry');

    // Cache
    var prevDrawID = 0;
    var prevDrawIndicesBuffer = null;
    var prevDrawIsUseFace = true;

    var currentDrawID;

    var RenderInfo = function() {
        this.faceNumber = 0;
        this.vertexNumber = 0;
        this.drawCallNumber = 0;
    };

    function VertexArrayObject(
        availableAttributes,
        availableAttributeSymbols,
        indicesBuffer
    ) {
        this.availableAttributes = availableAttributes;
        this.availableAttributeSymbols = availableAttributeSymbols;
        this.indicesBuffer = indicesBuffer;

        this.vao = null;
    }
    /**
     * @constructor qtek.Renderable
     * @extends qtek.Node
     */
    var Renderable = Node.derive(
    /** @lends qtek.Renderable# */
    {
        /**
         * @type {qtek.Material}
         */
        material: null,

        /**
         * @type {qtek.Geometry}
         */
        geometry: null,
        
        /**
         * @type {number}
         */
        mode: glenum.TRIANGLES,

        _drawCache: null,

        _renderInfo: null
    }, function() {
        this._drawCache = {};
        this._renderInfo = new RenderInfo();
    },
    /** @lends qtek.Renderable.prototype */
    {

        /**
         * Used when mode is LINES, LINE_STRIP or LINE_LOOP
         * @type {number}
         */
        lineWidth: 1,

        /**
         * @type {boolean}
         */
        culling: true,
        /**
         * @type {number}
         */
        cullFace: glenum.BACK,
        /**
         * @type {number}
         */
        frontFace: glenum.CCW,

        /**
         * Software frustum culling
         * @type {boolean}
         */
        frustumCulling: true,
        /**
         * @type {boolean}
         */
        receiveShadow: true,
        /**
         * @type {boolean}
         */
        castShadow: true,
        /**
         * @type {boolean}
         */
        ignorePicking: false,

        /**
         * @return {boolean}
         */
        isRenderable: function() {
            return this.geometry && this.material && this.visible;
        },

        /**
         * @param  {WebGLRenderingContext} _gl
         * @param  {qtek.Material} [globalMaterial]
         * @return {Object}
         */
        render: function(_gl, globalMaterial) {
            var material = globalMaterial || this.material;
            var shader = material.shader;
            var geometry = this.geometry;

            var glDrawMode = this.mode;

            var nVertex = geometry.getVertexNumber();
            var isUseFace = geometry.isUseFace();

            var uintExt = glinfo.getExtension(_gl, 'OES_element_index_uint');
            var useUintExt = uintExt && nVertex > 0xffff;
            var indicesType = useUintExt ? _gl.UNSIGNED_INT : _gl.UNSIGNED_SHORT;

            var vaoExt = glinfo.getExtension(_gl, 'OES_vertex_array_object');

            var isStatic = !geometry.dynamic;

            var renderInfo = this._renderInfo;
            renderInfo.vertexNumber = nVertex;
            renderInfo.faceNumber = 0;
            renderInfo.drawCallNumber = 0;
            // Draw each chunk
            var drawHashChanged = false;
            // Hash with shader id in case previous material has less attributes than next material
            currentDrawID = _gl.__GLID__ + '-' + geometry.__GUID__ + '-' + shader.__GUID__;

            if (currentDrawID !== prevDrawID) {
                drawHashChanged = true;
            } else {
                // The cache will be invalid in the following cases
                // 1. Geometry is splitted to multiple chunks
                // 2. VAO is enabled and is binded to null after render
                // 3. Geometry needs update
                if (
                    ((geometry instanceof DynamicGeometry) && (nVertex > 0xffff && !uintExt) && isUseFace)
                 || (vaoExt && isStatic)
                 || geometry._cache.isDirty()
                ) {
                    drawHashChanged = true;
                }
            }
            prevDrawID = currentDrawID;

            if (!drawHashChanged) {
                // Direct draw
                if (prevDrawIsUseFace) {
                    _gl.drawElements(glDrawMode, prevDrawIndicesBuffer.count, indicesType, 0);
                    renderInfo.faceNumber = prevDrawIndicesBuffer.count / 3;
                }
                else {
                    // FIXME Use vertex number in buffer
                    // getVertexNumber may get the wrong value when geometry forget to mark dirty after update
                    _gl.drawArrays(glDrawMode, 0, nVertex);
                }
                renderInfo.drawCallNumber = 1;
            } else {
                // Use the cache of static geometry
                var vaoList = this._drawCache[currentDrawID];
                if (!vaoList) {
                    var chunks = geometry.getBufferChunks(_gl);
                    if (!chunks) {  // Empty mesh
                        return;
                    }
                    vaoList = [];
                    for (var c = 0; c < chunks.length; c++) {
                        var chunk = chunks[c];
                        var attributeBuffers = chunk.attributeBuffers;
                        var indicesBuffer = chunk.indicesBuffer;

                        var availableAttributes = [];
                        var availableAttributeSymbols = [];
                        for (var a = 0; a < attributeBuffers.length; a++) {
                            var attributeBufferInfo = attributeBuffers[a];
                            var name = attributeBufferInfo.name;
                            var semantic = attributeBufferInfo.semantic;
                            var symbol;
                            if (semantic) {
                                var semanticInfo = shader.attribSemantics[semantic];
                                symbol = semanticInfo && semanticInfo.symbol;
                            } else {
                                symbol = name;
                            }
                            if (symbol && shader.attributeTemplates[symbol]) {
                                availableAttributes.push(attributeBufferInfo);
                                availableAttributeSymbols.push(symbol);
                            }
                        }

                        var vao = new VertexArrayObject(
                            availableAttributes,
                            availableAttributeSymbols,
                            indicesBuffer
                        );
                        vaoList.push(vao);
                    }
                    if (isStatic) {
                        this._drawCache[currentDrawID] = vaoList;
                    }
                }

                for (var i = 0; i < vaoList.length; i++) {
                    var vao = vaoList[i];
                    var needsBindAttributes = true;

                    // Create vertex object array cost a lot
                    // So we don't use it on the dynamic object
                    if (vaoExt && isStatic) {
                        // Use vertex array object
                        // http://blog.tojicode.com/2012/10/oesvertexarrayobject-extension.html
                        if (vao.vao == null) {
                            vao.vao = vaoExt.createVertexArrayOES();
                        } else {
                            needsBindAttributes = false;
                        }
                        vaoExt.bindVertexArrayOES(vao.vao);
                    }

                    var availableAttributes = vao.availableAttributes;
                    var indicesBuffer = vao.indicesBuffer;
                    
                    if (needsBindAttributes) {
                        var locationList = shader.enableAttributes(_gl, vao.availableAttributeSymbols, (vaoExt && isStatic && vao.vao));
                        // Setting attributes;
                        for (var a = 0; a < availableAttributes.length; a++) {
                            var location = locationList[a];
                            if (location === -1) {
                                continue;
                            }
                            var attributeBufferInfo = availableAttributes[a];
                            var buffer = attributeBufferInfo.buffer;
                            var size = attributeBufferInfo.size;
                            var glType;
                            switch (attributeBufferInfo.type) {
                                case 'float':
                                    glType = _gl.FLOAT;
                                    break;
                                case 'byte':
                                    glType = _gl.BYTE;
                                    break;
                                case 'ubyte':
                                    glType = _gl.UNSIGNED_BYTE;
                                    break;
                                case 'short':
                                    glType = _gl.SHORT;
                                    break;
                                case 'ushort':
                                    glType = _gl.UNSIGNED_SHORT;
                                    break;
                                default:
                                    glType = _gl.FLOAT;
                                    break;
                            }

                            _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                            _gl.vertexAttribPointer(location, size, glType, false, 0, 0);
                        }
                    }
                    if (
                        glDrawMode == glenum.LINES ||
                        glDrawMode == glenum.LINE_STRIP ||
                        glDrawMode == glenum.LINE_LOOP
                    ) {
                        _gl.lineWidth(this.lineWidth);
                    }
                    
                    prevDrawIndicesBuffer = indicesBuffer;
                    prevDrawIsUseFace = geometry.isUseFace();
                    //Do drawing
                    if (prevDrawIsUseFace) {
                        if (needsBindAttributes) {
                            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
                        }
                        _gl.drawElements(glDrawMode, indicesBuffer.count, indicesType, 0);
                        renderInfo.faceNumber += indicesBuffer.count / 3;
                    } else {
                        _gl.drawArrays(glDrawMode, 0, nVertex);
                    }

                    if (vaoExt && isStatic) {
                        vaoExt.bindVertexArrayOES(null);
                    }

                    renderInfo.drawCallNumber++;
                }
            }

            return renderInfo;
        },

        /**
         * Clone a new renderable
         * @method
         * @return {qtek.Renderable}
         */
        clone: (function() {
            var properties = [
                'castShadow', 'receiveShadow',
                'mode', 'culling', 'cullFace', 'frontFace',
                'frustumCulling'
            ];
            return function() {
                var renderable = Node.prototype.clone.call(this);

                renderable.geometry = this.geometry;
                renderable.material = this.material;
                
                for (var i = 0; i < properties.length; i++) {
                    var name = properties[i];
                    // Try not to overwrite the prototype property
                    if (renderable[name] !== this[name]) {
                        renderable[name] = this[name];
                    }
                }

                return renderable;
            };
        })()
    });

    Renderable.beforeFrame = function() {
        prevDrawID = 0;
    };

    // Enums
    Renderable.POINTS = glenum.POINTS;
    Renderable.LINES = glenum.LINES;
    Renderable.LINE_LOOP = glenum.LINE_LOOP;
    Renderable.LINE_STRIP = glenum.LINE_STRIP;
    Renderable.TRIANGLES = glenum.TRIANGLES;
    Renderable.TRIANGLE_STRIP = glenum.TRIANGLE_STRIP;
    Renderable.TRIANGLE_FAN = glenum.TRIANGLE_FAN;

    Renderable.BACK = glenum.BACK;
    Renderable.FRONT = glenum.FRONT;
    Renderable.FRONT_AND_BACK = glenum.FRONT_AND_BACK;
    Renderable.CW = glenum.CW;
    Renderable.CCW = glenum.CCW;

    Renderable.RenderInfo = RenderInfo;

    return Renderable;
});
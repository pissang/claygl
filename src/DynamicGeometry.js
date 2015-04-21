/**
 *
 * PENDING: use perfermance hint and remove the array after the data is transfered?
 * static draw & dynamic draw?
 */
define(function(require) {

    'use strict';

    var Geometry = require('./Geometry');
    var BoundingBox = require('./math/BoundingBox');
    var glenum = require('./core/glenum');
    var glinfo = require('./core/glinfo');
    var vendor = require('./core/vendor');

    var glMatrix = require('./dep/glmatrix');
    var vec3 = glMatrix.vec3;
    var mat4 = glMatrix.mat4;

    var vec3Add = vec3.add;
    var vec3Create = vec3.create;

    var arrSlice = Array.prototype.slice;
    var Attribute = Geometry.Attribute;

    /**
     * @constructor qtek.DynamicGeometry
     * @extends qtek.Geometry
     */
    var DynamicGeometry = Geometry.derive(function() {
        return /** @lends qtek.DynamicGeometry# */ {
            attributes: {
                 position: new Attribute('position', 'float', 3, 'POSITION', true),
                 texcoord0: new Attribute('texcoord0', 'float', 2, 'TEXCOORD_0', true),
                 texcoord1: new Attribute('texcoord1', 'float', 2, 'TEXCOORD_1', true),
                 normal: new Attribute('normal', 'float', 3, 'NORMAL', true),
                 tangent: new Attribute('tangent', 'float', 4, 'TANGENT', true),
                 color: new Attribute('color', 'float', 4, 'COLOR', true),
                 // Skinning attributes
                 // Each vertex can be bind to 4 bones, because the 
                 // sum of weights is 1, so the weights is stored in vec3 and the last
                 // can be calculated by 1-w.x-w.y-w.z
                 weight: new Attribute('weight', 'float', 3, 'WEIGHT', true),
                 joint: new Attribute('joint', 'float', 4, 'JOINT', true),
                 // For wireframe display
                 // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
                 barycentric: new Attribute('barycentric', 'float', 3, null, true)
            },

            dynamic: true,

            hint: glenum.DYNAMIC_DRAW,

            // Face is list of triangles, each face
            // is an array of the vertex indices of triangle
            
            /**
             * @type {array}
             */
            faces: [],
            
            _enabledAttributes: null,

            // Typed Array of each geometry chunk
            // [{
            //     attributeArrays:{
            //         position: TypedArray
            //     },
            //     indicesArray: null
            // }]
            _arrayChunks: []
        };
    }, 
    /** @lends qtek.DynamicGeometry.prototype */
    {
        updateBoundingBox: function() {
            var bbox = this.boundingBox;
            if (! bbox) {
                bbox = this.boundingBox = new BoundingBox();
            }
            bbox.updateFromVertices(this.attributes.position.value);
        },
        // Overwrite the dirty method
        dirty: function(field) {
            if (!field) {
                this.dirty('indices');
                for (var name in this.attributes) {
                    this.dirty(name);
                }
                return;
            }
            this._cache.dirtyAll(field);

            this._cache.dirtyAll();

            this._enabledAttributes = null;
        },

        getVertexNumber: function() {
            var mainAttribute = this.attributes[this.mainAttribute];
            if (!mainAttribute || !mainAttribute.value) {
                return 0;
            }
            return mainAttribute.value.length;
        },

        getFaceNumber: function() {
            return this.faces.length;
        },

        getFace: function (idx, out) {
            if (idx < this.getFaceNumber() && idx >= 0) {
                if (!out) {
                    out = vec3.create();
                }
                vec3.copy(out, this.faces[idx]);

                return out;
            }
        },

        isUseFace: function() {
            return this.useFace && (this.faces.length > 0);
        },

        isSplitted: function() {
            return this.getVertexNumber() > 0xffff;
        },

        createAttribute: function(name, type, size, semantic) {
            var attrib = new Attribute(name, type, size, semantic, true);
            this.attributes[name] = attrib;
            this._attributeList.push(name);
            return attrib;
        },

        removeAttribute: function(name) {
            var attributeList = this._attributeList;
            var idx = attributeList.indexOf(name);
            if (idx >= 0) {
                attributeList.splice(idx, 1);
                delete this.attributes[name];
                return true;
            }
            return false;
        },

        /**
         * Get enabled attributes map.
         * Attribute that has same vertex number with position is treated as an enabled attribute
         * @return {Object}
         */
        getEnabledAttributes: function() {
            var enabledAttributes = this._enabledAttributes;
            var attributeList = this._attributeList;
            // Cache
            if (enabledAttributes) {
                return enabledAttributes;
            }

            var result = {};
            var nVertex = this.getVertexNumber();

            for (var i = 0; i < attributeList.length; i++) {
                var name = attributeList[i];
                var attrib = this.attributes[name];
                if (attrib.value.length) {
                    if (attrib.value.length === nVertex) {
                        result[name] = attrib;
                    }
                }
            }

            this._enabledAttributes = result;

            return result;
        },

        _getDirtyAttributes: function() {

            var attributes = this.getEnabledAttributes();
            var cache = this._cache;
            
            if (cache.miss('chunks')) {
                return attributes;
            } else {
                var result = {};
                var noDirtyAttributes = true;
                for (var name in attributes) {
                    if (cache.isDirty(name)) {
                        result[name] = attributes[name];
                        noDirtyAttributes = false;
                    }
                }
                if (! noDirtyAttributes) {
                    return result;
                }
            }
        },

        getChunkNumber: function() {
            return this._arrayChunks.length;
        },

        getBufferChunks: function(_gl) {
            var cache = this._cache;
            cache.use(_gl.__GLID__);

            if (cache.isDirty()) {
                var dirtyAttributes = this._getDirtyAttributes();

                var isFacesDirty = cache.isDirty('indices');
                isFacesDirty = isFacesDirty && this.isUseFace();
                
                if (dirtyAttributes) {
                    this._updateAttributesAndIndicesArrays(
                        dirtyAttributes, isFacesDirty,
                        glinfo.getExtension(_gl, 'OES_element_index_uint') != null
                    );
                    this._updateBuffer(_gl, dirtyAttributes, isFacesDirty);

                    for (var name in dirtyAttributes) {
                        cache.fresh(name);
                    }
                    cache.fresh('indices');
                    cache.fresh();
                }
            }
            return cache.get('chunks');
        },

        _updateAttributesAndIndicesArrays: function(attributes, isFacesDirty, useUintExtension) {

            var self = this;
            var nVertex = this.getVertexNumber();
            
            var verticesReorganizedMap = [];
            var reorganizedFaces = [];

            var ArrayConstructors = {};
            for (var name in attributes) {
                // Type can be byte, ubyte, short, ushort, float
                switch(type) {
                    case 'byte':
                        ArrayConstructors[name] = vendor.Int8Array;
                        break;
                    case 'ubyte':
                        ArrayConstructors[name] = vendor.Uint8Array;
                        break;
                    case 'short':
                        ArrayConstructors[name] = vendor.Int16Array;
                        break;
                    case 'ushort':
                        ArrayConstructors[name] = vendor.Uint16Array;
                        break;
                    default:
                        ArrayConstructors[name] = vendor.Float32Array;
                        break;
                }
            }

            var newChunk = function(chunkIdx) {
                if (self._arrayChunks[chunkIdx]) {
                    return self._arrayChunks[chunkIdx];
                }
                var chunk = {
                    attributeArrays: {},
                    indicesArray: null
                };

                for (var name in attributes) {
                    chunk.attributeArrays[name] = null;
                }

                for (var i = 0; i < nVertex; i++) {
                    verticesReorganizedMap[i] = -1;
                }
                
                self._arrayChunks.push(chunk);
                return chunk;
            };

            var attribNameList = Object.keys(attributes);
            // Split large geometry into chunks because index buffer
            // only can use uint16 which means each draw call can only
            // have at most 65535 vertex data
            // But now most browsers support OES_element_index_uint extension
            if (
                nVertex > 0xffff && this.isUseFace() && !useUintExtension
            ) {
                var chunkIdx = 0;
                var currentChunk;

                var chunkFaceStart = [0];
                var vertexUseCount = [];

                for (i = 0; i < nVertex; i++) {
                    vertexUseCount[i] = -1;
                    verticesReorganizedMap[i] = -1;
                }
                if (isFacesDirty) {
                    for (i = 0; i < this.faces.length; i++) {
                        reorganizedFaces[i] = [0, 0, 0];
                    }
                }

                currentChunk = newChunk(chunkIdx);

                var vertexCount = 0;
                for (var i = 0; i < this.faces.length; i++) {
                    var face = this.faces[i];
                    var reorganizedFace = reorganizedFaces[i];

                    // newChunk
                    if (vertexCount+3 > 0xffff) {
                        chunkIdx++;
                        chunkFaceStart[chunkIdx] = i;
                        vertexCount = 0;
                        currentChunk = newChunk(chunkIdx);
                    }

                    for (var f = 0; f < 3; f++) {
                        var ii = face[f];
                        var isNew = verticesReorganizedMap[ii] === -1; 

                        for (var k = 0; k < attribNameList.length; k++) {
                            var name = attribNameList[k];
                            var attribArray = currentChunk.attributeArrays[name];
                            var values = attributes[name].value;
                            var size = attributes[name].size;
                            if (! attribArray) {
                                // Here use array to put data temporary because i can't predict
                                // the size of chunk precisely.
                                attribArray = currentChunk.attributeArrays[name] = [];
                            }
                            if (isNew) {
                                if (size === 1) {
                                    attribArray[vertexCount] = values[ii];
                                }
                                for (var j = 0; j < size; j++) {
                                    attribArray[vertexCount * size + j] = values[ii][j];
                                }
                            }
                        }
                        if (isNew) {
                            verticesReorganizedMap[ii] = vertexCount;
                            reorganizedFace[f] = vertexCount;
                            vertexCount++;
                        } else {
                            reorganizedFace[f] = verticesReorganizedMap[ii];
                        }
                    }
                }
                //Create typedArray from existed array
                for (var c = 0; c < this._arrayChunks.length; c++) {
                    var chunk = this._arrayChunks[c];
                    for (var name in chunk.attributeArrays) {
                        var array = chunk.attributeArrays[name];
                        if (array instanceof Array) {
                            chunk.attributeArrays[name] = new ArrayConstructors[name](array);
                        }
                    }
                }

                if (isFacesDirty) {
                    var chunkStart, chunkEnd, cursor, chunk;
                    for (var c = 0; c < this._arrayChunks.length; c++) {
                        chunkStart = chunkFaceStart[c];
                        chunkEnd = chunkFaceStart[c+1] || this.faces.length;
                        cursor = 0;
                        chunk = this._arrayChunks[c];
                        var indicesArray = chunk.indicesArray;
                        if (! indicesArray) {
                            indicesArray = chunk.indicesArray = new Uint16Array((chunkEnd-chunkStart)*3);
                        }

                        for (var i = chunkStart; i < chunkEnd; i++) {
                            indicesArray[cursor++] = reorganizedFaces[i][0];
                            indicesArray[cursor++] = reorganizedFaces[i][1];
                            indicesArray[cursor++] = reorganizedFaces[i][2];
                        }
                    }
                }
            } else {
                var chunk = newChunk(0);
                // Use faces
                if (isFacesDirty) {
                    var indicesArray = chunk.indicesArray;
                    var nFace = this.faces.length;
                    if (!indicesArray || (nFace * 3 !== indicesArray.length)) {
                        var ArrayCtor = nVertex > 0xffff ? Uint32Array : Uint16Array;
                        indicesArray = chunk.indicesArray = new ArrayCtor(this.faces.length * 3);
                    }
                    var cursor = 0;
                    for (var i = 0; i < nFace; i++) {
                        indicesArray[cursor++] = this.faces[i][0];
                        indicesArray[cursor++] = this.faces[i][1];
                        indicesArray[cursor++] = this.faces[i][2];
                    }
                }
                for (var name in attributes) {
                    var values = attributes[name].value;
                    var type = attributes[name].type;
                    var size = attributes[name].size;
                    var attribArray = chunk.attributeArrays[name];
                    
                    var arrSize = nVertex * size;
                    if (! attribArray || attribArray.length !== arrSize) {
                        attribArray = new ArrayConstructors[name](arrSize);
                        chunk.attributeArrays[name] = attribArray;
                    }

                    if (size === 1) {
                        for (var i = 0; i < values.length; i++) {
                            attribArray[i] = values[i];
                        }
                    } else {
                        var cursor = 0;
                        for (var i = 0; i < values.length; i++) {
                            for (var j = 0; j < size; j++) {
                                attribArray[cursor++] = values[i][j];
                            }
                        }
                    }
                }
            }
        },

        _updateBuffer: function(_gl, dirtyAttributes, isFacesDirty) {
            var chunks = this._cache.get('chunks');
            var firstUpdate = false;
            if (! chunks) {
                chunks = [];
                // Intialize
                for (var i = 0; i < this._arrayChunks.length; i++) {
                    chunks[i] = {
                        attributeBuffers: [],
                        indicesBuffer: null
                    };
                }
                this._cache.put('chunks', chunks);
                firstUpdate = true;
            }
            for (var cc = 0; cc < this._arrayChunks.length; cc++) {
                var chunk = chunks[cc];
                if (! chunk) {
                    chunk = chunks[cc] = {
                        attributeBuffers: [],
                        indicesBuffer: null
                    };
                }
                var attributeBuffers = chunk.attributeBuffers;
                var indicesBuffer = chunk.indicesBuffer;
                
                var arrayChunk = this._arrayChunks[cc];
                var attributeArrays = arrayChunk.attributeArrays;
                var indicesArray = arrayChunk.indicesArray;

                var count = 0;
                var prevSearchIdx = 0;
                for (var name in dirtyAttributes) {
                    var attribute = dirtyAttributes[name];
                    var type = attribute.type;
                    var semantic = attribute.semantic;
                    var size = attribute.size;

                    var bufferInfo;
                    if (!firstUpdate) {
                        for (var i = prevSearchIdx; i < attributeBuffers.length; i++) {
                            if (attributeBuffers[i].name === name) {
                                bufferInfo = attributeBuffers[i];
                                prevSearchIdx = i + 1;
                                break;
                            }
                        }
                        if (!bufferInfo) {
                            for (var i = prevSearchIdx - 1; i >= 0; i--) {
                                if (attributeBuffers[i].name === name) {
                                    bufferInfo = attributeBuffers[i];
                                    prevSearchIdx = i;
                                    break;
                                }
                            }
                        }
                    }

                    var buffer;
                    if (bufferInfo) {
                        buffer = bufferInfo.buffer;
                    } else {
                        buffer = _gl.createBuffer();
                    }
                    //TODO: Use BufferSubData?
                    _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                    _gl.bufferData(_gl.ARRAY_BUFFER, attributeArrays[name], this.hint);

                    attributeBuffers[count++] = new Geometry.AttributeBuffer(name, type, buffer, size, semantic);
                }
                attributeBuffers.length = count;

                if (isFacesDirty) {
                    if (! indicesBuffer) {
                        indicesBuffer = new Geometry.IndicesBuffer(_gl.createBuffer());
                        chunk.indicesBuffer = indicesBuffer;
                    }
                    indicesBuffer.count = indicesArray.length;
                    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
                    _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, indicesArray, this.hint);   
                }
            }
        },

        generateVertexNormals: function() {
            var faces = this.faces;
            var len = faces.length;
            var attributes = this.attributes;
            var positions = attributes.position.value;
            var normals = attributes.normal.value;
            var normal = vec3Create();

            var v21 = vec3Create(), v32 = vec3Create();

            for (var i = 0; i < normals.length; i++) {
                vec3.set(normals[i], 0.0, 0.0, 0.0);
            }
            for (var i = normals.length; i < positions.length; i++) {
                //Use array instead of Float32Array
                normals[i] = [0.0, 0.0, 0.0];
            }

            for (var f = 0; f < len; f++) {

                var face = faces[f];
                var i1 = face[0];
                var i2 = face[1];
                var i3 = face[2];
                var p1 = positions[i1];
                var p2 = positions[i2];
                var p3 = positions[i3];

                vec3.sub(v21, p1, p2);
                vec3.sub(v32, p2, p3);
                vec3.cross(normal, v21, v32);
                // Weighted by the triangle area
                vec3Add(normals[i1], normals[i1], normal);
                vec3Add(normals[i2], normals[i2], normal);
                vec3Add(normals[i3], normals[i3], normal);
            }
            for (var i = 0; i < normals.length; i++) {
                vec3.normalize(normals[i], normals[i]);
            }
        },

        generateFaceNormals: function() {
            if (! this.isUniqueVertex()) {
                this.generateUniqueVertex();
            }

            var faces = this.faces;
            var len = faces.length;
            var attributes = this.attributes;
            var positions = attributes.position.value;
            var normals = attributes.normal.value;
            var normal = vec3Create();

            var v21 = vec3Create(), v32 = vec3Create();

            var isCopy = normals.length === positions.length;
            
            for (var i = 0; i < len; i++) {
                var face = faces[i];
                var i1 = face[0];
                var i2 = face[1];
                var i3 = face[2];
                var p1 = positions[i1];
                var p2 = positions[i2];
                var p3 = positions[i3];

                vec3.sub(v21, p1, p2);
                vec3.sub(v32, p2, p3);
                vec3.cross(normal, v21, v32);

                if (isCopy) {
                    vec3.copy(normals[i1], normal);
                    vec3.copy(normals[i2], normal);
                    vec3.copy(normals[i3], normal);
                } else {
                    normals[i1] = normals[i2] = normals[i3] = arrSlice.call(normal);
                }
            }
        },
        // 'Mathmatics for 3D programming and computer graphics, third edition'
        // section 7.8.2
        // http://www.crytek.com/download/Triangle_mesh_tangent_space_calculation.pdf
        generateTangents: function() {
            
            var attributes = this.attributes;
            var texcoords = attributes.texcoord0.value;
            var positions = attributes.position.value;
            var tangents = attributes.tangent.value;
            var normals = attributes.normal.value;

            var tan1 = [];
            var tan2 = [];
            var nVertex = this.getVertexNumber();
            for (var i = 0; i < nVertex; i++) {
                tan1[i] = [0.0, 0.0, 0.0];
                tan2[i] = [0.0, 0.0, 0.0];
            }

            var sdir = [0.0, 0.0, 0.0];
            var tdir = [0.0, 0.0, 0.0];
            for (var i = 0; i < this.faces.length; i++) {
                var face = this.faces[i],
                    i1 = face[0],
                    i2 = face[1],
                    i3 = face[2],

                    st1 = texcoords[i1],
                    st2 = texcoords[i2],
                    st3 = texcoords[i3],

                    p1 = positions[i1],
                    p2 = positions[i2],
                    p3 = positions[i3];

                var x1 = p2[0] - p1[0],
                    x2 = p3[0] - p1[0],
                    y1 = p2[1] - p1[1],
                    y2 = p3[1] - p1[1],
                    z1 = p2[2] - p1[2],
                    z2 = p3[2] - p1[2];

                var s1 = st2[0] - st1[0],
                    s2 = st3[0] - st1[0],
                    t1 = st2[1] - st1[1],
                    t2 = st3[1] - st1[1];

                var r = 1.0 / (s1 * t2 - t1 * s2);
                sdir[0] = (t2 * x1 - t1 * x2) * r;
                sdir[1] = (t2 * y1 - t1 * y2) * r; 
                sdir[2] = (t2 * z1 - t1 * z2) * r;

                tdir[0] = (s1 * x2 - s2 * x1) * r;
                tdir[1] = (s1 * y2 - s2 * y1) * r;
                tdir[2] = (s1 * z2 - s2 * z1) * r;

                vec3Add(tan1[i1], tan1[i1], sdir);
                vec3Add(tan1[i2], tan1[i2], sdir);
                vec3Add(tan1[i3], tan1[i3], sdir);
                vec3Add(tan2[i1], tan2[i1], tdir);
                vec3Add(tan2[i2], tan2[i2], tdir);
                vec3Add(tan2[i3], tan2[i3], tdir);
            }
            var tmp = [0, 0, 0, 0];
            var nCrossT = [0, 0, 0];
            for (var i = 0; i < nVertex; i++) {
                var n = normals[i];
                var t = tan1[i];

                // Gram-Schmidt orthogonalize
                vec3.scale(tmp, n, vec3.dot(n, t));
                vec3.sub(tmp, t, tmp);
                vec3.normalize(tmp, tmp);
                // Calculate handedness.
                vec3.cross(nCrossT, n, t);
                tmp[3] = vec3.dot(nCrossT, tan2[i]) < 0.0 ? -1.0 : 1.0;
                tangents[i] = tmp.slice();
            }
        },

        isUniqueVertex: function() {
            if (this.isUseFace()) {
                return this.getVertexNumber() === this.faces.length * 3;
            } else {
                return true;
            }
        },

        generateUniqueVertex: function() {

            var vertexUseCount = [];
            // Intialize with empty value, read undefined value from array
            // is slow
            // http://jsperf.com/undefined-array-read
            for (var i = 0; i < this.getVertexNumber(); i++) {
                vertexUseCount[i] = 0;
            }

            var cursor = this.getVertexNumber();
            var attributes = this.getEnabledAttributes();
            var faces = this.faces;

            var attributeNameList = Object.keys(attributes);

            for (var i = 0; i < faces.length; i++) {
                var face = faces[i];
                for (var j = 0; j < 3; j++) {
                    var ii = face[j];
                    if (vertexUseCount[ii] > 0) {
                        for (var a = 0; a < attributeNameList.length; a++) {
                            var name = attributeNameList[a];
                            var array = attributes[name].value;
                            var size = attributes[name].size;
                            if (size === 1) {
                                array.push(array[ii]);
                            } else {
                                array.push(arrSlice.call(array[ii]));
                            }
                        }
                        face[j] = cursor;
                        cursor++;
                    }
                    vertexUseCount[ii]++;
                }
            }

            this.dirty();
        },

        // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
        // http://en.wikipedia.org/wiki/Barycentric_coordinate_system_(mathematics)
        generateBarycentric: (function() {
            var a = [1, 0, 0];
            var b = [0, 0, 1];
            var c = [0, 1, 0];
            return function() {

                if (! this.isUniqueVertex()) {
                    this.generateUniqueVertex();
                }

                var array = this.attributes.barycentric.value;
                // Already existed;
                if (array.length == this.faces.length * 3) {
                    return;
                }
                var i1, i2, i3, face;
                for (var i = 0; i < this.faces.length; i++) {
                    face = this.faces[i];
                    i1 = face[0];
                    i2 = face[1];
                    i3 = face[2];
                    array[i1] = a;
                    array[i2] = b;
                    array[i3] = c;
                }
            };
        })(),

        convertToStatic: function(geometry, useUintExtension) {
            this._updateAttributesAndIndicesArrays(this.getEnabledAttributes(), true, useUintExtension);

            if (this._arrayChunks.length > 1) {
                console.warn('Large geometry will discard chunks when convert to StaticGeometry');
            }
            else if (this._arrayChunks.length === 0) {
                return geometry;
            }
            var chunk = this._arrayChunks[0];

            var attributes = this.getEnabledAttributes();
            for (var name in attributes) {
                var attrib = attributes[name];
                var geoAttrib = geometry.attributes[name];
                if (!geoAttrib) {
                    geoAttrib = geometry.attributes[name] = {
                        type: attrib.type,
                        size: attrib.size,
                        value: null
                    };
                    if (attrib.semantic) {
                        geoAttrib.semantic = attrib.semantic;
                    }
                }
                geoAttrib.value = chunk.attributeArrays[name];
            }
            geometry.faces = chunk.indicesArray;

            if (this.boundingBox) {
                geometry.boundingBox = new BoundingBox();
                geometry.boundingBox.min.copy(this.boundingBox.min);
                geometry.boundingBox.max.copy(this.boundingBox.max);
            }
            // PENDING copy buffer ?
            return geometry;
        },

        applyTransform: function(matrix) {
            var attributes = this.attributes;
            var positions = attributes.position.value;
            var normals = attributes.normal.value;
            var tangents = attributes.tangent.value;

            var vec3TransformMat4 = vec3.transformMat4;

            matrix = matrix._array;
            for (var i = 0; i < positions.length; i++) {
                vec3TransformMat4(positions[i], positions[i], matrix);
            }
            // Normal Matrix
            var inverseTransposeMatrix = mat4.create();
            mat4.invert(inverseTransposeMatrix, matrix);
            mat4.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

            for (var i = 0; i < normals.length; i++) {
                vec3TransformMat4(normals[i], normals[i], inverseTransposeMatrix);
            }

            for (var i = 0; i < tangents.length; i++) {
                vec3TransformMat4(tangents[i], tangents[i], inverseTransposeMatrix);
            }
            
            if (this.boundingBox) {
                this.updateBoundingBox();
            }
        },

        dispose: function(_gl) {
            var cache = this._cache;
            cache.use(_gl.__GLID__);
            var chunks = cache.get('chunks');
            if (chunks) {
                for (var c = 0; c < chunks.length; c++) {
                    var chunk = chunks[c];
                    for (var k = 0; k < chunk.attributeBuffers.length; k++) {
                        var attribs = chunk.attributeBuffers[k];
                        _gl.deleteBuffer(attribs.buffer);
                    }
                }
            }
            cache.deleteContext(_gl.__GLID__);
        }
    });
    
    return DynamicGeometry;
});
/**
 *
 * PENDING: use perfermance hint and remove the array after the data is transfered?
 * static draw & dynamic draw?
 */
define(function(require) {

    'use strict'

    var Base = require("core/Base");
    var Vector3 = require("core/Vector3");
    var BoundingBox = require("./BoundingBox");
    var glenum = require("./glenum");
    var util = require("util/util");
    var glMatrix = require("glmatrix");
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;
    var mat2 = glMatrix.mat2;
    var mat4 = glMatrix.mat4;
    var _ = require("_");

    var arrSlice = Array.prototype.slice;

    var Geometry = Base.derive(function() {

        return {

            __GUID__ : util.genGUID(),
            
            attributes : {
                 position : {
                    type : 'float',
                    semantic : "POSITION",
                    size : 3,
                    value : []
                 },
                 texcoord0 : {
                    type : 'float',
                    semantic : "TEXCOORD_0",
                    size : 2,
                    value : []
                 },
                 texcoord1 : {
                    type : 'float',
                    semantic : "TEXCOORD_1",
                    size : 2,
                    value : []
                 },
                 normal : {
                    type : 'float',
                    semantic : "NORMAL",
                    size : 3,
                    value : []
                 },
                 tangent : {
                    type : 'float',
                    semantic : "TANGENT",
                    size : 4,
                    value : []
                 },
                 color : {
                    type : 'ubyte',
                    semantic : "COLOR",
                    size : 3,
                    value : []
                 },
                 // Skinning attributes
                 // Each vertex can be bind to 4 bones, because the 
                 // sum of weights is 1, so the weights is stored in vec3 and the last
                 // can be calculated by 1-w.x-w.y-w.z
                 weight : {
                    type : 'float',
                    semantic : 'WEIGHT',
                    size : 3,
                    value : []
                 },
                 joint : {
                    type : 'float',
                    semantic : 'JOINT',
                    size : 4,
                    value : []
                 },
                 // For wireframe display
                 // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
                 barycentric : {
                    type : 'float',
                    size : 3,
                    value : []
                 }
            },

            boundingBox : new BoundingBox(),

            useFace : true,
            // Face is list of triangles, each face
            // is an array of the vertex indices of triangle
            faces : [],

            hint : glenum.STATIC_DRAW,

            //Max Value of Uint16, i.e. 0xfff
            chunkSize : 65535,

            _enabledAttributes : null,

            // Save the normal type, can have face normal or vertex normal
            // Normally vertex normal is more smooth
            _normalType : "vertex",

            // Typed Array of each geometry chunk
            // [{
            //     attributeArrays:{
            //         position : TypedArray
            //     },
            //     indicesArray : null
            // }]
            _arrayChunks : [],

            // Map of re organized vertices data
            _verticesReorganizedMap : [],
            _reorganizedFaces : []
        }
    }, {

        computeBoundingBox : function() {
        },
        // Overwrite the dirty method
        dirty : function(field) {
            if (! field) {
                this.dirty("indices");
                for (var name in this.attributes) {
                    this.dirty(name);
                }
                return;
            }
            this.cache.dirtyAll(field);
            
            this._enabledAttributes = null;
        },

        getVerticesNumber : function() {
            return this.attributes.position.value.length;
        },

        isUseFace : function() {
            return this.useFace && (this.faces.length > 0);
        },

        isSplitted : function() {
            return this.getVerticesNumber() > this.chunkSize;
        },

        getEnabledAttributes : function() {
            // Cache
            if (this._enabledAttributes) {
                return this._enabledAttributes;
            }

            var result = {};
            var verticesNumber = this.getVerticesNumber();

            for (var name in this.attributes) {
                var attrib = this.attributes[name];
                if (attrib.value &&
                    attrib.value.length) {
                    if (attrib.value.length === verticesNumber) {
                        result[name] = attrib;
                    }
                }
            }

            this._enabledAttributes = result;

            return result;
        },

        _getDirtyAttributes : function() {

            var result = {};
            var attributes = this.getEnabledAttributes();
            
            var noDirtyAttributes = true;

            if (this.hint = glenum.STATIC_DRAW) {
                if (this.cache.miss('chunks')) {
                    return attributes;
                } else {
                    return null;
                }
            } else {
                for (var name in attributes) {
                    var attrib = attributes[name];
                    if (this.cache.isDirty(name)) {
                        result[name] = attributes[name];
                        noDirtyAttributes = false;
                    }
                }   
            }
            if (! noDirtyAttributes) {
                return result;
            }
        },

        getChunkNumber : function() {
            return this._arrayChunks.length;
        },

        getBufferChunks : function(_gl) {

            this.cache.use(_gl.__GUID__);

            var dirtyAttributes = this._getDirtyAttributes();

            var isFacesDirty = this.cache.isDirty('indices');
            isFacesDirty = isFacesDirty && this.isUseFace();
            
            if (dirtyAttributes) {
                this._updateAttributesAndIndicesArrays(dirtyAttributes, isFacesDirty);
                this._updateBuffer(_gl, dirtyAttributes, isFacesDirty);

                for (var name in dirtyAttributes) {
                    this.cache.fresh(name);
                }
                this.cache.fresh('indices');
            }
            return this.cache.get("chunks");
        },

        _updateAttributesAndIndicesArrays : function(attributes, isFacesDirty) {

            var self = this
            var cursors = {};
            var verticesNumber = this.getVerticesNumber();
            
            var verticesReorganizedMap = this._verticesReorganizedMap;

            var ArrayConstructors = {};
            for (var name in attributes) {
                // Type can be byte, ubyte, short, ushort, float
                switch(type) {
                    case "byte":
                        ArrayConstructors[name] = Int8Array;
                        break;
                    case "ubyte":
                        ArrayConstructors[name] = Uint8Array;
                        break;
                    case "short":
                        ArrayConstructors[name] = Int16Array;
                        break;
                    case "ushort":
                        ArrayConstructors[name] = Uint16Array;
                        break;
                    default:
                        ArrayConstructors[name] = Float32Array;
                        break;
                }
                cursors[name] = 0;
            }

            var newChunk = function(chunkIdx) {
                if (self._arrayChunks[chunkIdx]) {
                    return self._arrayChunks[chunkIdx];
                }
                var chunk = {
                    attributeArrays : {},
                    indicesArray : null
                };

                for (var name in attributes) {
                    chunk.attributeArrays[name] = null;
                }

                for (var name in cursors) {
                    cursors[name] = 0;
                }
                for (var i = 0; i < verticesNumber; i++) {
                    verticesReorganizedMap[i] = -1;
                }
                
                self._arrayChunks.push(chunk);
                return chunk;
            }

            var attribNameList = Object.keys(attributes);
            // Split large geometry into chunks because index buffer
            // only support uint16 which means each draw call can only
             // have at most 65535 vertex data
            if (verticesNumber > this.chunkSize && this.isUseFace()) {
                var vertexCursor = 0,
                    chunkIdx = 0,
                    currentChunk;

                var chunkFaceStart = [0];
                var vertexUseCount = [];

                for (i = 0; i < verticesNumber; i++) {
                    vertexUseCount[i] = -1;
                    verticesReorganizedMap[i] = -1;
                }
                if (isFacesDirty) {
                    if (this._reorganizedFaces.length !== this.faces.length) {
                        for (i = 0; i < this.faces.length; i++) {
                            this._reorganizedFaces[i] = [0, 0, 0];
                        }
                    }
                }

                currentChunk = newChunk(chunkIdx);

                for (var i = 0; i < this.faces.length; i++) {
                    var face = this.faces[i];
                    var reorganizedFace = this._reorganizedFaces[i];
                    var i1 = face[0], i2 = face[1], i3 = face[2];
                    // newChunk
                    if (vertexCursor+3 > this.chunkSize) {
                        chunkIdx++;
                        chunkFaceStart[chunkIdx] = i;
                        vertexCursor = 0;
                        currentChunk = newChunk(chunkIdx);
                    }
                    var newI1 = verticesReorganizedMap[i1] === -1;
                    var newI2 = verticesReorganizedMap[i2] === -1;
                    var newI3 = verticesReorganizedMap[i3] === -1;

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
                        if (size === 1) {
                            if (newI1) {
                                attribArray[cursors[name]++] = values[i1];
                            }
                            if (newI2) {
                                attribArray[cursors[name]++] = values[i2];
                            }
                            if (newI3) {
                                attribArray[cursors[name]++] = values[i3];
                            }
                        }
                        else {
                            if (newI1) {
                                for (var j = 0; j < size; j++) {
                                    attribArray[cursors[name]++] = values[i1][j];
                                }
                            }
                            if (newI2) {
                                for (var j = 0; j < size; j++) {
                                    attribArray[cursors[name]++] = values[i2][j];
                                }
                            }
                            if (newI3) {
                                for (var j = 0; j < size; j++) {
                                    attribArray[cursors[name]++] = values[i3][j];
                                }
                            }
                        }
                    }
                    if (newI1) {
                        verticesReorganizedMap[i1] = vertexCursor;
                        reorganizedFace[0] = vertexCursor;
                        vertexCursor++;
                    } else {
                        reorganizedFace[0] = verticesReorganizedMap[i1];
                    }
                    if (newI2) {
                        verticesReorganizedMap[i2] = vertexCursor;
                        reorganizedFace[1] = vertexCursor;
                        vertexCursor++;
                    } else {
                        reorganizedFace[1] = verticesReorganizedMap[i2];
                    }
                    if (newI3) {
                        verticesReorganizedMap[i3] = vertexCursor;
                        reorganizedFace[2] = vertexCursor;
                        vertexCursor++
                    } else {
                        reorganizedFace[2] = verticesReorganizedMap[i3];
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
                            indicesArray[cursor++] = this._reorganizedFaces[i][0];
                            indicesArray[cursor++] = this._reorganizedFaces[i][1];
                            indicesArray[cursor++] = this._reorganizedFaces[i][2];
                        }
                    }
                }
            } else {
                var chunk = newChunk(0);
                // Use faces
                if (isFacesDirty) {
                    var indicesArray = chunk.indicesArray;
                    if (! indicesArray) {
                        indicesArray = chunk.indicesArray = new Uint16Array(this.faces.length*3);
                    }
                    var cursor = 0;
                    for (var i = 0; i < this.faces.length; i++) {
                        indicesArray[cursor++] = this.faces[i][0];
                        indicesArray[cursor++] = this.faces[i][1];
                        indicesArray[cursor++] = this.faces[i][2];
                    }
                }
                for (var name in attributes) {
                    var values = attributes[name].value,
                        type = attributes[name].type,
                        size = attributes[name].size,
                        attribArray = chunk.attributeArrays[name];
                    
                    if (! attribArray) {
                        attribArray = chunk.attributeArrays[name] = new ArrayConstructors[name](verticesNumber*size);
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

        _updateBuffer : function(_gl, dirtyAttributes, isFacesDirty) {

            var chunks = this.cache.get("chunks");
            if (! chunks) {
                chunks = [];
                // Intialize
                for (var i = 0; i < this._arrayChunks.length; i++) {
                    chunks[i] = {
                        attributeBuffers : {},
                        indicesBuffer : null
                    }
                }
                this.cache.put("chunks", chunks);
            }
            for (var i = 0; i < chunks.length; i++) {
                var chunk = chunks[i];
                if (! chunk) {
                    chunk = chunks[i] = {
                        attributeBuffers : {},
                        indicesBuffer : null
                    }
                }
                var attributeBuffers = chunk.attributeBuffers,
                    indicesBuffer = chunk.indicesBuffer;
                var arrayChunk = this._arrayChunks[i],
                    attributeArrays = arrayChunk.attributeArrays,
                    indicesArray = arrayChunk.indicesArray;

                for (var name in dirtyAttributes) {
                    var attribute = dirtyAttributes[name];
                    var type = attribute.type;
                    var semantic = attribute.semantic;
                    var size = attribute.size;

                    var bufferInfo = attributeBuffers[name];
                    var buffer;
                    if (bufferInfo) {
                        buffer = bufferInfo.buffer
                    } else {
                        buffer = _gl.createBuffer();
                    }
                    //TODO: Use BufferSubData?
                    _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                    _gl.bufferData(_gl.ARRAY_BUFFER, attributeArrays[name], this.hint);

                    attributeBuffers[name] = {
                        type : type,
                        buffer : buffer,
                        size : size,
                        semantic : semantic,
                    }
                } 
                if (isFacesDirty) {
                    if (! indicesBuffer) {
                        indicesBuffer = chunk.indicesBuffer = {
                            buffer : _gl.createBuffer(),
                            count : indicesArray.length
                        }
                    }
                    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
                    _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, indicesArray, this.hint);   
                }
            }
        },

        generateVertexNormals : function() {
            var faces = this.faces
            var len = faces.length
            var positions = this.attributes.position.value
            var normals = this.attributes.normal.value
            var normal = vec3.create();

            var v12 = vec3.create(), v23 = vec3.create();

            var difference = positions.length - normals.length;
            for (var i = 0; i < normals.length; i++) {
                vec3.set(normals[i], 0.0, 0.0, 0.0);
            }
            for (var i = normals.length; i < positions.length; i++) {
                //Use array instead of Float32Array
                normals[i] = [0.0, 0.0, 0.0];
            }

            for (var f = 0; f < len; f++) {

                var face = faces[f],
                    i1 = face[0],
                    i2 = face[1],
                    i3 = face[2],
                    p1 = positions[i1],
                    p2 = positions[i2],
                    p3 = positions[i3];

                vec3.sub(v12, p1, p2);
                vec3.sub(v23, p2, p3);
                vec3.cross(normal, v12, v23);
                // Weighted by the triangle area
                vec3.add(normals[i1], normals[i1], normal);
                vec3.add(normals[i2], normals[i2], normal);
                vec3.add(normals[i3], normals[i3], normal);
            }
            for (var i = 0; i < normals.length; i++) {
                vec3.normalize(normals[i], normals[i]);
            }

            this._normalType = "vertex";
        },

        generateFaceNormals : function() {
            if (! this.isUniqueVertex()) {
                this.generateUniqueVertex();
            }

            var faces = this.faces,
                len = faces.length,
                positions = this.attributes.position.value,
                normals = this.attributes.normal.value,
                normal = vec3.create();

            var v12 = vec3.create(), v23 = vec3.create();

            var isCopy = normals.length === positions.length;
            //   p1
            //  /  \
            // p3---p2
            for (var i = 0; i < len; i++) {
                var face = faces[i],
                    i1 = face[0],
                    i2 = face[1],
                    i3 = face[2],
                    p1 = positions[i1],
                    p2 = positions[i2],
                    p3 = positions[i3];

                vec3.sub(v12, p1, p2);
                vec3.sub(v23, p2, p3);
                vec3.cross(normal, v12, v23);

                if (isCopy) {
                    vec3.copy(normals[i1], normal);
                    vec3.copy(normals[i2], normal);
                    vec3.copy(normals[i3], normal);
                } else {
                    normals[i1] = normals[i2] = normals[i3] = arrSlice.call(normal);
                }
            }

            this._normalType = "face";
        },
        // "Mathmatics for 3D programming and computer graphics, third edition"
        // section 7.8.2
        // http://www.crytek.com/download/Triangle_mesh_tangent_space_calculation.pdf
        generateTangents : function() {
            
            var texcoords = this.attributes.texcoord0.value,
                positions = this.attributes.position.value,
                tangents = this.attributes.tangent.value,
                normals = this.attributes.normal.value;

            var tan1 = [], tan2 = [],
                verticesNumber = this.getVerticesNumber();
            for (var i = 0; i < verticesNumber; i++) {
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

                vec3.add(tan1[i1], tan1[i1], sdir);
                vec3.add(tan1[i2], tan1[i2], sdir);
                vec3.add(tan1[i3], tan1[i3], sdir);
                vec3.add(tan2[i1], tan2[i1], tdir);
                vec3.add(tan2[i2], tan2[i2], tdir);
                vec3.add(tan2[i3], tan2[i3], tdir);
            }
            var tmp = [0, 0, 0, 0];
            var nCrossT = [0, 0, 0];
            for (var i = 0; i < verticesNumber; i++) {
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

        isUniqueVertex : function() {
            if (this.isUseFace()) {
                return this.getVerticesNumber() === this.faces.length * 3;
            } else {
                return true;
            }
        },

        generateUniqueVertex : function() {

            var vertexUseCount = [];
            // Intialize with empty value, read undefined value from array
            // is slow
            // http://jsperf.com/undefined-array-read
            for (var i = 0; i < this.getVerticesNumber(); i++) {
                vertexUseCount[i] = 0;
            }

            var cursor = this.getVerticesNumber(),
                attributes = this.getEnabledAttributes(),
                faces = this.faces;

            function cloneAttribute(idx) {
                for (var name in attributes) {
                    var array = attributes[name].value;
                    var size = array[0].length || 1;
                    if (size === 1) {
                        array.push(array[idx]);
                    } else {
                        array.push(arrSlice.call(array[idx]));
                    }
                }
            }
            for (var i = 0; i < faces.length; i++) {
                var face = faces[i],
                    i1 = face[0],
                    i2 = face[1],
                    i3 = face[2];
                if (vertexUseCount[i1] > 0) {
                    cloneAttribute(i1);
                    face[0] = cursor;
                    cursor++;
                }
                if (vertexUseCount[i2] > 0) {
                    cloneAttribute(i2);
                    face[1] = cursor;
                    cursor++;
                }
                if (vertexUseCount[i3] > 0) {
                    cloneAttribute(i3);
                    face[2] = cursor;
                    cursor++;
                }
                vertexUseCount[i1]++;
                vertexUseCount[i2]++;
                vertexUseCount[i3]++;
            }

            this.dirty();
        },

        // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
        // http://en.wikipedia.org/wiki/Barycentric_coordinate_system_(mathematics)
        generateBarycentric : (function() {
            var a = [1, 0, 0],
                b = [0, 0, 1],
                c = [0, 1, 0];
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
            }
        })(),
        // TODO : tangent
        applyMatrix : function(matrix) {
            var positions = this.attributes.position.value;
            var normals = this.attributes.normal.value;

            matrix = matrix._array;
            for (var i = 0; i < positions.length; i++) {
                vec3.transformMat4(positions[i], positions[i], matrix);
            }
            // Normal Matrix
            var inverseTransposeMatrix = mat4.create();
            mat4.invert(inverseTransposeMatrix, matrix);
            mat4.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

            for (var i = 0; i < normals.length; i++) {
                vec3.transformMat4(normals[i], normals[i], inverseTransposeMatrix);
            }
        },

        dispose : function(_gl) {
            this.cache.use(_gl.__GUID__);
            var chunks = this.cache.get('chunks');
            if (chunks) {
                for (var c = 0; c < chunks.length; c++) {
                    var chunk = chunks[c];

                    for (var name in chunk.attributeBuffers) {
                        var attribs = chunk.attributeBuffers[name];
                        _gl.deleteBuffer(attribs.buffer);
                    }
                }
            }
            this.cache.deleteContext(_gl.__GUID__);
        }
    });
    
    Geometry.STATIC_DRAW = glenum.STATIC_DRAW;
    Geometry.DYNAMIC_DRAW = glenum.DYNAMIC_DRAW;
    Geometry.STREAM_DRAW = glenum.STREAM_DRAW;
    
    return Geometry;
})
/**
 * StaticGeometry can not be changed once they've been setup
 */
define(function(require) {

    'use strict';

    var Geometry = require('./Geometry');
    var BoundingBox = require('./math/BoundingBox');
    var glMatrix = require('./dep/glmatrix');
    var glenum = require('./core/glenum');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    /**
     * @constructor qtek.StaticGeometry
     * @extends qtek.Geometry
     */
    var StaticGeometry = Geometry.derive(function() {
        return /** @lends qtek.StaticGeometry# */ {
            attributes: {
                 position: new Geometry.Attribute('position', 'float', 3, 'POSITION', false),
                 texcoord0: new Geometry.Attribute('texcoord0', 'float', 2, 'TEXCOORD_0', false),
                 texcoord1: new Geometry.Attribute('texcoord1', 'float', 2, 'TEXCOORD_1', false),
                 normal: new Geometry.Attribute('normal', 'float', 3, 'NORMAL', false),
                 tangent: new Geometry.Attribute('tangent', 'float', 4, 'TANGENT', false),
                 color: new Geometry.Attribute('color', 'float', 4, 'COLOR', false),
                 // Skinning attributes
                 // Each vertex can be bind to 4 bones, because the 
                 // sum of weights is 1, so the weights is stored in vec3 and the last
                 // can be calculated by 1-w.x-w.y-w.z
                 weight: new Geometry.Attribute('weight', 'float', 3, 'WEIGHT', false),
                 joint: new Geometry.Attribute('joint', 'float', 4, 'JOINT', false),
                 // For wireframe display
                 // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
                 barycentric: new Geometry.Attribute('barycentric', 'float', 3, null, false),
            },

            hint: glenum.STATIC_DRAW,

            /**
             * @type {Uint16Array}
             */
            faces: null,

            _normalType: 'vertex',

            _enabledAttributes: null
        };
    }, 
    /** @lends qtek.StaticGeometry.prototype */
    {
        dirty: function() {
            this._cache.dirtyAll();
            this._enabledAttributes = null;
        },
        
        getVertexNumber: function() {
            var mainAttribute = this.attributes[this.mainAttribute];
            if (!mainAttribute || !mainAttribute.value) {
                return 0;
            }
            return mainAttribute.value.length / mainAttribute.size;
        },

        getFaceNumber: function() {
            if (!this.faces) {
                return 0;
            } else {
                return this.faces.length / 3;
            }
        },

        getFace: function (idx, out) {
            if (idx < this.getFaceNumber() && idx >= 0) {
                if (!out) {
                    out = vec3.create();
                }
                out[0] = this.faces[idx * 3];
                out[1] = this.faces[idx * 3 + 1];
                out[2] = this.faces[idx * 3 + 2];
                return out;
            }
        },
        
        isUseFace: function() {
            return this.useFace && (this.faces != null);
        },
        
        createAttribute: function(name, type, size, semantic) {
            var attrib = new Geometry.Attribute(name, type, size, semantic, false);
            this.attributes[name] = attrib;
            this._attributeList.push(name);
            return attrib;
        },

        removeAttribute: function(name) {
            var idx = this._attributeList.indexOf(name);
            if (idx >= 0) {
                this._attributeList.splice(idx, 1);
                delete this.attributes[name];
                return true;
            }
            return false;
        },

        /**
         * Get enabled attributes name list
         * Attribute which has the same vertex number with position is treated as a enabled attribute
         * @return {string[]}
         */
        getEnabledAttributes: function() {
            // Cache
            if (this._enabledAttributes) {
                return this._enabledAttributes;
            }

            var result = [];
            var nVertex = this.getVertexNumber();

            for (var i = 0; i < this._attributeList.length; i++) {
                var name = this._attributeList[i];
                var attrib = this.attributes[name];
                if (attrib.value) {
                    if (attrib.value.length === nVertex * attrib.size) {
                        result.push(name);
                    }
                }
            }

            this._enabledAttributes = result;

            return result;
        },

        getBufferChunks: function(_gl) {
            this._cache.use(_gl.__GLID__);
            if (this._cache.isDirty()) {
                this._updateBuffer(_gl);
                this._cache.fresh();
            }
            return this._cache.get('chunks');
        },
        
        _updateBuffer: function(_gl) {
            var chunks = this._cache.get('chunks');
            var firstUpdate = false;
            if (! chunks) {
                chunks = [];
                // Intialize
                chunks[0] = {
                    attributeBuffers: [],
                    indicesBuffer: null
                };
                this._cache.put('chunks', chunks);
                firstUpdate = true;
            }
            var chunk = chunks[0];
            var attributeBuffers = chunk.attributeBuffers;
            var indicesBuffer = chunk.indicesBuffer;

            var attributeList = this.getEnabledAttributes();
            var prevSearchIdx = 0;
            var count = 0;
            for (var k = 0; k < attributeList.length; k++) {
                var name = attributeList[k];
                var attribute = this.attributes[name];

                var bufferInfo;

                if (!firstUpdate) {
                    // Search for created buffer
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
                _gl.bufferData(_gl.ARRAY_BUFFER, attribute.value, this.hint);

                attributeBuffers[count++] = new Geometry.AttributeBuffer(name, attribute.type, buffer, attribute.size, attribute.semantic);
            }
            attributeBuffers.length = count;

            if (this.isUseFace()) {
                if (!indicesBuffer) {
                    indicesBuffer = new Geometry.IndicesBuffer(_gl.createBuffer());
                    chunk.indicesBuffer = indicesBuffer;
                }
                indicesBuffer.count = this.faces.length;
                _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
                _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, this.faces, this.hint);
            }
        },

        generateVertexNormals: function() {
            var faces = this.faces;
            var positions = this.attributes.position.value;
            var normals = this.attributes.normal.value;

            if (!normals || normals.length !== positions.length) {
                normals = this.attributes.normal.value = new Float32Array(positions.length);
            } else {
                // Reset
                for (var i = 0; i < normals.length; i++) {
                    normals[i] = 0;
                }
            }

            var p1 = vec3.create();
            var p2 = vec3.create();
            var p3 = vec3.create();

            var v21 = vec3.create();
            var v32 = vec3.create();

            var n = vec3.create();

            for (var f = 0; f < faces.length;) {
                var i1 = faces[f++];
                var i2 = faces[f++];
                var i3 = faces[f++];

                vec3.set(p1, positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
                vec3.set(p2, positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
                vec3.set(p3, positions[i3*3], positions[i3*3+1], positions[i3*3+2]);

                vec3.sub(v21, p1, p2);
                vec3.sub(v32, p2, p3);
                vec3.cross(n, v21, v32);
                // Weighted by the triangle area
                for (var i = 0; i < 3; i++) {
                    normals[i1*3+i] = normals[i1*3+i] + n[i];
                    normals[i2*3+i] = normals[i2*3+i] + n[i];
                    normals[i3*3+i] = normals[i3*3+i] + n[i];
                }
            }

            for (var i = 0; i < normals.length;) {
                vec3.set(n, normals[i], normals[i+1], normals[i+2]);
                vec3.normalize(n, n);
                normals[i++] = n[0];
                normals[i++] = n[1];
                normals[i++] = n[2];
            }
        },

        generateFaceNormals: function() {
            if (!this.isUniqueVertex()) {
                this.generateUniqueVertex();
            }

            var faces = this.faces;
            var positions = this.attributes.position.value;
            var normals = this.attributes.normal.value;

            var p1 = vec3.create();
            var p2 = vec3.create();
            var p3 = vec3.create();

            var v21 = vec3.create();
            var v32 = vec3.create();
            var n = vec3.create();

            if (!normals) {
                normals = this.attributes.position.value = new Float32Array(positions.length);
            }
            for (var f = 0; f < faces.length;) {
                var i1 = faces[f++];
                var i2 = faces[f++];
                var i3 = faces[f++];

                vec3.set(p1, positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
                vec3.set(p2, positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
                vec3.set(p3, positions[i3*3], positions[i3*3+1], positions[i3*3+2]);

                vec3.sub(v21, p1, p2);
                vec3.sub(v32, p2, p3);
                vec3.cross(n, v21, v32);

                vec3.normalize(n, n);

                for (var i = 0; i < 3; i++) {
                    normals[i1*3+i] = n[i];
                    normals[i2*3+i] = n[i];
                    normals[i3*3+i] = n[i];
                }
            }
        },

        generateTangents: function() {
            var nVertex = this.getVertexNumber();
            if (!this.attributes.tangent.value) {
                this.attributes.tangent.value = new Float32Array(nVertex * 4);
            }
            var texcoords = this.attributes.texcoord0.value;
            var positions = this.attributes.position.value;
            var tangents = this.attributes.tangent.value;
            var normals = this.attributes.normal.value;

            var tan1 = [];
            var tan2 = [];
            for (var i = 0; i < nVertex; i++) {
                tan1[i] = [0.0, 0.0, 0.0];
                tan2[i] = [0.0, 0.0, 0.0];
            }

            var sdir = [0.0, 0.0, 0.0];
            var tdir = [0.0, 0.0, 0.0];
            for (var i = 0; i < this.faces.length;) {
                var i1 = this.faces[i++],
                    i2 = this.faces[i++],
                    i3 = this.faces[i++],

                    st1s = texcoords[i1 * 2],
                    st2s = texcoords[i2 * 2],
                    st3s = texcoords[i3 * 2],
                    st1t = texcoords[i1 * 2 + 1],
                    st2t = texcoords[i2 * 2 + 1],
                    st3t = texcoords[i3 * 2 + 1],

                    p1x = positions[i1 * 3],
                    p2x = positions[i2 * 3],
                    p3x = positions[i3 * 3],
                    p1y = positions[i1 * 3 + 1],
                    p2y = positions[i2 * 3 + 1],
                    p3y = positions[i3 * 3 + 1],
                    p1z = positions[i1 * 3 + 2],
                    p2z = positions[i2 * 3 + 2],
                    p3z = positions[i3 * 3 + 2];

                var x1 = p2x - p1x,
                    x2 = p3x - p1x,
                    y1 = p2y - p1y,
                    y2 = p3y - p1y,
                    z1 = p2z - p1z,
                    z2 = p3z - p1z;

                var s1 = st2s - st1s,
                    s2 = st3s - st1s,
                    t1 = st2t - st1t,
                    t2 = st3t - st1t;

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
            var tmp = vec3.create();
            var nCrossT = vec3.create();
            var n = vec3.create();
            for (var i = 0; i < nVertex; i++) {
                n[0] = normals[i * 3];
                n[1] = normals[i * 3 + 1];
                n[2] = normals[i * 3 + 2];
                var t = tan1[i];

                // Gram-Schmidt orthogonalize
                vec3.scale(tmp, n, vec3.dot(n, t));
                vec3.sub(tmp, t, tmp);
                vec3.normalize(tmp, tmp);
                // Calculate handedness.
                vec3.cross(nCrossT, n, t);
                tangents[i * 4] = tmp[0];
                tangents[i * 4 + 1] = tmp[1];
                tangents[i * 4 + 2] = tmp[2];
                tangents[i * 4 + 3] = vec3.dot(nCrossT, tan2[i]) < 0.0 ? -1.0 : 1.0;
            }
        },

        isUniqueVertex: function() {
            if (this.isUseFace()) {
                return this.getVertexNumber() === this.faces.length;
            } else {
                return true;
            }
        },

        generateUniqueVertex: function() {
            var vertexUseCount = [];

            for (var i = 0, len = this.getVertexNumber(); i < len; i++) {
                vertexUseCount[i] = 0;
            }

            var cursor = this.getVertexNumber();
            var attributes = this.attributes;
            var faces = this.faces;

            var attributeNameList = this.getEnabledAttributes();

            for (var a = 0; a < attributeNameList.length; a++) {
                var name = attributeNameList[a];
                var expandedArray = new Float32Array(this.faces.length * attributes[name].size);
                var len = attributes[name].value.length;
                for (var i = 0; i < len; i++) {
                    expandedArray[i] = attributes[name].value[i];
                }
                attributes[name].value = expandedArray;
            }

            for (var i = 0; i < faces.length; i++) {
                var ii = faces[i];
                if (vertexUseCount[ii] > 0) {
                    for (var a = 0; a < attributeNameList.length; a++) {
                        var name = attributeNameList[a];
                        var array = attributes[name].value;
                        var size = attributes[name].size;

                        for (var k = 0; k < size; k++) {
                            array[cursor * size + k] = array[ii * size + k];
                        }
                    }
                    faces[i] = cursor;
                    cursor++;
                }
                vertexUseCount[ii]++;
            }
        },

        generateBarycentric: function() {

            if (! this.isUniqueVertex()) {
                this.generateUniqueVertex();
            }

            var array = this.attributes.barycentric.value;
            // Already existed;
            if (array && array.length === this.faces.length * 3) {
                return;
            }
            array = this.attributes.barycentric.value = new Float32Array(this.faces.length * 3);
            for (var i = 0; i < this.faces.length;) {
                for (var j = 0; j < 3; j++) {
                    var ii = this.faces[i++];
                    array[ii + j] = 1;
                }
            }
        },

        convertToDynamic: function(geometry) {
            for (var i = 0; i < this.faces.length; i+=3) {
                geometry.faces.push(this.face.subarray(i, i + 3));
            }

            var attributes = this.getEnabledAttributes();
            for (var name in attributes) {
                var attrib = attributes[name];
                var geoAttrib = geometry.attributes[name];
                if (!geoAttrib) {
                    geoAttrib = geometry.attributes[name] = {
                        type: attrib.type,
                        size: attrib.size,
                        value: []
                    };
                    if (attrib.semantic) {
                        geoAttrib.semantic = attrib.semantic;
                    }
                }
                for (var i = 0; i < attrib.value.length; i+= attrib.size) {
                    if (attrib.size === 1) {
                        geoAttrib.value.push(attrib.array[i]);
                    } else {
                        geoAttrib.value.push(attrib.subarray(i, i + attrib.size));
                    }
                }
            }

            if (this.boundingBox) {
                geometry.boundingBox = new BoundingBox();
                geometry.boundingBox.min.copy(this.boundingBox.min);
                geometry.boundingBox.max.copy(this.boundingBox.max);
            }
            // PENDING copy buffer ?
            
            return geometry;
        },

        applyTransform: function(matrix) {

            var positions = this.attributes.position.value;
            var normals = this.attributes.normal.value;
            var tangents = this.attributes.tangent.value;

            matrix = matrix._array;
            // Normal Matrix
            var inverseTransposeMatrix = mat4.create();
            mat4.invert(inverseTransposeMatrix, matrix);
            mat4.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

            vec3.forEach(positions, 3, 0, null, vec3.transformMat4, matrix);
            if (normals) {
                vec3.forEach(normals, 3, 0, null, vec3.transformMat4, inverseTransposeMatrix);
            }
            if (tangents) {
                vec3.forEach(tangents, 4, 0, null, vec3.transformMat4, inverseTransposeMatrix);   
            }

            if (this.boundingBox) {
                this.updateBoundingBox();
            }
        },

        dispose: function(_gl) {
            this._cache.use(_gl.__GLID__);
            var chunks = this._cache.get('chunks');
            if (chunks) {
                for (var c = 0; c < chunks.length; c++) {
                    var chunk = chunks[c];

                    for (var k = 0; k < chunk.attributeBuffers.length; k++) {
                        var attribs = chunk.attributeBuffers[k];
                        _gl.deleteBuffer(attribs.buffer);
                    }
                }
            }
            this._cache.deleteContext(_gl.__GLID__);
        }
    });

    return StaticGeometry;
});
import Base from './core/Base';
import glenum from './core/glenum';
import Cache from './core/Cache';
import vendor from './core/vendor';
import glMatrix from './dep/glmatrix';
import BoundingBox from './math/BoundingBox';

var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;

var vec3Create = vec3.create;
var vec3Add = vec3.add;
var vec3Set = vec3.set;

function getArrayCtorByType (type) {
    return ({
        'byte': vendor.Int8Array,
        'ubyte': vendor.Uint8Array,
        'short': vendor.Int16Array,
        'ushort': vendor.Uint16Array
    })[type] || vendor.Float32Array;
}

function makeAttrKey(attrName) {
    return 'attr_' + attrName;
}
/**
 * Geometry attribute
 * @alias qtek.Geometry.Attribute
 * @constructor
 */
function Attribute(name, type, size, semantic) {
    /**
     * Attribute name
     * @type {string}
     */
    this.name = name;
    /**
     * Attribute type
     * Possible values:
     *  + `'byte'`
     *  + `'ubyte'`
     *  + `'short'`
     *  + `'ushort'`
     *  + `'float'` Most commonly used.
     * @type {string}
     */
    this.type = type;
    /**
     * Size of attribute component. 1 - 4.
     * @type {number}
     */
    this.size = size;
    /**
     * Semantic of this attribute.
     * Possible values:
     *  + `'POSITION'`
     *  + `'NORMAL'`
     *  + `'BINORMAL'`
     *  + `'TANGENT'`
     *  + `'TEXCOORD'`
     *  + `'TEXCOORD_0'`
     *  + `'TEXCOORD_1'`
     *  + `'COLOR'`
     *  + `'JOINT'`
     *  + `'WEIGHT'`
     * 
     * In shader, attribute with same semantic will be automatically mapped. For example:
     * ```glsl
     * attribute vec3 pos: POSITION
     * ```
     * will use the attribute value with semantic POSITION in geometry, no matter what name it used.
     * @type {string}
     */
    this.semantic = semantic || '';

    /**
     * Value of the attribute.
     * @type {TypedArray}
     */
    this.value = null;

    // Init getter setter
    switch (size) {
        case 1:
            this.get = function (idx) {
                return this.value[idx];
            };
            this.set = function (idx, value) {
                this.value[idx] = value;
            };
            // Copy from source to target
            this.copy = function (target, source) {
                this.value[target] = this.value[target];
            };
            break;
        case 2:
            this.get = function (idx, out) {
                var arr = this.value;
                out[0] = arr[idx * 2];
                out[1] = arr[idx * 2 + 1];
                return out;
            };
            this.set = function (idx, val) {
                var arr = this.value;
                arr[idx * 2] = val[0];
                arr[idx * 2 + 1] = val[1];
            };
            this.copy = function (target, source) {
                var arr = this.value;
                source *= 2;
                target *= 2;
                arr[target] = arr[source];
                arr[target + 1] = arr[source + 1];
            };
            break;
        case 3:
            this.get = function (idx, out) {
                var idx3 = idx * 3;
                var arr = this.value;
                out[0] = arr[idx3];
                out[1] = arr[idx3 + 1];
                out[2] = arr[idx3 + 2];
                return out;
            };
            this.set = function (idx, val) {
                var idx3 = idx * 3;
                var arr = this.value;
                arr[idx3] = val[0];
                arr[idx3 + 1] = val[1];
                arr[idx3 + 2] = val[2];
            };
            this.copy = function (target, source) {
                var arr = this.value;
                source *= 3;
                target *= 3;
                arr[target] = arr[source];
                arr[target + 1] = arr[source + 1];
                arr[target + 2] = arr[source + 2];
            };
            break;
        case 4:
            this.get = function (idx, out) {
                var arr = this.value;
                var idx4 = idx * 4;
                out[0] = arr[idx4];
                out[1] = arr[idx4 + 1];
                out[2] = arr[idx4 + 2];
                out[3] = arr[idx4 + 3];
                return out;
            };
            this.set = function (idx, val) {
                var arr = this.value;
                var idx4 = idx * 4;
                arr[idx4] = val[0];
                arr[idx4 + 1] = val[1];
                arr[idx4 + 2] = val[2];
                arr[idx4 + 3] = val[3];
            };
            this.copy = function (target, source) {
                var arr = this.value;
                source *= 4;
                target *= 4;
                // copyWithin is extremely slow
                arr[target] = arr[source];
                arr[target + 1] = arr[source + 1];
                arr[target + 2] = arr[source + 2];
                arr[target + 3] = arr[source + 3];
            };
    }
}

/**
 * Set item value at give index. Second parameter val is number if size is 1
 * @method
 * @name qtek.Geometry.Attribute#set
 * @param {number} idx
 * @param {number[]|number} val
 * @example
 * geometry.getAttribute('position').set(0, [1, 1, 1]);
 */

/**
 * Get item value at give index. Second parameter out is no need if size is 1
 * @method
 * @name qtek.Geometry.Attribute#set
 * @param {number} idx
 * @param {number[]} [out]
 * @example
 * geometry.getAttribute('position').get(0, out);
 */

/**
 * Initialize attribute with given vertex count
 * @param {number} nVertex 
 */
Attribute.prototype.init = function (nVertex) {
    if (!this.value || this.value.length != nVertex * this.size) {
        var ArrayConstructor = getArrayCtorByType(this.type);
        this.value = new ArrayConstructor(nVertex * this.size);
    }
};

/**
 * Initialize attribute with given array. Which can be 1 dimensional or 2 dimensional
 * @param {Array} array
 * @example
 *  geometry.getAttribute('position').fromArray(
 *      [-1, 0, 0, 1, 0, 0, 0, 1, 0]
 *  );
 *  geometry.getAttribute('position').fromArray(
 *      [ [-1, 0, 0], [1, 0, 0], [0, 1, 0] ]
 *  );
 */
Attribute.prototype.fromArray = function (array) {
    var ArrayConstructor = getArrayCtorByType(this.type);
    var value;
    // Convert 2d array to flat
    if (array[0] && (array[0].length)) {
        var n = 0;
        var size = this.size;
        value = new ArrayConstructor(array.length * size);
        for (var i = 0; i < array.length; i++) {
            for (var j = 0; j < size; j++) {
                value[n++] = array[i][j];
            }
        }
    }
    else {
        value = new ArrayConstructor(array);
    }
    this.value = value;
};

Attribute.prototype.clone = function(copyValue) {
    var ret = new Attribute(this.name, this.type, this.size, this.semantic);
    // FIXME
    if (copyValue) {
        console.warn('todo');
    }
    return ret;
};

function AttributeBuffer(name, type, buffer, size, semantic) {
    this.name = name;
    this.type = type;
    this.buffer = buffer;
    this.size = size;
    this.semantic = semantic;

    // To be set in mesh
    // symbol in the shader
    this.symbol = '';

    // Needs remove flag
    this.needsRemove = false;
}

function IndicesBuffer(buffer) {
    this.buffer = buffer;
    this.count = 0;
}

/**
 * @constructor qtek.Geometry
 * @extends qtek.core.Base
 */
var Geometry = Base.extend(function () {
    return /** @lends qtek.Geometry# */ {
        /**
         * Attributes of geometry. Including:
         *  + `position`
         *  + `texcoord0`
         *  + `texcoord1`
         *  + `normal`
         *  + `tangent`
         *  + `color`
         *  + `weight`
         *  + `joint`
         *  + `barycentric`
         * @type {Object}
         */
        attributes: {
            position: new Attribute('position', 'float', 3, 'POSITION'),
            texcoord0: new Attribute('texcoord0', 'float', 2, 'TEXCOORD_0'),
            texcoord1: new Attribute('texcoord1', 'float', 2, 'TEXCOORD_1'),
            normal: new Attribute('normal', 'float', 3, 'NORMAL'),
            tangent: new Attribute('tangent', 'float', 4, 'TANGENT'),
            color: new Attribute('color', 'float', 4, 'COLOR'),
            // Skinning attributes
            // Each vertex can be bind to 4 bones, because the
            // sum of weights is 1, so the weights is stored in vec3 and the last
            // can be calculated by 1-w.x-w.y-w.z
            weight: new Attribute('weight', 'float', 3, 'WEIGHT'),
            joint: new Attribute('joint', 'float', 4, 'JOINT'),
            // For wireframe display
            // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
            barycentric: new Attribute('barycentric', 'float', 3, null),
        },
        /**
         * Calculated bounding box of geometry.
         * @type {qtek.math.BoundingBox}
         */
        boundingBox: null,

        /**
         * Indices of geometry.
         * @type {Uint16Array|Uint32Array}
         */
        indices: null,

        /**
         * Is vertices data dynamically updated.
         * Attributes value can't be changed after first render if dyanmic is false.
         * @type {boolean}
         */
        dynamic: true,

        _enabledAttributes: null
    };
}, function() {
    // Use cache
    this._cache = new Cache();

    this._attributeList = Object.keys(this.attributes);
},
/** @lends qtek.Geometry.prototype */
{
    /**
     * Main attribute will be used to count vertex number
     * @type {string}
     */
    mainAttribute: 'position',
    /**
     * User defined picking algorithm instead of default
     * triangle ray intersection
     * x, y are NDC.
     * ```typescript
     * (x, y, renderer, camera, renderable, out) => boolean
     * ```
     * @type {?Function}
     */
    pick: null,

    /**
     * User defined ray picking algorithm instead of default
     * triangle ray intersection
     * ```typescript
     * (ray: qtek.math.Ray, renderable: qtek.Renderable, out: Array) => boolean
     * ```
     * @type {?Function}
     */
    pickByRay: null,

    /**
     * Update boundingBox of Geometry
     */
    updateBoundingBox: function () {
        var bbox = this.boundingBox;
        if (!bbox) {
            bbox = this.boundingBox = new BoundingBox();
        }
        var posArr = this.attributes.position.value;
        if (posArr && posArr.length) {
            var min = bbox.min;
            var max = bbox.max;
            var minArr = min._array;
            var maxArr = max._array;
            vec3.set(minArr, posArr[0], posArr[1], posArr[2]);
            vec3.set(maxArr, posArr[0], posArr[1], posArr[2]);
            for (var i = 3; i < posArr.length;) {
                var x = posArr[i++];
                var y = posArr[i++];
                var z = posArr[i++];
                if (x < minArr[0]) { minArr[0] = x; }
                if (y < minArr[1]) { minArr[1] = y; }
                if (z < minArr[2]) { minArr[2] = z; }

                if (x > maxArr[0]) { maxArr[0] = x; }
                if (y > maxArr[1]) { maxArr[1] = y; }
                if (z > maxArr[2]) { maxArr[2] = z; }
            }
            min._dirty = true;
            max._dirty = true;
        }
    },
    /**
     * Mark attributes and indices in geometry needs to update.
     */
    dirty: function () {
        var enabledAttributes = this.getEnabledAttributes();
        for (var i = 0; i < enabledAttributes.length; i++) {
            this.dirtyAttribute(enabledAttributes[i]);
        }
        this.dirtyIndices();
        this._enabledAttributes = null;
    },
    /**
     * Mark the indices needs to update.
     */
    dirtyIndices: function () {
        this._cache.dirtyAll('indices');
    },
    /**
     * Mark the attributes needs to update.
     * @param {string} [attrName]
     */
    dirtyAttribute: function (attrName) {
        this._cache.dirtyAll(makeAttrKey(attrName));
        this._cache.dirtyAll('attributes');
    },
    /**
     * Get indices of triangle at given index.
     * @param {number} idx
     * @param {Array.<number>} out
     * @return {Array.<number>}
     */
    getTriangleIndices: function (idx, out) {
        if (idx < this.triangleCount && idx >= 0) {
            if (!out) {
                out = vec3Create();
            }
            var indices = this.indices;
            out[0] = indices[idx * 3];
            out[1] = indices[idx * 3 + 1];
            out[2] = indices[idx * 3 + 2];
            return out;
        }
    },

    /**
     * Set indices of triangle at given index.
     * @param {number} idx
     * @param {Array.<number>} arr
     */
    setTriangleIndices: function (idx, arr) {
        var indices = this.indices;
        indices[idx * 3] = arr[0];
        indices[idx * 3 + 1] = arr[1];
        indices[idx * 3 + 2] = arr[2];
    },

    isUseIndices: function () {
        return !!this.indices;
    },

    /**
     * Initialize indices from an array.
     * @param {Array} array 
     */
    initIndicesFromArray: function (array) {
        var value;
        var ArrayConstructor = this.vertexCount > 0xffff
            ? vendor.Uint32Array : vendor.Uint16Array;
        // Convert 2d array to flat
        if (array[0] && (array[0].length)) {
            var n = 0;
            var size = 3;

            value = new ArrayConstructor(array.length * size);
            for (var i = 0; i < array.length; i++) {
                for (var j = 0; j < size; j++) {
                    value[n++] = array[i][j];
                }
            }
        }
        else {
            value = new ArrayConstructor(array);
        }

        this.indices = value;
    },
    /**
     * Create a new attribute
     * @param {string} name
     * @param {string} type
     * @param {number} size
     * @param {string} [semantic]
     */
    createAttribute: function (name, type, size, semantic) {
        var attrib = new Attribute(name, type, size, semantic);
        if (this.attributes[name]) {
            this.removeAttribute(name);
        }
        this.attributes[name] = attrib;
        this._attributeList.push(name);
        return attrib;
    },
    /**
     * Remove attribute
     * @param {string} name
     */
    removeAttribute: function (name) {
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
     * Get attribute
     * @param {string} name
     * @return {qtek.Geometry.Attribute}
     */
    getAttribute: function (name) {
        return this.attribute[name];
    },

    /**
     * Get enabled attributes name list
     * Attribute which has the same vertex number with position is treated as a enabled attribute
     * @return {string[]}
     */
    getEnabledAttributes: function () {
        var enabledAttributes = this._enabledAttributes;
        var attributeList = this._attributeList;
        // Cache
        if (enabledAttributes) {
            return enabledAttributes;
        }

        var result = [];
        var nVertex = this.vertexCount;

        for (var i = 0; i < attributeList.length; i++) {
            var name = attributeList[i];
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

    getBufferChunks: function (renderer) {
        var cache = this._cache;
        cache.use(renderer.__GUID__);
        var isAttributesDirty = cache.isDirty('attributes');
        var isIndicesDirty = cache.isDirty('indices');
        if (isAttributesDirty || isIndicesDirty) {
            this._updateBuffer(renderer.gl, isAttributesDirty, isIndicesDirty);
            var enabledAttributes = this.getEnabledAttributes();
            for (var i = 0; i < enabledAttributes.length; i++) {
                cache.fresh(makeAttrKey(enabledAttributes[i]));
            }
            cache.fresh('attributes');
            cache.fresh('indices');
        }
        return cache.get('chunks');
    },

    _updateBuffer: function (_gl, isAttributesDirty, isIndicesDirty) {
        var cache = this._cache;
        var chunks = cache.get('chunks');
        var firstUpdate = false;
        if (!chunks) {
            chunks = [];
            // Intialize
            chunks[0] = {
                attributeBuffers: [],
                indicesBuffer: null
            };
            cache.put('chunks', chunks);
            firstUpdate = true;
        }

        var chunk = chunks[0];
        var attributeBuffers = chunk.attributeBuffers;
        var indicesBuffer = chunk.indicesBuffer;

        if (isAttributesDirty || firstUpdate) {
            var attributeList = this.getEnabledAttributes();

            var attributeBufferMap = {};
            if (!firstUpdate) {
                for (var i = 0; i < attributeBuffers.length; i++) {
                    attributeBufferMap[attributeBuffers[i].name] = attributeBuffers[i];
                }
            }
            // FIXME If some attributes removed
            for (var k = 0; k < attributeList.length; k++) {
                var name = attributeList[k];
                var attribute = this.attributes[name];

                var bufferInfo;

                if (!firstUpdate) {
                    bufferInfo = attributeBufferMap[name];
                }
                var buffer;
                if (bufferInfo) {
                    buffer = bufferInfo.buffer;
                }
                else {
                    buffer = _gl.createBuffer();
                }
                if (cache.isDirty(makeAttrKey(name))) {
                    // Only update when they are dirty.
                    // TODO: Use BufferSubData?
                    _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                    _gl.bufferData(_gl.ARRAY_BUFFER, attribute.value, this.dynamic ? glenum.DYNAMIC_DRAW : glenum.STATIC_DRAW);
                }

                attributeBuffers[k] = new AttributeBuffer(name, attribute.type, buffer, attribute.size, attribute.semantic);
            }
            // Remove unused attributes buffers.
            // PENDING
            for (var i = k; i < attributeBuffers.length; i++) {
                _gl.deleteBuffer(attributeBuffers[i].buffer);
            }
            attributeBuffers.length = k;

        }

        if (this.isUseIndices() && (isIndicesDirty || firstUpdate)) {
            if (!indicesBuffer) {
                indicesBuffer = new IndicesBuffer(_gl.createBuffer());
                chunk.indicesBuffer = indicesBuffer;
            }
            indicesBuffer.count = this.indices.length;
            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
            _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, this.indices, this.dynamic ? glenum.DYNAMIC_DRAW : glenum.STATIC_DRAW);
        }
    },

    /**
     * Generate normals per vertex.
     */
    generateVertexNormals: function () {
        if (!this.vertexCount) {
            return;
        }

        var indices = this.indices;
        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;

        if (!normals || normals.length !== positions.length) {
            normals = attributes.normal.value = new vendor.Float32Array(positions.length);
        }
        else {
            // Reset
            for (var i = 0; i < normals.length; i++) {
                normals[i] = 0;
            }
        }

        var p1 = vec3Create();
        var p2 = vec3Create();
        var p3 = vec3Create();

        var v21 = vec3Create();
        var v32 = vec3Create();

        var n = vec3Create();

        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var f = 0; f < len;) {
            if (indices) {
                i1 = indices[f++];
                i2 = indices[f++];
                i3 = indices[f++];
            }
            else {
                i1 = f++;
                i2 = f++;
                i3 = f++;
            }

            vec3Set(p1, positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
            vec3Set(p2, positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
            vec3Set(p3, positions[i3*3], positions[i3*3+1], positions[i3*3+2]);

            vec3.sub(v21, p1, p2);
            vec3.sub(v32, p2, p3);
            vec3.cross(n, v21, v32);
            // Already be weighted by the triangle area
            for (var i = 0; i < 3; i++) {
                normals[i1*3+i] = normals[i1*3+i] + n[i];
                normals[i2*3+i] = normals[i2*3+i] + n[i];
                normals[i3*3+i] = normals[i3*3+i] + n[i];
            }
        }

        for (var i = 0; i < normals.length;) {
            vec3Set(n, normals[i], normals[i+1], normals[i+2]);
            vec3.normalize(n, n);
            normals[i++] = n[0];
            normals[i++] = n[1];
            normals[i++] = n[2];
        }
        this.dirty();
    },

    /**
     * Generate normals per face.
     */
    generateFaceNormals: function () {
        if (!this.vertexCount) {
            return;
        }

        if (!this.isUniqueVertex()) {
            this.generateUniqueVertex();
        }

        var indices = this.indices;
        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;

        var p1 = vec3Create();
        var p2 = vec3Create();
        var p3 = vec3Create();

        var v21 = vec3Create();
        var v32 = vec3Create();
        var n = vec3Create();

        if (!normals) {
            normals = attributes.normal.value = new Float32Array(positions.length);
        }
        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var f = 0; f < len;) {
            if (indices) {
                i1 = indices[f++];
                i2 = indices[f++];
                i3 = indices[f++];
            }
            else {
                i1 = f++;
                i2 = f++;
                i3 = f++;
            }

            vec3Set(p1, positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
            vec3Set(p2, positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
            vec3Set(p3, positions[i3*3], positions[i3*3+1], positions[i3*3+2]);

            vec3.sub(v21, p1, p2);
            vec3.sub(v32, p2, p3);
            vec3.cross(n, v21, v32);

            vec3.normalize(n, n);

            for (var i = 0; i < 3; i++) {
                normals[i1*3 + i] = n[i];
                normals[i2*3 + i] = n[i];
                normals[i3*3 + i] = n[i];
            }
        }
        this.dirty();
    },

    /**
     * Generate tangents attributes.
     */
    generateTangents: function () {
        if (!this.vertexCount) {
            return;
        }

        var nVertex = this.vertexCount;
        var attributes = this.attributes;
        if (!attributes.tangent.value) {
            attributes.tangent.value = new Float32Array(nVertex * 4);
        }
        var texcoords = attributes.texcoord0.value;
        var positions = attributes.position.value;
        var tangents = attributes.tangent.value;
        var normals = attributes.normal.value;

        if (!texcoords) {
            console.warn('Geometry without texcoords can\'t generate tangents.');
            return;
        }

        var tan1 = [];
        var tan2 = [];
        for (var i = 0; i < nVertex; i++) {
            tan1[i] = [0.0, 0.0, 0.0];
            tan2[i] = [0.0, 0.0, 0.0];
        }

        var sdir = [0.0, 0.0, 0.0];
        var tdir = [0.0, 0.0, 0.0];
        var indices = this.indices;

        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var i = 0; i < len;) {
            if (indices) {
                i1 = indices[i++];
                i2 = indices[i++];
                i3 = indices[i++];
            }
            else {
                i1 = i++;
                i2 = i++;
                i3 = i++;
            }

            var st1s = texcoords[i1 * 2],
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

            vec3Add(tan1[i1], tan1[i1], sdir);
            vec3Add(tan1[i2], tan1[i2], sdir);
            vec3Add(tan1[i3], tan1[i3], sdir);
            vec3Add(tan2[i1], tan2[i1], tdir);
            vec3Add(tan2[i2], tan2[i2], tdir);
            vec3Add(tan2[i3], tan2[i3], tdir);
        }
        var tmp = vec3Create();
        var nCrossT = vec3Create();
        var n = vec3Create();
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
            // PENDING can config ?
            tangents[i * 4 + 3] = vec3.dot(nCrossT, tan2[i]) < 0.0 ? -1.0 : 1.0;
        }
        this.dirty();
    },
    
    /**
     * If vertices are not shared by different indices.
     */
    isUniqueVertex: function () {
        if (this.isUseIndices()) {
            return this.vertexCount === this.indices.length;
        }
        else {
            return true;
        }
    },
    /**
     * Create a unique vertex for each index.
     */
    generateUniqueVertex: function () {
        if (!this.vertexCount || !this.indices) {
            return;
        }

        if (this.indices.length > 0xffff) {
            this.indices = new vendor.Uint32Array(this.indices);
        }

        var attributes = this.attributes;
        var indices = this.indices;

        var attributeNameList = this.getEnabledAttributes();

        var oldAttrValues = {};
        for (var a = 0; a < attributeNameList.length; a++) {
            var name = attributeNameList[a];
            oldAttrValues[name] = attributes[name].value;
            attributes[name].init(this.indices.length);
        }

        var cursor = 0;
        for (var i = 0; i < indices.length; i++) {
            var ii = indices[i];
            for (var a = 0; a < attributeNameList.length; a++) {
                var name = attributeNameList[a];
                var array = attributes[name].value;
                var size = attributes[name].size;

                for (var k = 0; k < size; k++) {
                    array[cursor * size + k] = oldAttrValues[name][ii * size + k];
                }
            }
            indices[i] = cursor;
            cursor++;
        }

        this.dirty();
    },

    /**
     * Generate barycentric coordinates for wireframe draw.
     */
    generateBarycentric: function () {
        if (!this.vertexCount) {
            return;
        }

        if (!this.isUniqueVertex()) {
            this.generateUniqueVertex();
        }

        var attributes = this.attributes;
        var array = attributes.barycentric.value;
        var indices = this.indices;
        // Already existed;
        if (array && array.length === indices.length * 3) {
            return;
        }
        array = attributes.barycentric.value = new Float32Array(indices.length * 3);
        
        for (var i = 0; i < (indices ? indices.length : this.vertexCount / 3);) {
            for (var j = 0; j < 3; j++) {
                var ii = indices ? indices[i++] : (i * 3 + j);
                array[ii * 3 + j] = 1;
            }
        }
        this.dirty();
    },

    /**
     * Apply transform to geometry attributes.
     * @param {qtek.math.Matrix4} matrix
     */
    applyTransform: function (matrix) {

        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;
        var tangents = attributes.tangent.value;

        matrix = matrix._array;
        // Normal Matrix
        var inverseTransposeMatrix = mat4.create();
        mat4.invert(inverseTransposeMatrix, matrix);
        mat4.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

        var vec3TransformMat4 = vec3.transformMat4;
        var vec3ForEach = vec3.forEach;
        vec3ForEach(positions, 3, 0, null, vec3TransformMat4, matrix);
        if (normals) {
            vec3ForEach(normals, 3, 0, null, vec3TransformMat4, inverseTransposeMatrix);
        }
        if (tangents) {
            vec3ForEach(tangents, 4, 0, null, vec3TransformMat4, inverseTransposeMatrix);
        }

        if (this.boundingBox) {
            this.updateBoundingBox();
        }
    },
    /**
     * Dispose geometry data in GL context.
     * @param {qtek.Renderer} renderer
     */
    dispose: function (renderer) {

        var cache = this._cache;

        cache.use(renderer.__GUID__);
        var chunks = cache.get('chunks');
        if (chunks) {
            for (var c = 0; c < chunks.length; c++) {
                var chunk = chunks[c];

                for (var k = 0; k < chunk.attributeBuffers.length; k++) {
                    var attribs = chunk.attributeBuffers[k];
                    renderer.gl.deleteBuffer(attribs.buffer);
                }
            }
        }
        cache.deleteContext(renderer.__GUID__);
    }

});

if (Object.defineProperty) {
    /**
     * @name qtek.Geometry#vertexCount
     * @type {number}
     * @readOnly
     */
    Object.defineProperty(Geometry.prototype, 'vertexCount', {

        enumerable: false,

        get: function () {
            var mainAttribute = this.attributes[this.mainAttribute];
            if (!mainAttribute || !mainAttribute.value) {
                return 0;
            }
            return mainAttribute.value.length / mainAttribute.size;
        }
    });
    /**
     * @name qtek.Geometry#triangleCount
     * @type {number}
     * @readOnly
     */
    Object.defineProperty(Geometry.prototype, 'triangleCount', {

        enumerable: false,

        get: function () {
            var indices = this.indices;
            if (!indices) {
                return 0;
            }
            else {
                return indices.length / 3;
            }
        }
    });
}

Geometry.STATIC_DRAW = glenum.STATIC_DRAW;
Geometry.DYNAMIC_DRAW = glenum.DYNAMIC_DRAW;
Geometry.STREAM_DRAW = glenum.STREAM_DRAW;

Geometry.AttributeBuffer = AttributeBuffer;
Geometry.IndicesBuffer = IndicesBuffer;

Geometry.Attribute = Attribute;

export default Geometry;

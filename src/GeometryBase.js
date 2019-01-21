import Base from './core/Base';
import glenum from './core/glenum';
import Cache from './core/Cache';
import vendor from './core/vendor';

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
 * GeometryBase attribute
 * @alias clay.GeometryBase.Attribute
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
 * @function
 * @name clay.GeometryBase.Attribute#set
 * @param {number} idx
 * @param {number[]|number} val
 * @example
 * geometry.getAttribute('position').set(0, [1, 1, 1]);
 */

/**
 * Get item value at give index. Second parameter out is no need if size is 1
 * @function
 * @name clay.GeometryBase.Attribute#set
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
    if (!this.value || this.value.length !== nVertex * this.size) {
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
 * Base of all geometry. Use {@link clay.Geometry} for common 3D usage.
 * @constructor clay.GeometryBase
 * @extends clay.core.Base
 */
var GeometryBase = Base.extend(function () {
    return /** @lends clay.GeometryBase# */ {
        /**
         * Attributes of geometry.
         * @type {Object.<string, clay.GeometryBase.Attribute>}
         */
        attributes: {},

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

        _enabledAttributes: null,

        // PENDING
        // Init it here to avoid deoptimization when it's assigned in application dynamically
        __used: 0
    };
}, function () {
    // Use cache
    this._cache = new Cache();

    this._attributeList = Object.keys(this.attributes);

    this.__vaoCache = {};
},
/** @lends clay.GeometryBase.prototype */
{
    /**
     * Main attribute will be used to count vertex number
     * @type {string}
     */
    mainAttribute: '',
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
     * (ray: clay.Ray, renderable: clay.Renderable, out: Array) => boolean
     * ```
     * @type {?Function}
     */
    pickByRay: null,

    /**
     * Mark attributes and indices in geometry needs to update.
     * Usually called after you change the data in attributes.
     */
    dirty: function () {
        var enabledAttributes = this.getEnabledAttributes();
        for (var i = 0; i < enabledAttributes.length; i++) {
            this.dirtyAttribute(enabledAttributes[i]);
        }
        this.dirtyIndices();
        this._enabledAttributes = null;

        this._cache.dirty('any');
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
                out = [];
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
     * @return {clay.GeometryBase.Attribute}
     */
    getAttribute: function (name) {
        return this.attributes[name];
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
        cache.use(renderer.__uid__);
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
        cache.fresh('any');
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
                    _gl.bufferData(_gl.ARRAY_BUFFER, attribute.value, this.dynamic ? _gl.DYNAMIC_DRAW : _gl.STATIC_DRAW);
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
            _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, this.indices, this.dynamic ? _gl.DYNAMIC_DRAW : _gl.STATIC_DRAW);
        }
    },

    /**
     * Dispose geometry data in GL context.
     * @param {clay.Renderer} renderer
     */
    dispose: function (renderer) {

        var cache = this._cache;

        cache.use(renderer.__uid__);
        var chunks = cache.get('chunks');
        if (chunks) {
            for (var c = 0; c < chunks.length; c++) {
                var chunk = chunks[c];

                for (var k = 0; k < chunk.attributeBuffers.length; k++) {
                    var attribs = chunk.attributeBuffers[k];
                    renderer.gl.deleteBuffer(attribs.buffer);
                }

                if (chunk.indicesBuffer) {
                    renderer.gl.deleteBuffer(chunk.indicesBuffer.buffer);
                }
            }
        }
        if (this.__vaoCache) {
            var vaoExt = renderer.getGLExtension('OES_vertex_array_object');
            for (var id in this.__vaoCache) {
                var vao = this.__vaoCache[id].vao;
                if (vao) {
                    vaoExt.deleteVertexArrayOES(vao);
                }
            }
        }
        this.__vaoCache = {};
        cache.deleteContext(renderer.__uid__);
    }

});

if (Object.defineProperty) {
    /**
     * @name clay.GeometryBase#vertexCount
     * @type {number}
     * @readOnly
     */
    Object.defineProperty(GeometryBase.prototype, 'vertexCount', {

        enumerable: false,

        get: function () {

            var mainAttribute = this.attributes[this.mainAttribute];

            if (!mainAttribute) {
                mainAttribute = this.attributes[this._attributeList[0]];
            }

            if (!mainAttribute || !mainAttribute.value) {
                return 0;
            }
            return mainAttribute.value.length / mainAttribute.size;
        }
    });
    /**
     * @name clay.GeometryBase#triangleCount
     * @type {number}
     * @readOnly
     */
    Object.defineProperty(GeometryBase.prototype, 'triangleCount', {

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

GeometryBase.STATIC_DRAW = glenum.STATIC_DRAW;
GeometryBase.DYNAMIC_DRAW = glenum.DYNAMIC_DRAW;
GeometryBase.STREAM_DRAW = glenum.STREAM_DRAW;

GeometryBase.AttributeBuffer = AttributeBuffer;
GeometryBase.IndicesBuffer = IndicesBuffer;

GeometryBase.Attribute = Attribute;

export default GeometryBase;

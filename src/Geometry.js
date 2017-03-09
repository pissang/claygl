define(function(require) {

    'use strict';

    var Base = require('./core/Base');
    var glenum = require('./core/glenum');
    var Cache = require('./core/Cache');
    var vendor = require('./core/vendor');

    function getArrayCtorByType (type) {
        var ArrayConstructor;
        switch(type) {
            case 'byte':
                ArrayConstructor = vendor.Int8Array;
                break;
            case 'ubyte':
                ArrayConstructor = vendor.Uint8Array;
                break;
            case 'short':
                ArrayConstructor = vendor.Int16Array;
                break;
            case 'ushort':
                ArrayConstructor = vendor.Uint16Array;
                break;
            default:
                ArrayConstructor = vendor.Float32Array;
                break;
        }
        return ArrayConstructor;
    }


    function Attribute(name, type, size, semantic) {
        this.name = name;
        this.type = type;
        this.size = size;
        if (semantic) {
            this.semantic = semantic;
        }
    }
    Attribute.prototype.clone = function(copyValue) {
        var ret = new this.constructor(this.name, this.type, this.size, this.semantic);
        // FIXME
        if (copyValue) {
            console.warn('todo');
        }
        return ret;
    };


    /**
     * Attribute for static geometry
     */
    function StaticAttribute (name, type, size, semantic) {
        Attribute.call(this, name, type, size, semantic);
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
                    out[0] = arr[idx3++];
                    out[1] = arr[idx3++];
                    out[2] = arr[idx3++];
                    return out;
                };
                this.set = function (idx, val) {
                    var idx3 = idx * 3;
                    var arr = this.value;
                    arr[idx3++] = val[0];
                    arr[idx3++] = val[1];
                    arr[idx3++] = val[2];
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
                    out[0] = arr[idx4++];
                    out[1] = arr[idx4++];
                    out[2] = arr[idx4++];
                    out[3] = arr[idx4++];
                    return out;
                };
                this.set = function (idx, val) {
                    var arr = this.value;
                    var idx4 = idx * 4;
                    arr[idx4++] = val[0];
                    arr[idx4++] = val[1];
                    arr[idx4++] = val[2];
                    arr[idx4++] = val[3];
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

    StaticAttribute.prototype.constructor = new Attribute();

    StaticAttribute.prototype.init = function (nVertex) {
        if (!this.value || this.value.length != nVertex * this.size) {
            var ArrayConstructor = getArrayCtorByType(this.type);
            this.value = new ArrayConstructor(nVertex * this.size);
        }
    };

    StaticAttribute.prototype.fromArray = function (array) {
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

    function notImplementedWarn() {
        console.warn('Geometry doesn\'t implement this method, use StaticGeometry instead');
    }

    /**
     * @constructor qtek.Geometry
     * @extends qtek.core.Base
     */
    var Geometry = Base.extend(
    /** @lends qtek.Geometry# */
    {
        /**
         * @type {qtek.math.BoundingBox}
         */
        boundingBox : null,

        /**
         * Vertex attributes
         * @type {Object}
         */
        attributes : {},

        indices : null,

        /**
         * Is vertices data dynamically updated
         * @type {boolean}
         */
        dynamic: false,

    }, function() {
        // Use cache
        this._cache = new Cache();

        this._attributeList = Object.keys(this.attributes);
    },
    /** @lends qtek.Geometry.prototype */
    {
        /**
         * User defined ray picking algorithm instead of default
         * triangle ray intersection
         * x, y are NDC.
         * (x, y, renderer, camera, renderable, out) => boolean
         * @type {Function}
         */
        pickByRay: null,

        /**
         * User defined picking algorithm instead of default
         * triangle ray intersection
         * (ray: qtek.math.Ray, renderable: qtek.Renderable, out: Array) => boolean
         * @type {Function}
         */
        pick: null,

        /**
         * Main attribute will be used to count vertex number
         * @type {string}
         */
        mainAttribute: 'position',
        /**
         * Mark attributes in geometry is dirty
         * @method
         */
        dirty: notImplementedWarn,
        /**
         * Create a new attribute
         * @method
         * @param {string} name
         * @param {string} type
         * @param {number} size
         * @param {string} [semantic]
         */
        createAttribute: notImplementedWarn,
        /**
         * Remove attribute
         * @method
         * @param {string} name
         */
        removeAttribute: notImplementedWarn,

        /**
         * @method
         * @param {number} idx
         * @param {Array.<number>} out
         * @return {Array.<number>}
         */
        getTriangleIndices: notImplementedWarn,

        /**
         * @method
         * @param {number} idx
         * @param {Array.<number>} face
         */
        setTriangleIndices: notImplementedWarn,
        /**
         * @method
         * @return {boolean}
         */
        isUseIndices: notImplementedWarn,

        getEnabledAttributes: notImplementedWarn,
        getBufferChunks: notImplementedWarn,

        /**
         * @method
         */
        generateVertexNormals: notImplementedWarn,
        /**
         * @method
         */
        generateFaceNormals: notImplementedWarn,
        /**
         * @method
         * @return {boolean}
         */
        isUniqueVertex: notImplementedWarn,
        /**
         * @method
         */
        generateUniqueVertex: notImplementedWarn,
        /**
         * @method
         */
        generateTangents: notImplementedWarn,
        /**
         * @method
         */
        generateBarycentric: notImplementedWarn,
        /**
         * @method
         * @param {qtek.math.Matrix4} matrix
         */
        applyTransform: notImplementedWarn,
        /**
         * @method
         * @param {WebGLRenderingContext} [gl]
         */
        dispose: notImplementedWarn
    });

    Geometry.STATIC_DRAW = glenum.STATIC_DRAW;
    Geometry.DYNAMIC_DRAW = glenum.DYNAMIC_DRAW;
    Geometry.STREAM_DRAW = glenum.STREAM_DRAW;

    Geometry.AttributeBuffer = AttributeBuffer;
    Geometry.IndicesBuffer = IndicesBuffer;
    Geometry.Attribute = Attribute;
    Geometry.StaticAttribute = StaticAttribute;

    return Geometry;
});
define(function(require) {
    
    'use strict';

    var Base = require('./core/Base');
    var glenum = require('./core/glenum');
    var Cache = require('./core/Cache');
    var vendor = require('./core/vendor');
    var glmatrix = require('./dep/glmatrix');
    var vec2 = glmatrix.vec2;
    var vec3 = glmatrix.vec3;
    var vec4 = glmatrix.vec4;

    var vec4Copy = vec4.copy;
    var vec3Copy = vec3.copy;
    var vec2Copy = vec2.copy;

    // PENDING put the buffer data in attribute ? 
    function Attribute(name, type, size, semantic, isDynamic) {
        this.name = name;
        this.type = type;
        this.size = size;
        if (semantic) {
            this.semantic = semantic;
        }
        if (isDynamic) {
            this._isDynamic = true;
            this.value = [];
        } else {
            this._isDynamic = false;
            this.value = null;
        }

        // Init getter setter
        switch (size) {
            case 1:
                this.get = function (idx) {
                    return this.value[idx];
                };
                this.set = function (idx, value) {
                    this.value[idx] = value;
                };
                break;
            case 2:
                if (isDynamic) {
                    this.get = function (idx, out) {
                        var item = this.value[idx];
                        if (item) {
                            vec2Copy(out, item);
                        }
                        return out;
                    };
                    this.set = function (idx, val) {
                        var item = this.value[idx];
                        if (!item) {
                            item = this.value[idx] = vec2.create();
                        }
                        vec2Copy(item, val);
                    };
                } else {
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
                }
                break;
            case 3:
                if (isDynamic) {
                    this.get = function (idx, out) {
                        var item = this.value[idx];
                        if (item) {
                            vec3Copy(out, item);
                        }
                        return out;
                    };
                    this.set = function (idx, val) {
                        var item = this.value[idx];
                        if (!item) {
                            item = this.value[idx] = vec3.create();
                        }
                        vec3Copy(item, val);
                    };
                } else {
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
                }
                break;
            case 4:
                if (isDynamic) {
                    this.get = function (idx, out) {
                        var item = this.value[idx];
                        if (item) {
                            vec4Copy(out, item);
                        }
                        return out;
                    };
                    this.set = function (idx, val) {
                        var item = this.value[idx];
                        if (!item) {
                            item = this.value[idx] = vec4.create();
                        }
                        vec4Copy(item, val);
                    };
                } else {
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
                }
                break;
        }
    }

    Attribute.prototype.init = function(nVertex) {
        if (!this._isDynamic) {
            if (!this.value || this.value.length != nVertex * this.size) {
                var ArrayConstructor;
                switch(this.type) {
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
                this.value = new ArrayConstructor(nVertex * this.size);
            }
        } else {
            console.warn('Dynamic geometry not support init method');
        }
    };

    Attribute.prototype.clone = function(copyValue) {
        var ret = new Attribute(this.name, this.type, this.size, this.semantic, this._isDynamic);
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
    }

    function IndicesBuffer(buffer) {
        this.buffer = buffer;
        this.count = 0;
    }

    function notImplementedWarn() {
        console.warn('Geometry doesn\'t implement this method, use DynamicGeometry or StaticGeometry instead');
    }

    /**
     * @constructor qtek.Geometry
     * @extends qtek.core.Base
     */
    var Geometry = Base.derive(
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

        faces : null,

        /**
         * Is vertices data dynamically updated
         * @type {boolean}
         */
        dynamic: false,

        /**
         * @type {boolean}
         */
        useFace : true
        
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
         * @type {Function}
         */
        pickByRay: null,

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
         * @return {number}
         */
        getVertexNumber: notImplementedWarn,
        /**
         * @method
         * @return {number}
         */
        getFaceNumber: notImplementedWarn,
        /**
         * @method
         * @param {number} idx
         * @param {Array.<number>} out
         * @return {Array.<number>}
         */
        getFace: notImplementedWarn,
        /**
         * @method
         * @return {boolean}
         */
        isUseFace: notImplementedWarn,

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
         * @param {WebGLRenderingContext} gl
         */
        dispose: notImplementedWarn
    });

    Geometry.STATIC_DRAW = glenum.STATIC_DRAW;
    Geometry.DYNAMIC_DRAW = glenum.DYNAMIC_DRAW;
    Geometry.STREAM_DRAW = glenum.STREAM_DRAW;

    Geometry.AttributeBuffer = AttributeBuffer;
    Geometry.IndicesBuffer = IndicesBuffer;
    Geometry.Attribute = Attribute;

    return Geometry;
});
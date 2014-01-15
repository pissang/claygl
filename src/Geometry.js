define(function(require) {
    
    'use strict'

    var Base = require("./core/Base");
    var util = require("./core/util");
    var glenum = require("./core/glenum");
    var Cache = require("./core/Cache");

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

    function IndicesBuffer(buffer, count) {
        this.buffer = buffer;
        this.count = count;
    }

    function notImplementedWarn() {
        console.warn('Geometry doesn\'t implement this method, use DynamicGeometry or StaticGeometry instead');
    }

    var Geometry = Base.derive(function() {
        return {     
            boundingBox : null,
            
            attributes : {},

            faces : null,

            useFace : true,

            //Max Value of Uint16, i.e. 0xffff
            chunkSize : 65535,
        }
    }, function() {
        // Use cache
        this.cache = new Cache();
    }, {
        dirty : notImplementedWarn,
        getVertexNumber : notImplementedWarn,
        getFaceNumber : notImplementedWarn,
        isUseFace : notImplementedWarn,
        getEnabledAttributes : notImplementedWarn,
        getBufferChunks : notImplementedWarn,
        generateVertexNormals : notImplementedWarn,
        generateFaceNormals : notImplementedWarn,
        isUniqueVertex : notImplementedWarn,
        generateUniqueVertex : notImplementedWarn,
        generateTangents : notImplementedWarn,
        generateBarycentric : notImplementedWarn,
        applyTransform : notImplementedWarn,
        dispose : notImplementedWarn
    });

    Geometry.STATIC_DRAW = glenum.STATIC_DRAW;
    Geometry.DYNAMIC_DRAW = glenum.DYNAMIC_DRAW;
    Geometry.STREAM_DRAW = glenum.STREAM_DRAW;

    Geometry.AttributeBuffer = AttributeBuffer;
    Geometry.IndicesBuffer = IndicesBuffer;

    return Geometry
});
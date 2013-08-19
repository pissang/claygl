/**
 * @export{class} InstantGeometry
 * InstantGeometry can not be changed once they've been setup
 */
define(function(require) {

    var Base = require("core/base");
    var util = require("util/util");
    var BoundingBox = require("3d/boundingbox");
    var Geometry = require("3d/geometry");

    var InstantGeometry = Base.derive(function() {
        return {
            __GUID__ : util.genGUID(),
            
            boundingBox : new BoundingBox(),

            useFace : true,

            hint : 'STATIC_DRAW',

            _normalType : 'vertex',

            // Typed Array of each geometry chunk
            // schema
            // [{
            //     attributes:{
            //          position : {
            //              size : 0,
            //              type : '',
            //              semantic : '',
            //              array : ''
            //          }
            //      },
            //     indices : array
            // }]
            _arrayChunks : []
        }
    }, {
        addChunk : function(chunk) {
            this._arrayChunks.push(chunk);
        },
        dirty : function() {
            this.cache.dirtyAll("chunks");
        },
        getBufferChunks : function(_gl) {
            this.cache.use(_gl.__GUID__);
            if (this.cache.isDirty("chunks")) {
                this._updateBuffer(_gl);    
            }
            return this.cache.get("chunks");
        },
        isUseFace : function() {
            return this.useFace;
        },
        _updateBuffer : function(_gl) {
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
                    indicesArray = arrayChunk.indices;

                for (var name in arrayChunk.attributes) {
                    var attribute = arrayChunk.attributes[name];

                    var bufferInfo = attributeBuffers[name],
                        buffer;
                    if (bufferInfo) {
                        buffer = bufferInfo.buffer
                    } else {
                        buffer = _gl.createBuffer();
                    }
                    //TODO: Use BufferSubData?
                    _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                    _gl.bufferData(_gl.ARRAY_BUFFER, attribute.array, _gl[this.hint]);

                    attributeBuffers[name] = {
                        type : attribute.type,
                        buffer : buffer,
                        size : attribute.size,
                        semantic : attribute.semantic,
                    }
                }
                if (! indicesBuffer) {
                    indicesBuffer = chunk.indicesBuffer = {
                        buffer : _gl.createBuffer(),
                        count : indicesArray.length
                    }
                }
                _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
                _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, indicesArray, _gl[this.hint]);
            }
        },

        dispose : function() {

        }
    });

    return InstantGeometry;
})
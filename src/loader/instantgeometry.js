/**
 * @export{class} InstantGeometry
 * InstantGeometry can not be changed once they've been setup
 */
define(function(require) {

    'use strict';

    var Base = require("core/base");
    var util = require("util/util");
    var BoundingBox = require("3d/boundingbox");
    var Geometry = require("3d/geometry");
    var glMatrix = require("glmatrix");
    var vec3 = glMatrix.vec3;

    var InstantGeometry = Base.derive(function() {
        return {
            __GUID__ : util.genGUID(),
            
            boundingBox : new BoundingBox(),

            useFace : true,

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
                this.cache.fresh("chunks");
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
                    _gl.bufferData(_gl.ARRAY_BUFFER, attribute.array, _gl.STATIC_DRAW);

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
                _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, indicesArray, _gl.STATIC_DRAW);
            }
        },
        convertToGeometry : function() {
            var geometry = new Geometry();

            var offset = 0;
            for (var c = 0; c < this._arrayChunks.length; c++) {
                var chunk = this._arrayChunks[c],
                    indicesArr = chunk.indices;

                for (var i = 0; i < indicesArr.length; i+=3) {
                    geometry.faces.push(
                        [
                            indicesArr[i] + offset,
                            indicesArr[i+1] + offset, 
                            indicesArr[i+2] + offset
                        ]
                    );
                }

                for (var name in chunk.attributes) {
                    var attrib = chunk.attributes[name];
                    var geoAttrib;
                    for (var n in geometry.attributes) {
                        if (geometry.attributes[n].semantic === attrib.semantic) {
                            geoAttrib = geometry.attributes[n];
                        }
                    }
                    if (geoAttrib) {
                        for (var i = 0; i < attrib.array.length; i+= attrib.size) {
                            if (attrib.size === 1) {
                                geoAttrib.value.push(attrib.array[i]);
                            } else {
                                var item = [];
                                for (var j = 0; j < attrib.size; j++) {
                                    item[j] = attrib.array[i+j];
                                }
                                geoAttrib.value.push(item);
                            }
                        }
                    }
                }
                offset += chunk.attributes.position.length / 3;
            }

            return geometry;
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

    return InstantGeometry;
})
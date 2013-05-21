define( function(require){

    var Node = require("./node");
    var _ = require("_");

    var prevDrawID = 0;

    var Mesh = Node.derive( function() {

        return {
            
            material : null,

            geometry : null,

            // Draw mode
            mode : "TRIANGLES",
            
            receiveShadow : true,
            castShadow : true
        }
    }, {

        render : function( _gl, globalMaterial ) {

            this.trigger('beforerender', _gl);
            
            var material = globalMaterial || this.material;
            var shader = material.shader;
            var geometry = this.geometry;

            var glDrawMode = _gl[ this.mode.toUpperCase() ];

            //Draw each chunk
            var chunks = geometry.getBufferChunks( _gl );

            for( var c = 0; c < chunks.length; c++){
                currentDrawID = _gl.__GUID__ + "_" + geometry.__GUID__ + "_" + c;

                var chunk = chunks[c],
                    attributeBuffers = chunk.attributeBuffers,
                    indicesBuffer = chunk.indicesBuffer;

                if( currentDrawID !== prevDrawID ){
                    prevDrawID = currentDrawID;
                    
                    availableAttributes = {};
                    for(var name in attributeBuffers){
                        var attributeBufferInfo = attributeBuffers[name];
                        var semantic = attributeBufferInfo.semantic;

                        if( semantic ){
                            var semanticInfo = shader.semantics[ semantic ];
                            var symbol = semanticInfo && semanticInfo.symbol;
                        }else{
                            var symbol = name;
                        }
                        if(symbol && shader.attributeTemplates[symbol] ){
                            availableAttributes[symbol] = attributeBufferInfo;
                        }
                    }
                    shader.enableAttributes(_gl, Object.keys(availableAttributes) );
                    // Setting attributes;
                    for( var symbol in availableAttributes ){
                        var attributeBufferInfo = availableAttributes[symbol];
                        var buffer = attributeBufferInfo.buffer;

                        _gl.bindBuffer( _gl.ARRAY_BUFFER, buffer );
                        shader.setMeshAttribute( _gl, symbol, attributeBufferInfo );
                    }
                }
                //Do drawing
                if( geometry.useFaces ){
                    _gl.bindBuffer( _gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer );
                    _gl.drawElements( glDrawMode, indicesBuffer.count, _gl.UNSIGNED_SHORT, 0 );
                }else{
                    _gl.drawArrays( glDrawMode, 0, geometry.vertexCount );
                }
            }

            var drawInfo = {
                faceNumber : geometry.faces.length,
                vertexNumber : geometry.getVerticesNumber(),
                drawcallNumber : chunks.length
            };
            this.trigger('afterrender', _gl, drawInfo);

            return drawInfo;
        },

        bindGeometry : function( _gl ) {

            var shader = this.material.shader;
            var geometry = this.geometry;

        }

    });

    // Called when material is changed
    // In case the material changed and geometry not changed
    // And the previous material has less attributes than next material
    Mesh.materialChanged = function(){
        prevDrawID = 0;
    }

    return Mesh;
} )
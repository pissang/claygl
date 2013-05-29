/**
 * Example
 * {
 *  name : "xxx",
    shader : shader,
 *  inputs :{ 
                "texture" : {
                    node : "xxx",
                    pin : "diffuse"
                }
             }
    outputs : {
                diffuse : {
                    attachment : "COLOR_ATTACHMENT0"
                    parameters : {
                        format : "RGBA",
                        width : 512,
                        height : 512
                    }
                }
            }

   }
 * Multiple outputs is reserved for MRT support
 *
 * TODO blending 
 */
define( function( require ){

    var Base = require("core/base");
    var Pass = require("../pass");
    var FrameBuffer = require("../../framebuffer");
    var vertexShaderStr = require("text!../shaders/vertex.essl");
    var Shader = require("../../shader");
    var texturePool = require("./texturepool");

    var Node = Base.derive( function(){
        return {

            name : "",

            inputs : {},
            
            outputs : null,

            shader : '',
            // Example:
            // inputName : {
            //  node : [Node],
            //  pin : 'xxxx'    
            // }
            _inputLinks : {},
            // Example:
            // outputName : [{
            //  node : [Node],
            //  pin : 'xxxx'    
            // }]
            _outputLinks : {},

            _textures : {},

            pass : null,

            //{
            //  name : 2
            //}
            _outputReferences : {}
        }
    }, function(){
        if( this.shader ){
            var pass = new Pass({
                fragment : this.shader
            });
            this.pass = pass;   
        }
        if(this.outputs){
            this.frameBuffer = new FrameBuffer({
                depthBuffer : false
            })
        }
    }, {

        render : function( renderer ){
            var _gl = renderer.gl;
            for( var inputName in this._inputLinks ){
                var link = this._inputLinks[inputName];
                var inputTexture = link.node.getOutput( renderer, link.pin );
                this.pass.setUniform( inputName, inputTexture );
            }
            // Output
            if( ! this.outputs){
                this.pass.outputs = null;
                this.pass.render( renderer );
            }
            else{
                this.pass.outputs = {};

                for( var name in this.outputs){

                    var outputInfo = this.outputs[name];

                    var texture = texturePool.get( outputInfo.parameters );
                    this._textures[name] = texture;

                    var attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
                    if(typeof(attachment) == "string"){
                        attachment = _gl[attachment];
                    }
                    this.pass.outputs[ attachment ] = texture;

                }

                this.pass.render( renderer, this.frameBuffer );
            }
            
            for( var inputName in this._inputLinks ){
                var link = this._inputLinks[inputName];
                link.node.removeReference( link.pin );
            }
        },

        setParameter : function( name, value ){
            this.pass.setUniform( name, value );
        },

        setParameters : function(obj){
            for(var name in obj){
                this.setParameter(name, obj[name]);
            }
        },

        getOutput : function( renderer, name ){
            var outputInfo = this.outputs[name];
            if( ! outputInfo){
                return ;
            }
            if( this._textures[name] ){
                // Already been rendered in this frame
                return this._textures[name];
            }

            this.render( renderer );
            
            return this._textures[name];
        },

        removeReference : function( name ){
            this._outputReferences[name]--;
            if( this._outputReferences[name] === 0){
                // Output of this node have alreay been used by all other nodes
                // Put the texture back to the pool.
                texturePool.put( this._textures[name] );
                this._textures[name] = null;
            }
        },

        link : function( inputPinName, fromNode, fromPinName){

            // The relationship from output pin to input pin is one-on-multiple
            this._inputLinks[ inputPinName ] = {
                node : fromNode,
                pin : fromPinName
            }
            if( ! fromNode._outputLinks[ fromPinName ] ){
                fromNode._outputLinks[ fromPinName ] = [];
            }
            fromNode._outputLinks[ fromPinName ].push( {
                node : this,
                pin : inputPinName
            } )
        },

        clear : function(){
            this._inputLinks = {};
            this._outputLinks = {};
        },

        updateReference : function( ){
            for( var name in this._outputLinks ){
                this._outputReferences[ name ] = this._outputLinks[name].length;
            }
        }
    })

    return Node;
})
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
    },
    // Optional, only use for the node in group
    groupInputs : {
        // Group input pin name : node input pin name
        "texture" : "texture"
    },
    outputs : {
            diffuse : {
                attachment : FrameBuffer.COLOR_ATTACHMENT0
                parameters : {
                    format : Texture.RGBA,
                    width : 512,
                    height : 512
                }
            }
        }
    },
    // Optional, only use for the node in group
    groupOutputs : {
        // Node output pin name : group output pin name
        "diffuse" : "diffuse"
    }
 * Multiple outputs is reserved for MRT support
 *
 * TODO blending 
 */
define(function(require) {

    var Base = require("core/base");
    var Pass = require("./pass");
    var FrameBuffer = require("../framebuffer");
    var Shader = require("../shader");
    var texturePool = require("./texturepool");

    var Node = Base.derive(function() {
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
            inputLinks : {},
            // Example:
            // outputName : [{
            //  node : [Node],
            //  pin : 'xxxx'    
            // }]
            outputLinks : {},


            pass : null,

            _outputTextures : {},
            //{
            //  name : 2
            //}
            _outputReferences : {},

            _rendering : false
        }
    }, function() {
        if (this.shader) {
            var pass = new Pass({
                fragment : this.shader
            });
            this.pass = pass;   
        }
        if (this.outputs) {
            this.frameBuffer = new FrameBuffer({
                depthBuffer : false
            })
        }
    }, {

        render : function(renderer) {
            
            this._rendering = true;

            var _gl = renderer.gl;

            for (var inputName in this.inputLinks) {
                var link = this.inputLinks[inputName];
                var inputTexture = link.node.getOutput(renderer, link.pin);
                this.pass.setUniform(inputName, inputTexture);
            }
            // Output
            if (! this.outputs) {
                this.pass.outputs = null;
                this.pass.render(renderer);
            } else {
                this.pass.outputs = {};

                for (var name in this.outputs) {

                    var outputInfo = this.outputs[name];

                    var texture = texturePool.get(outputInfo.parameters || {});
                    this._outputTextures[name] = texture;

                    var attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
                    if (typeof(attachment) == "string") {
                        attachment = _gl[attachment];
                    }
                    this.pass.outputs[attachment] = texture;
                }

                this.pass.render(renderer, this.frameBuffer);

            }
            
            for (var inputName in this.inputLinks) {
                var link = this.inputLinks[inputName];
                link.node.removeReference(link.pin);
            }

            this._rendering = false;
        },

        setParameter : function(name, value) {
            this.pass.setUniform(name, value);
        },

        setParameters : function(obj) {
            for (var name in obj) {
                this.setParameter(name, obj[name]);
            }
        },

        getOutput : function(renderer, name) {
            var outputInfo = this.outputs[name];
            if (! outputInfo) {
                return ;
            }
            if (this._outputTextures[name]) {
                // Already been rendered in this frame
                return this._outputTextures[name];
            } else if(this._rendering) {
                // Solve circular reference
                var texture = texturePool.get(outputInfo.parameters || {});
                this._outputTextures[name] = texture;
                return texture;
            }

            this.render(renderer);
            
            return this._outputTextures[name];
        },

        removeReference : function(name) {
            this._outputReferences[name]--;
            if (this._outputReferences[name] === 0) {
                // Output of this node have alreay been used by all other nodes
                // Put the texture back to the pool.
                texturePool.put(this._outputTextures[name]);
                this._outputTextures[name] = null;
            }
        },

        link : function(inputPinName, fromNode, fromPinName) {

            // The relationship from output pin to input pin is one-on-multiple
            this.inputLinks[ inputPinName ] = {
                node : fromNode,
                pin : fromPinName
            }
            if (! fromNode.outputLinks[fromPinName]) {
                fromNode.outputLinks[fromPinName] = [];
            }
            fromNode.outputLinks[ fromPinName ].push({
                node : this,
                pin : inputPinName
            })
        },

        clear : function() {
            this.inputLinks = {};
            this.outputLinks = {};
        },

        updateReference : function() {
            for (var name in this.outputLinks) {
                this._outputReferences[ name ] = this.outputLinks[name].length;
            }
        }
    })

    return Node;
})
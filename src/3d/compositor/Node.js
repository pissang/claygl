/**
 * Example
 * {
 *  name : "xxx",
 *  shader : shader,
 *  inputs :{ 
 *      "texture" : {
 *          node : "xxx",
 *          pin : "diffuse"
        }
    },
    // Optional, only use for the node in group
    groupInputs : {
        // Group input pin name : node input pin name
        "texture" : "texture"
    },
    outputs : {
            color : {
                attachment : FrameBuffer.COLOR_ATTACHMENT0
                parameters : {
                    format : Texture.RGBA,
                    width : 512,
                    height : 512
                },
                // Node will keep the texture rendered in last frame
                keepLastFrame : true,
                // Force the node output the texture rendered in last frame
                outputLastFrame : true
            }
        }
    },
    // Optional, only use for the node in group
    groupOutputs : {
        // Node output pin name : group output pin name
        "diffuse" : "diffuse"
    }
 * Multiple outputs is reserved for MRT support in WebGL2.0
 *
 * TODO blending 
 */
define(function(require) {

    'use strict';

    var Base = require("core/Base");
    var Pass = require("./Pass");
    var FrameBuffer = require("../FrameBuffer");
    var Shader = require("../Shader");
    var texturePool = require("./texturePool");

    var Node = Base.derive(function() {
        return {

            name : "",

            inputs : {},
            
            outputs : null,

            shader : '',
            /**
             * Input links, will be auto updated by the graph
             * Example:
             * inputName : {
             *     node : [Node],
             *     pin : 'xxxx'    
             * }
             * @type {Object}
             */
            inputLinks : {},
            /**
             * Output links, will be auto updated by the graph
             * Example:
             * outputName : {
             *     node : [Node],
             *     pin : 'xxxx'    
             * }
             * @type {Object}
             */
            outputLinks : {},
            /**
             * @type {qtek3d.compositor.Pass}
             */
            pass : null,

            // Save the output texture of previous frame
            // Will be used when there exist a circular reference
            _prevOutputTextures : {},
            _outputTextures : {},
            //{
            //  name : 2
            //}
            _outputReferences : {},

            _rendering : false,
            // If rendered in this frame
            _rendered : false
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
        /**
         * Do rendering
         * @param  {qtek3d.Renderer} renderer
         */
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
            this._rendered = true;
        },

        setParameter : function(name, value) {
            this.pass.setUniform(name, value);
        },

        getParameter : function(name) {
            return this.pass.getUniform(name);
        },

        setParameters : function(obj) {
            for (var name in obj) {
                this.setParameter(name, obj[name]);
            }
        },

        getOutput : function(renderer /*optional*/, name) {
            if (name === undefined) {
                // Return the output texture without rendering
                name = renderer;
                return this._outputTextures[name];
            }
            var outputInfo = this.outputs[name];
            if (! outputInfo) {
                return ;
            }
            if (this._rendered) {
                // Already been rendered in this frame
                return this._outputTextures[name];
            } else if (
                this._rendering   // Solve Circular Reference
                || outputInfo.outputLastFrame // Force return texture in last frame
            ) {
                if (!this._prevOutputTextures[name]) {
                    // Create a blank texture at first pass
                    this._prevOutputTextures[name] = texturePool.get(outputInfo.parameters || {});
                }
                return this._prevOutputTextures[name];
            }

            this.render(renderer);
            
            return this._outputTextures[name];
        },

        removeReference : function(name) {
            this._outputReferences[name]--;
            if (this._outputReferences[name] === 0) {
                var outputInfo = this.outputs[name];
                if (outputInfo.keepLastFrame) {
                    if (this._prevOutputTextures[name]) {
                        texturePool.put(this._prevOutputTextures[name]);
                    }
                    this._prevOutputTextures[name] = this._outputTextures[name];
                } else {
                    // Output of this node have alreay been used by all other nodes
                    // Put the texture back to the pool.
                    texturePool.put(this._outputTextures[name]);
                }
            }
        },

        link : function(inputPinName, fromNode, fromPinName) {

            // The relationship from output pin to input pin is one-on-multiple
            this.inputLinks[inputPinName] = {
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

        beforeFrame : function() {
            this._rendered = false;
            for (var name in this.outputLinks) {
                this._outputReferences[name] = this.outputLinks[name].length;
            }
        }
    })

    return Node;
})
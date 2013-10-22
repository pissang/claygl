define(function(require) {

    var Node = require("./Node");
    var FrameBuffer = require("../FrameBuffer");
    var texturePool = require("./texturePool");
    var Shader = require("../Shader");

    var TextureNode = Node.derive(function() {
        return {
            
            shader : Shader.source("buildin.compositor.output"),

            texture : null
        }
    }, {
        render : function(renderer) {

            this._rendering = true;

            var _gl = renderer.gl;
            this.pass.setUniform("texture", this.texture);
            
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
                    this.pass.outputs[ attachment ] = texture;

                }

                this.pass.render(renderer, this.frameBuffer);
            }

            this._rendering = false;
        }
    })

    return TextureNode;
})
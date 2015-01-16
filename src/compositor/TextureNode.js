define(function(require) {

    'use strict';

    var Node = require('./Node');
    var Shader = require('../Shader');

    /**
     * @constructor qtek.compositor.TextureNode
     * @extends qtek.compositor.Node
     */
    var TextureNode = Node.derive(function() {
        return /** @lends qtek.compositor.TextureNode# */ {
            shader: Shader.source('buildin.compositor.output'),
            /**
             * @type {qtek.Texture2D}
             */
            texture: null
        };
    }, {
        render: function(renderer, frameBuffer) {

            this._rendering = true;

            var _gl = renderer.gl;
            this.pass.setUniform('texture', this.texture);
            
            if (! this.outputs) {
                this.pass.outputs = null;
                this.pass.render(renderer, frameBuffer);
            } else {
                
                this.pass.outputs = {};

                for (var name in this.outputs) {
                    var parameters = this.updateParameter(name, renderer);
                    var outputInfo = this.outputs[name];
                    var texture = this._compositor.allocateTexture(parameters);
                    this._outputTextures[name] = texture;

                    var attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
                    if (typeof(attachment) == 'string') {
                        attachment = _gl[attachment];
                    }
                    this.pass.outputs[attachment] = texture;

                }

                this.pass.render(renderer, this.frameBuffer);
            }

            this._rendering = false;
            this._rendered = true;
        }
    });

    return TextureNode;
});
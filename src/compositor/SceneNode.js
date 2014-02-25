define(function(require) {

    var Node = require("./Node");
    var Pass = require("./Pass");
    var FrameBuffer = require("../FrameBuffer");
    var texturePool = require("./texturePool");
    var glinfo = require('../core/glinfo');

    var SceneNode = Node.derive({
            
        name : 'scene',
        
        scene : null,
        
        camera : null,
        
        autoUpdateScene : true,

        preZ : false
        
    }, function() {
        if (this.frameBuffer) {
            this.frameBuffer.depthBuffer = true;
        }
    }, {
        render : function(renderer) {
            
            this._rendering = true;
            var _gl = renderer.gl;

            this.trigger('beforerender');

            if (! this.outputs) {
                
                var renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);

            } else {

                var frameBuffer = this.frameBuffer;
                for (var name in this.outputs) {
                    var parameters = this.updateParameter(name, renderer);
                    var outputInfo = this.outputs[name];
                    var texture = texturePool.get(parameters);
                    this._outputTextures[name] = texture;

                    var attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
                    if (typeof(attachment) == "string") {
                        attachment = _gl[attachment];
                    }
                    frameBuffer.attach(renderer.gl, texture, attachment);
                }
                frameBuffer.bind(renderer);

                // MRT Support in chrome
                // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
                var ext = glinfo.getExtension(_gl, "EXT_draw_buffers");
                if (ext) {
                    var bufs = [];
                    for (var attachment in this.outputs) {
                        attachment = parseInt(attachment);
                        if (attachment >= _gl.COLOR_ATTACHMENT0 && attachment <= _gl.COLOR_ATTACHMENT0 + 8) {
                            bufs.push(attachment);
                        }
                    }
                    ext.drawBuffersEXT(bufs);
                }

                var renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);

                frameBuffer.unbind(renderer);
            }

            this.trigger('afterrender', renderInfo);

            this._rendering = false;
            this._rendered = true;
        }
    })

    return SceneNode;
})
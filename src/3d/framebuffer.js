/**
 * @export{class} FrameBuffer
 */
define(function(require) {
    
    var Base = require("core/base");
    var Texture2D = require("./texture/texture2d");
    var TextureCube = require("./texture/texturecube");
    var WebGLInfo = require('./webglinfo');

    var FrameBuffer = Base.derive(function() {

        return {
            depthBuffer : true,

            //Save attached texture and target
            _attachedTextures : {}
        }
    }, {

        bind : function(renderer) {

            var _gl = renderer.gl;

            _gl.bindFramebuffer(_gl.FRAMEBUFFER, this.getFrameBuffer(_gl));

            this.cache.put("viewport", renderer.viewportInfo);
            renderer.setViewport(0, 0, this.cache.get('width'), this.cache.get('height'));

            // Create a new render buffer
            if (this.cache.miss("renderbuffer") && this.depthBuffer && ! this.cache.get("depth_texture")) {
                this.cache.put("renderbuffer", _gl.createRenderbuffer());
            }

            if (! this.cache.get("depth_texture") && this.depthBuffer) {

                var width = this.cache.get("width"),
                    height = this.cache.get("height"),
                    renderbuffer = this.cache.get('renderbuffer');

                if (width !== this.cache.get("renderbuffer_width")
                     || height !== this.cache.get("renderbuffer_height")) {

                    _gl.bindRenderbuffer(_gl.RENDERBUFFER, renderbuffer);
                    
                    _gl.renderbufferStorage(_gl.RENDERBUFFER, _gl.DEPTH_COMPONENT16, width, height);
                    this.cache.put("renderbuffer_width", width);
                    this.cache.put("renderbuffer_height", height);

                    _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);                 
                }
                if (! this.cache.get("renderbuffer_attached")) {
                    
                    _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.RENDERBUFFER, renderbuffer);
                    this.cache.put("renderbuffer_attached", true);

                }
            }
            
        },

        unbind : function(renderer) {
            var _gl = renderer.gl;
            
            _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);

            this.cache.use(_gl.__GUID__);
            var viewportInfo = this.cache.get("viewport");
            // Reset viewport;
            if (viewportInfo) {
                renderer.setViewport(viewportInfo.x, viewportInfo.y, viewportInfo.width, viewportInfo.height);
            }

            // Because the data of texture is changed over time,
            // Here update the mipmaps of texture each time after rendered;
            for (var attachment in this._attachedTextures) {
                var texture = this._attachedTextures[attachment];
                if (! texture.NPOT && texture.generateMipmaps) {
                    var target = texture.instanceof(TextureCube) ? _gl.TEXTURE_CUBE_MAP : _gl.TEXTURE_2D;
                    _gl.bindTexture(target, texture.getWebGLTexture(_gl));
                    _gl.generateMipmap(target);
                    _gl.bindTexture(target, null);
                }
            }
        },

        getFrameBuffer : function(_gl) {

            this.cache.use(_gl.__GUID__);

            if (this.cache.miss("framebuffer")) {
                this.cache.put("framebuffer", _gl.createFramebuffer());
            }

            return this.cache.get("framebuffer");
        },

        attach : function(_gl, texture, attachment, target) {

            if (! texture.width) {
                console.error("The texture attached to color buffer is not a valid.");
                return;
            }
            if (this._renderBuffer && this.depthBuffer && (this._width !== texture.width || this.height !== texture.height)) {
                console.warn("Attached texture has different width or height, it will cause the render buffer recreate a storage ");
            }

            _gl.bindFramebuffer(_gl.FRAMEBUFFER, this.getFrameBuffer(_gl));

            this.cache.put("width", texture.width);
            this.cache.put("height", texture.height);

            target = target || _gl.TEXTURE_2D;

            // If the depth_texture extension is enabled, developers
            // Can attach a depth texture to the depth buffer
            // http://blog.tojicode.com/2012/07/using-webgldepthtexture.html
            attachment = attachment || _gl.COLOR_ATTACHMENT0;
            
            if (attachment === 'DEPTH_ATTACHMENT') {

                var extension = WebGLInfo.getExtension(_gl, "WEBGL_depth_texture");

                if (!extension) {
                    console.error(" Depth texture is not supported by the browser ");
                    return;
                }
                if (texture.format !== "DEPTH_COMPONENT") {
                    console.error("The texture attached to depth buffer is not a valid.");
                    return;
                }
                this.cache.put("renderbuffer_attached", false);
                this.cache.put("depth_texture", true);
            }

            this._attachedTextures[ attachment ] = texture;

            _gl.framebufferTexture2D(_gl.FRAMEBUFFER, attachment, target, texture.getWebGLTexture(_gl), 0)

            _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
        },

        detach : function() {},

        dispose : function(_gl) {

            this.cache.use(_gl.__GUID__);

            if (this.cache.get("renderbuffer"))
                _gl.deleteRenderbuffer(this.cache.get("renderbuffer"));
            if (this.cache.get("framebuffer"))
                _gl.deleteFramebuffer(this.cache.get("framebuffer"));

            this.cache.clearContext();

        }
    })

    return FrameBuffer;
})
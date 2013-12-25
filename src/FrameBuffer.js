define(function(require) {
    
    var Base = require("./core/Base");
    var Texture2D = require("./texture/Texture2D");
    var TextureCube = require("./texture/TextureCube");
    var WebGLInfo = require('./WebGLInfo');
    var glenum = require("./glenum");

    var FrameBuffer = Base.derive(function() {

        return {
            depthBuffer : true,

            //Save attached texture and target
            _attachedTextures : {},

            _width : 0,
            _height : 0,
            _depthTextureAttached : false,

            _renderBufferWidth : 0,
            _renderBufferHeight : 0
        }
    }, {

        bind : function(renderer) {

            var _gl = renderer.gl;

            _gl.bindFramebuffer(_gl.FRAMEBUFFER, this.getFrameBuffer(_gl));

            this.cache.put("viewport", renderer.viewportInfo);
            renderer.setViewport(0, 0, this._width, this._height);
            // Create a new render buffer
            if (this.cache.miss("renderbuffer") && this.depthBuffer && ! this._depthTextureAttached) {
                this.cache.put("renderbuffer", _gl.createRenderbuffer());
            }
            if (! this._depthTextureAttached && this.depthBuffer) {

                var width = this._width;
                var height = this._height;
                var renderbuffer = this.cache.get('renderbuffer');

                if (width !== this._renderBufferWidth
                     || height !== this._renderBufferHeight) {
                    _gl.bindRenderbuffer(_gl.RENDERBUFFER, renderbuffer);
                    _gl.renderbufferStorage(_gl.RENDERBUFFER, _gl.DEPTH_COMPONENT16, width, height);
                    this._renderBufferWidth = width;
                    this._renderBufferHeight = height;
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

            this.cache.use(_gl.__GLID__);
            var viewportInfo = this.cache.get("viewport");
            // Reset viewport;
            if (viewportInfo) {
                renderer.setViewport(viewportInfo.x, viewportInfo.y, viewportInfo.width, viewportInfo.height);
            }

            // Because the data of texture is changed over time,
            // Here update the mipmaps of texture each time after rendered;
            for (var attachment in this._attachedTextures) {
                var texture = this._attachedTextures[attachment];
                if (! texture.NPOT && texture.useMipmap) {
                    var target = texture instanceof TextureCube ? _gl.TEXTURE_CUBE_MAP : _gl.TEXTURE_2D;
                    _gl.bindTexture(target, texture.getWebGLTexture(_gl));
                    _gl.generateMipmap(target);
                    _gl.bindTexture(target, null);
                }
            }
        },

        getFrameBuffer : function(_gl) {

            this.cache.use(_gl.__GLID__);

            if (this.cache.miss("framebuffer")) {
                this.cache.put("framebuffer", _gl.createFramebuffer());
            }

            return this.cache.get("framebuffer");
        },

        attach : function(_gl, texture, attachment, target, mipmapLevel) {

            if (! texture.width) {
                throw new Error("The texture attached to color buffer is not a valid.");
                return;
            }

            _gl.bindFramebuffer(_gl.FRAMEBUFFER, this.getFrameBuffer(_gl));

            this._width = texture.width;
            this._height = texture.height;

            // If the depth_texture extension is enabled, developers
            // Can attach a depth texture to the depth buffer
            // http://blog.tojicode.com/2012/07/using-webgldepthtexture.html
            attachment = attachment || _gl.COLOR_ATTACHMENT0;
            target = target || _gl.TEXTURE_2D;
            mipmapLevel = mipmapLevel || 0
            
            if (attachment === _gl.DEPTH_ATTACHMENT) {

                var extension = WebGLInfo.getExtension(_gl, "WEBGL_depth_texture");

                if (!extension) {
                    console.error(" Depth texture is not supported by the browser ");
                    return;
                }
                if (texture.format !== glenum.DEPTH_COMPONENT) {
                    console.error("The texture attached to depth buffer is not a valid.");
                    return;
                }
                this.cache.put("renderbuffer_attached", false);
                this._depthTextureAttached = true;
            }

            this._attachedTextures[attachment] = texture;

            _gl.framebufferTexture2D(_gl.FRAMEBUFFER, attachment, target, texture.getWebGLTexture(_gl), mipmapLevel);

            _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
        },

        detach : function() {},

        dispose : function(_gl) {
            this.cache.use(_gl.__GLID__);

            if (this.cache.get("renderbuffer"))
                _gl.deleteRenderbuffer(this.cache.get("renderbuffer"));
            if (this.cache.get("framebuffer"))
                _gl.deleteFramebuffer(this.cache.get("framebuffer"));

            this.cache.deleteContext(_gl.__GLID__);
        }
    });

    FrameBuffer.COLOR_ATTACHMENT0 = glenum.COLOR_ATTACHMENT0;
    FrameBuffer.DEPTH_ATTACHMENT = glenum.DEPTH_ATTACHMENT;
    FrameBuffer.STENCIL_ATTACHMENT = glenum.STENCIL_ATTACHMENT;
    FrameBuffer.DEPTH_STENCIL_ATTACHMENT = glenum.DEPTH_STENCIL_ATTACHMENT;

    return FrameBuffer;
})
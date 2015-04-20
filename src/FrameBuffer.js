define(function(require) {
    
    'use strict';
    
    var Base = require('./core/Base');
    var TextureCube = require('./TextureCube');
    var glinfo = require('./core/glinfo');
    var glenum = require('./core/glenum');
    var Cache = require('./core/Cache');

    var KEY_FRAMEBUFFER = 'framebuffer';
    var KEY_RENDERBUFFER = 'renderbuffer';
    var KEY_RENDERBUFFER_WIDTH = KEY_RENDERBUFFER + '_width';
    var KEY_RENDERBUFFER_HEIGHT = KEY_RENDERBUFFER + '_height';
    var KEY_RENDERBUFFER_ATTACHED = KEY_RENDERBUFFER + '_attached';
    var KEY_DEPTHTEXTURE_ATTACHED = 'depthtexture_attached';

    var GL_FRAMEBUFFER = glenum.FRAMEBUFFER;
    var GL_RENDERBUFFER = glenum.RENDERBUFFER;
    var GL_DEPTH_ATTACHMENT = glenum.DEPTH_ATTACHMENT;
    var GL_COLOR_ATTACHMENT0 = glenum.COLOR_ATTACHMENT0;
    /**
     * @constructor qtek.FrameBuffer
     * @extends qtek.core.Base
     */
    var FrameBuffer = Base.derive(
    /** @lends qtek.FrameBuffer# */
    {
        /**
         * If use depth buffer
         * @type {boolean}
         */
        depthBuffer: true,

        //Save attached texture and target
        _attachedTextures: null,

        _width: 0,
        _height: 0,

        _binded: false,
    }, function() {
        // Use cache
        this._cache = new Cache();

        this._attachedTextures = {};
    },
    
    /**@lends qtek.FrameBuffer.prototype. */
    {

        /**
         * Resize framebuffer.
         * It is not recommanded use this methods to change the framebuffer size because the size will still be changed when attaching a new texture
         * @param  {number} width
         * @param  {number} height
         */
        resize: function(width, height) {
            this._width = width;
            this._height = height;
        },

        /**
         * Bind the framebuffer to given renderer before rendering
         * @param  {qtek.Renderer} renderer
         */
        bind: function(renderer) {

            var _gl = renderer.gl;

            if (!this._binded) {
                _gl.bindFramebuffer(GL_FRAMEBUFFER, this.getFrameBuffer(_gl));
                this._binded = true;
            }
            var cache = this._cache;

            cache.put('viewport', renderer.viewport);
            renderer.setViewport(0, 0, this._width, this._height, 1);
            if (! cache.get(KEY_DEPTHTEXTURE_ATTACHED) && this.depthBuffer) {
                // Create a new render buffer
                if (cache.miss(KEY_RENDERBUFFER)) {
                    cache.put(KEY_RENDERBUFFER, _gl.createRenderbuffer());
                }
                var width = this._width;
                var height = this._height;
                var renderbuffer = cache.get(KEY_RENDERBUFFER);

                if (width !== cache.get(KEY_RENDERBUFFER_WIDTH)
                     || height !== cache.get(KEY_RENDERBUFFER_HEIGHT)) {
                    _gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
                    _gl.renderbufferStorage(GL_RENDERBUFFER, _gl.DEPTH_COMPONENT16, width, height);
                    cache.put(KEY_RENDERBUFFER_WIDTH, width);
                    cache.put(KEY_RENDERBUFFER_HEIGHT, height);
                    _gl.bindRenderbuffer(GL_RENDERBUFFER, null);                 
                }
                if (! cache.get(KEY_RENDERBUFFER_ATTACHED)) {
                    _gl.framebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, renderbuffer);
                    cache.put(KEY_RENDERBUFFER_ATTACHED, true);
                }
            }
        },
        /**
         * Unbind the frame buffer after rendering
         * @param  {qtek.Renderer} renderer
         */
        unbind: function(renderer) {
            var _gl = renderer.gl;
            
            _gl.bindFramebuffer(GL_FRAMEBUFFER, null);
            this._binded = false;

            this._cache.use(_gl.__GLID__);
            var viewport = this._cache.get('viewport');
            // Reset viewport;
            if (viewport) {
                renderer.setViewport(
                    viewport.x, viewport.y, viewport.width, viewport.height
                );
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

        getFrameBuffer: function(_gl) {
            var cache = this._cache;
            cache.use(_gl.__GLID__);

            if (cache.miss(KEY_FRAMEBUFFER)) {
                cache.put(KEY_FRAMEBUFFER, _gl.createFramebuffer());
            }

            return cache.get(KEY_FRAMEBUFFER);
        },

        /**
         * Attach a texture(RTT) to the framebuffer
         * @param  {WebGLRenderingContext} _gl
         * @param  {qtek.Texture} texture
         * @param  {number} [attachment=gl.COLOR_ATTACHMENT0]
         * @param  {number} [target=gl.TEXTURE_2D]
         * @param  {number} [mipmapLevel=0]
         */
        attach: function(_gl, texture, attachment, target, mipmapLevel) {

            if (! texture.width) {
                throw new Error('The texture attached to color buffer is not a valid.');
            }

            if (!this._binded) {
                _gl.bindFramebuffer(GL_FRAMEBUFFER, this.getFrameBuffer(_gl));
                this._binded = true;
            }

            this._width = texture.width;
            this._height = texture.height;

            // If the depth_texture extension is enabled, developers
            // Can attach a depth texture to the depth buffer
            // http://blog.tojicode.com/2012/07/using-webgldepthtexture.html
            attachment = attachment || GL_COLOR_ATTACHMENT0;
            target = target || _gl.TEXTURE_2D;
            mipmapLevel = mipmapLevel || 0;
            
            if (attachment === GL_DEPTH_ATTACHMENT) {

                var extension = glinfo.getExtension(_gl, 'WEBGL_depth_texture');

                if (!extension) {
                    console.error('Depth texture is not supported by the browser');
                    return;
                }
                if (texture.format !== glenum.DEPTH_COMPONENT) {
                    console.error('The texture attached to depth buffer is not a valid.');
                    return;
                }
                this._cache.put(KEY_RENDERBUFFER_ATTACHED, false);
                this._cache.put(KEY_DEPTHTEXTURE_ATTACHED, true);
            }

            this._attachedTextures[attachment] = texture;

            _gl.framebufferTexture2D(GL_FRAMEBUFFER, attachment, target, texture.getWebGLTexture(_gl), mipmapLevel);
        },
        // TODO
        detach: function() {},
        /**
         * Dispose
         * @param  {WebGLRenderingContext} _gl
         */
        dispose: function(_gl) {
            var cache = this._cache;
            cache.use(_gl.__GLID__);

            var renderBuffer = cache.get(KEY_RENDERBUFFER);
            if (renderBuffer) {
                _gl.deleteRenderbuffer(renderBuffer);
            }
            var frameBuffer = cache.get(KEY_FRAMEBUFFER);
            if (frameBuffer) {
                _gl.deleteFramebuffer(frameBuffer);
            }

            // Clear cache for reusing
            this._attachedTextures = {};
            this._width = this._height = 0;

            cache.deleteContext(_gl.__GLID__);
        }
    });

    FrameBuffer.DEPTH_ATTACHMENT = GL_DEPTH_ATTACHMENT;
    FrameBuffer.COLOR_ATTACHMENT0 = GL_COLOR_ATTACHMENT0;
    FrameBuffer.STENCIL_ATTACHMENT = glenum.STENCIL_ATTACHMENT;
    FrameBuffer.DEPTH_STENCIL_ATTACHMENT = glenum.DEPTH_STENCIL_ATTACHMENT;

    return FrameBuffer;
});
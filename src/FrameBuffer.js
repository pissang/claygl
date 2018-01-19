import Base from './core/Base';
import Texture from './Texture';
import TextureCube from './TextureCube';
import glenum from './core/glenum';
import Cache from './core/Cache';

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
 * @constructor clay.FrameBuffer
 * @extends clay.core.Base
 */
var FrameBuffer = Base.extend(
/** @lends clay.FrameBuffer# */
{
    /**
     * If use depth buffer
     * @type {boolean}
     */
    depthBuffer: true,

    /**
     * @type {Object}
     */
    viewport: null,

    _width: 0,
    _height: 0,

    _textures: null,

    _boundRenderer: null,
}, function () {
    // Use cache
    this._cache = new Cache();

    this._textures = {};
},

/**@lends clay.FrameBuffer.prototype. */
{
    /**
     * Get attached texture width
     * {number}
     */
    // FIXME Can't use before #bind
    getTextureWidth: function () {
        return this._width;
    },

    /**
     * Get attached texture height
     * {number}
     */
    getTextureHeight: function () {
        return this._height;
    },

    /**
     * Bind the framebuffer to given renderer before rendering
     * @param  {clay.Renderer} renderer
     */
    bind: function (renderer) {

        if (renderer.__currentFrameBuffer) {
            // Already bound
            if (renderer.__currentFrameBuffer === this) {
                return;
            }

            console.warn('Renderer already bound with another framebuffer. Unbind it first');
        }
        renderer.__currentFrameBuffer = this;

        var _gl = renderer.gl;

        _gl.bindFramebuffer(GL_FRAMEBUFFER, this._getFrameBufferGL(renderer));
        this._boundRenderer = renderer;
        var cache = this._cache;

        cache.put('viewport', renderer.viewport);

        var hasTextureAttached = false;
        var width;
        var height;
        for (var attachment in this._textures) {
            hasTextureAttached = true;
            var obj = this._textures[attachment];
            if (obj) {
                // TODO Do width, height checking, make sure size are same
                width = obj.texture.width;
                height = obj.texture.height;
                // Attach textures
                this._doAttach(renderer, obj.texture, attachment, obj.target);
            }
        }

        this._width = width;
        this._height = height;

        if (!hasTextureAttached && this.depthBuffer) {
            console.error('Must attach texture before bind, or renderbuffer may have incorrect width and height.')
        }

        if (this.viewport) {
            renderer.setViewport(this.viewport);
        }
        else {
            renderer.setViewport(0, 0, width, height, 1);
        }

        var attachedTextures = cache.get('attached_textures');
        if (attachedTextures) {
            for (var attachment in attachedTextures) {
                if (!this._textures[attachment]) {
                    var target = attachedTextures[attachment];
                    this._doDetach(_gl, attachment, target);
                }
            }
        }
        if (!cache.get(KEY_DEPTHTEXTURE_ATTACHED) && this.depthBuffer) {
            // Create a new render buffer
            if (cache.miss(KEY_RENDERBUFFER)) {
                cache.put(KEY_RENDERBUFFER, _gl.createRenderbuffer());
            }
            var renderbuffer = cache.get(KEY_RENDERBUFFER);

            if (width !== cache.get(KEY_RENDERBUFFER_WIDTH)
                    || height !== cache.get(KEY_RENDERBUFFER_HEIGHT)) {
                _gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
                _gl.renderbufferStorage(GL_RENDERBUFFER, _gl.DEPTH_COMPONENT16, width, height);
                cache.put(KEY_RENDERBUFFER_WIDTH, width);
                cache.put(KEY_RENDERBUFFER_HEIGHT, height);
                _gl.bindRenderbuffer(GL_RENDERBUFFER, null);
            }
            if (!cache.get(KEY_RENDERBUFFER_ATTACHED)) {
                _gl.framebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, renderbuffer);
                cache.put(KEY_RENDERBUFFER_ATTACHED, true);
            }
        }
    },

    /**
     * Unbind the frame buffer after rendering
     * @param  {clay.Renderer} renderer
     */
    unbind: function (renderer) {
        // Remove status record on renderer
        renderer.__currentFrameBuffer = null;

        var _gl = renderer.gl;

        _gl.bindFramebuffer(GL_FRAMEBUFFER, null);
        this._boundRenderer = null;

        this._cache.use(renderer.__uid__);
        var viewport = this._cache.get('viewport');
        // Reset viewport;
        if (viewport) {
            renderer.setViewport(viewport);
        }

        this.updateMipmap(renderer);
    },

    // Because the data of texture is changed over time,
    // Here update the mipmaps of texture each time after rendered;
    updateMipmap: function (renderer) {
        var _gl = renderer.gl;
        for (var attachment in this._textures) {
            var obj = this._textures[attachment];
            if (obj) {
                var texture = obj.texture;
                // FIXME some texture format can't generate mipmap
                if (!texture.NPOT && texture.useMipmap
                    && texture.minFilter === Texture.LINEAR_MIPMAP_LINEAR) {
                    var target = texture.textureType === 'textureCube' ? glenum.TEXTURE_CUBE_MAP : glenum.TEXTURE_2D;
                    _gl.bindTexture(target, texture.getWebGLTexture(renderer));
                    _gl.generateMipmap(target);
                    _gl.bindTexture(target, null);
                }
            }
        }
    },


    // 0x8CD5, 36053, FRAMEBUFFER_COMPLETE
    // 0x8CD6, 36054, FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    // 0x8CD7, 36055, FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
    // 0x8CD9, 36057, FRAMEBUFFER_INCOMPLETE_DIMENSIONS
    // 0x8CDD, 36061, FRAMEBUFFER_UNSUPPORTED
    checkStatus: function (_gl) {
        return _gl.checkFramebufferStatus(GL_FRAMEBUFFER);
    },

    _getFrameBufferGL: function (renderer) {
        var cache = this._cache;
        cache.use(renderer.__uid__);

        if (cache.miss(KEY_FRAMEBUFFER)) {
            cache.put(KEY_FRAMEBUFFER, renderer.gl.createFramebuffer());
        }

        return cache.get(KEY_FRAMEBUFFER);
    },

    /**
     * Attach a texture(RTT) to the framebuffer
     * @param  {clay.Texture} texture
     * @param  {number} [attachment=gl.COLOR_ATTACHMENT0]
     * @param  {number} [target=gl.TEXTURE_2D]
     */
    attach: function (texture, attachment, target) {

        if (!texture.width) {
            throw new Error('The texture attached to color buffer is not a valid.');
        }
        // TODO width and height check

        // If the depth_texture extension is enabled, developers
        // Can attach a depth texture to the depth buffer
        // http://blog.tojicode.com/2012/07/using-webgldepthtexture.html
        attachment = attachment || GL_COLOR_ATTACHMENT0;
        target = target || glenum.TEXTURE_2D;

        var boundRenderer = this._boundRenderer;
        var _gl = boundRenderer && boundRenderer.gl;
        var attachedTextures;

        if (_gl) {
            var cache = this._cache;
            cache.use(boundRenderer.__uid__);
            attachedTextures = cache.get('attached_textures');
        }

        // Check if texture attached
        var previous = this._textures[attachment];
        if (previous && previous.target === target
            && previous.texture === texture
            && (attachedTextures && attachedTextures[attachment] != null)
        ) {
            return;
        }

        var canAttach = true;
        if (boundRenderer) {
            canAttach = this._doAttach(boundRenderer, texture, attachment, target);
            // Set viewport again incase attached to different size textures.
            if (!this.viewport) {
                boundRenderer.setViewport(0, 0, texture.width, texture.height, 1);
            }
        }

        if (canAttach) {
            this._textures[attachment] = this._textures[attachment] || {};
            this._textures[attachment].texture = texture;
            this._textures[attachment].target = target;
        }
    },

    _doAttach: function (renderer, texture, attachment, target) {
        var _gl = renderer.gl;
        // Make sure texture is always updated
        // Because texture width or height may be changed and in this we can't be notified
        // FIXME awkward;
        var webglTexture = texture.getWebGLTexture(renderer);
        // Assume cache has been used.
        var attachedTextures = this._cache.get('attached_textures');
        if (attachedTextures && attachedTextures[attachment]) {
            var obj = attachedTextures[attachment];
            // Check if texture and target not changed
            if (obj.texture === texture && obj.target === target) {
                return;
            }
        }
        attachment = +attachment;

        var canAttach = true;
        if (attachment === GL_DEPTH_ATTACHMENT || attachment === glenum.DEPTH_STENCIL_ATTACHMENT) {
            var extension = renderer.getGLExtension('WEBGL_depth_texture');

            if (!extension) {
                console.error('Depth texture is not supported by the browser');
                canAttach = false;
            }
            if (texture.format !== glenum.DEPTH_COMPONENT
                && texture.format !== glenum.DEPTH_STENCIL
            ) {
                console.error('The texture attached to depth buffer is not a valid.');
                canAttach = false;
            }

            // Dispose render buffer created previous
            if (canAttach) {
                var renderbuffer = this._cache.get(KEY_RENDERBUFFER);
                if (renderbuffer) {
                    _gl.framebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, null);
                    _gl.deleteRenderbuffer(renderbuffer);
                    this._cache.put(KEY_RENDERBUFFER, false);
                }

                this._cache.put(KEY_RENDERBUFFER_ATTACHED, false);
                this._cache.put(KEY_DEPTHTEXTURE_ATTACHED, true);
            }
        }

        // Mipmap level can only be 0
        _gl.framebufferTexture2D(GL_FRAMEBUFFER, attachment, target, webglTexture, 0);

        if (!attachedTextures) {
            attachedTextures = {};
            this._cache.put('attached_textures', attachedTextures);
        }
        attachedTextures[attachment] = attachedTextures[attachment] || {};
        attachedTextures[attachment].texture = texture;
        attachedTextures[attachment].target = target;

        return canAttach;
    },

    _doDetach: function (_gl, attachment, target) {
        // Detach a texture from framebuffer
        // https://github.com/KhronosGroup/WebGL/blob/master/conformance-suites/1.0.0/conformance/framebuffer-test.html#L145
        _gl.framebufferTexture2D(GL_FRAMEBUFFER, attachment, target, null, 0);

        // Assume cache has been used.
        var attachedTextures = this._cache.get('attached_textures');
        if (attachedTextures && attachedTextures[attachment]) {
            attachedTextures[attachment] = null;
        }

        if (attachment === GL_DEPTH_ATTACHMENT || attachment === glenum.DEPTH_STENCIL_ATTACHMENT) {
            this._cache.put(KEY_DEPTHTEXTURE_ATTACHED, false);
        }
    },

    /**
     * Detach a texture
     * @param  {number} [attachment=gl.COLOR_ATTACHMENT0]
     * @param  {number} [target=gl.TEXTURE_2D]
     */
    detach: function (attachment, target) {
        // TODO depth extension check ?
        this._textures[attachment] = null;
        if (this._boundRenderer) {
            var cache = this._cache;
            cache.use(this._boundRenderer.__uid__);
            this._doDetach(this._boundRenderer.gl, attachment, target);
        }
    },
    /**
     * Dispose
     * @param  {WebGLRenderingContext} _gl
     */
    dispose: function (renderer) {

        var _gl = renderer.gl;
        var cache = this._cache;

        cache.use(renderer.__uid__);

        var renderBuffer = cache.get(KEY_RENDERBUFFER);
        if (renderBuffer) {
            _gl.deleteRenderbuffer(renderBuffer);
        }
        var frameBuffer = cache.get(KEY_FRAMEBUFFER);
        if (frameBuffer) {
            _gl.deleteFramebuffer(frameBuffer);
        }
        cache.deleteContext(renderer.__uid__);

        // Clear cache for reusing
        this._textures = {};

    }
});

FrameBuffer.DEPTH_ATTACHMENT = GL_DEPTH_ATTACHMENT;
FrameBuffer.COLOR_ATTACHMENT0 = GL_COLOR_ATTACHMENT0;
FrameBuffer.STENCIL_ATTACHMENT = glenum.STENCIL_ATTACHMENT;
FrameBuffer.DEPTH_STENCIL_ATTACHMENT = glenum.DEPTH_STENCIL_ATTACHMENT;

export default FrameBuffer;

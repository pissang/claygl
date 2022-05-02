import Texture from './Texture';
import * as glenum from './core/glenum';
import ClayCache from './core/Cache';
import type Renderer from './Renderer';
import { GLEnum } from './core/type';

const KEY_FRAMEBUFFER = 'framebuffer';
const KEY_RENDERBUFFER = 'renderbuffer';
const KEY_RENDERBUFFER_WIDTH = KEY_RENDERBUFFER + '_width';
const KEY_RENDERBUFFER_HEIGHT = KEY_RENDERBUFFER + '_height';
const KEY_RENDERBUFFER_ATTACHED = KEY_RENDERBUFFER + '_attached';
const KEY_DEPTHTEXTURE_ATTACHED = 'depthtexture_attached';

const GL_FRAMEBUFFER = glenum.FRAMEBUFFER;
const GL_RENDERBUFFER = glenum.RENDERBUFFER;
const GL_DEPTH_ATTACHMENT = glenum.DEPTH_ATTACHMENT;
const GL_COLOR_ATTACHMENT0 = glenum.COLOR_ATTACHMENT0;

interface FrameBufferOpts {
  /**
   * If use depth buffer
   */
  depthBuffer: boolean;
}
interface FrameBuffer extends FrameBufferOpts {}
class FrameBuffer {
  viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
    devicePixelRatio: number;
  };

  private _width: number = 0;
  private _height: number = 0;

  private _textures: Record<
    GLEnum, // Attachment
    | {
        texture: Texture;
        target: GLEnum;
      }
    | undefined
  > = {};
  private _boundRenderer?: Renderer;

  private _cache = new ClayCache();

  constructor(opts?: Partial<FrameBufferOpts>) {
    this.depthBuffer = true;
  }
  /**
   * Get attached texture width
   * {number}
   */
  // FIXME Can't use before #bind
  getTextureWidth() {
    return this._width;
  }

  /**
   * Get attached texture height
   * {number}
   */
  getTextureHeight() {
    return this._height;
  }

  /**
   * Bind the framebuffer to given renderer before rendering
   * @param  {clay.Renderer} renderer
   */
  bind(renderer: Renderer) {
    const currentFrameBuffer = renderer.__currentFrameBuffer;
    if (currentFrameBuffer) {
      // Already bound
      if (currentFrameBuffer === this) {
        return;
      }

      console.warn('Renderer already bound with another framebuffer. Unbind it first');
    }
    renderer.__currentFrameBuffer = this;

    const _gl = renderer.gl;

    _gl.bindFramebuffer(GL_FRAMEBUFFER, this._getFrameBufferGL(renderer));
    this._boundRenderer = renderer;
    const cache = this._cache;

    cache.put('viewport', renderer.viewport);

    let hasTextureAttached = false;
    let width: number | undefined;
    let height: number | undefined;
    const textures = this._textures;
    for (const attachment in textures) {
      const obj = textures[attachment];
      if (obj) {
        hasTextureAttached = true;
        // TODO Do width, height checking, make sure size are same
        width = obj.texture.width;
        height = obj.texture.height;
        // Attach textures
        this._doAttach(renderer, obj.texture, +attachment, obj.target);
      }
    }

    if (!hasTextureAttached && this.depthBuffer) {
      console.error(
        'Must attach texture before bind, or renderbuffer may have incorrect width and height.'
      );
    }

    if (!width || !height) {
      console.error('Invalid width and height');
      return;
    }

    this._width = width;
    this._height = height;

    if (this.viewport) {
      renderer.setViewport(this.viewport);
    } else {
      renderer.setViewport(0, 0, width, height, 1);
    }

    const attachedTextures = cache.get('attached_textures');
    if (attachedTextures) {
      for (const attachment in attachedTextures) {
        if (!textures[attachment as unknown as GLEnum]) {
          const target = attachedTextures[attachment];
          this._doDetach(_gl, attachment as unknown as GLEnum, target);
        }
      }
    }
    if (!cache.get(KEY_DEPTHTEXTURE_ATTACHED) && this.depthBuffer) {
      // Create a new render buffer
      if (cache.miss(KEY_RENDERBUFFER)) {
        cache.put(KEY_RENDERBUFFER, _gl.createRenderbuffer());
      }
      const renderbuffer = cache.get(KEY_RENDERBUFFER);

      if (
        width !== cache.get(KEY_RENDERBUFFER_WIDTH) ||
        height !== cache.get(KEY_RENDERBUFFER_HEIGHT)
      ) {
        _gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
        _gl.renderbufferStorage(GL_RENDERBUFFER, _gl.DEPTH_COMPONENT16, width, height);
        cache.put(KEY_RENDERBUFFER_WIDTH, width);
        cache.put(KEY_RENDERBUFFER_HEIGHT, height);
        _gl.bindRenderbuffer(GL_RENDERBUFFER, null);
      }
      if (!cache.get(KEY_RENDERBUFFER_ATTACHED)) {
        _gl.framebufferRenderbuffer(
          GL_FRAMEBUFFER,
          GL_DEPTH_ATTACHMENT,
          GL_RENDERBUFFER,
          renderbuffer
        );
        cache.put(KEY_RENDERBUFFER_ATTACHED, true);
      }
    }
  }

  /**
   * Unbind the frame buffer after rendering
   * @param  {clay.Renderer} renderer
   */
  unbind(renderer: Renderer) {
    // Remove status record on renderer
    renderer.__currentFrameBuffer = undefined;

    const _gl = renderer.gl;

    _gl.bindFramebuffer(GL_FRAMEBUFFER, null);
    this._boundRenderer = undefined;

    this._cache.use(renderer.__uid__);
    const viewport = this._cache.get('viewport');
    // Reset viewport;
    if (viewport) {
      renderer.setViewport(viewport);
    }

    this.updateMipmap(renderer);
  }

  // Because the data of texture is changed over time,
  // Here update the mipmaps of texture each time after rendered;
  updateMipmap(renderer: Renderer) {
    const _gl = renderer.gl;
    for (const attachment in this._textures) {
      const obj = this._textures[attachment];
      if (obj) {
        const texture = obj.texture;
        // FIXME some texture format can't generate mipmap
        if (
          !texture.NPOT &&
          texture.useMipmap &&
          texture.minFilter === Texture.LINEAR_MIPMAP_LINEAR
        ) {
          const target =
            texture.textureType === 'textureCube' ? glenum.TEXTURE_CUBE_MAP : glenum.TEXTURE_2D;
          _gl.bindTexture(target, texture.getWebGLTexture(renderer));
          _gl.generateMipmap(target);
          _gl.bindTexture(target, null);
        }
      }
    }
  }

  // 0x8CD5, 36053, FRAMEBUFFER_COMPLETE
  // 0x8CD6, 36054, FRAMEBUFFER_INCOMPLETE_ATTACHMENT
  // 0x8CD7, 36055, FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
  // 0x8CD9, 36057, FRAMEBUFFER_INCOMPLETE_DIMENSIONS
  // 0x8CDD, 36061, FRAMEBUFFER_UNSUPPORTED
  checkStatus(_gl: WebGLRenderingContext) {
    return _gl.checkFramebufferStatus(GL_FRAMEBUFFER);
  }

  _getFrameBufferGL(renderer: Renderer) {
    const cache = this._cache;
    cache.use(renderer.__uid__);

    if (cache.miss(KEY_FRAMEBUFFER)) {
      cache.put(KEY_FRAMEBUFFER, renderer.gl.createFramebuffer());
    }

    return cache.get(KEY_FRAMEBUFFER);
  }

  /**
   * Attach a texture(RTT) to the framebuffer
   * @param  {clay.Texture} texture
   * @param  {number} [attachment=gl.COLOR_ATTACHMENT0]
   * @param  {number} [target=gl.TEXTURE_2D]
   */
  attach(texture: Texture, attachment?: GLEnum, target?: GLEnum) {
    if (!texture.width) {
      throw new Error('The texture attached to color buffer is not a valid.');
    }
    // TODO width and height check

    // If the depth_texture extension is enabled, developers
    // Can attach a depth texture to the depth buffer
    // http://blog.tojicode.com/2012/07/using-webgldepthtexture.html
    attachment = attachment || GL_COLOR_ATTACHMENT0;
    target = target || glenum.TEXTURE_2D;

    const boundRenderer = this._boundRenderer;
    const _gl = boundRenderer && boundRenderer.gl;
    const textures = this._textures;
    let attachedTextures;

    if (_gl) {
      const cache = this._cache;
      cache.use(boundRenderer.__uid__);
      attachedTextures = cache.get('attached_textures');
    }

    // Check if texture attached
    const previous = textures[attachment];
    if (
      previous &&
      previous.target === target &&
      previous.texture === texture &&
      attachedTextures &&
      attachedTextures[attachment] != null
    ) {
      return;
    }

    let canAttach = true;
    if (boundRenderer) {
      canAttach = this._doAttach(boundRenderer, texture, attachment, target);
      // Set viewport again incase attached to different size textures.
      if (!this.viewport) {
        boundRenderer.setViewport(0, 0, texture.width, texture.height, 1);
      }
    }

    if (canAttach) {
      textures[attachment] = textures[attachment] || ({} as any);
      textures[attachment]!.texture = texture;
      textures[attachment]!.target = target;
    }
  }

  _doAttach(renderer: Renderer, texture: Texture, attachment: GLEnum, target: GLEnum): boolean {
    const _gl = renderer.gl;
    const cache = this._cache;
    // Make sure texture is always updated
    // Because texture width or height may be changed and in this we can't be notified
    // FIXME awkward;
    const webglTexture = texture.getWebGLTexture(renderer);
    // Assume cache has been used.
    let attachedTextures = cache.get('attached_textures');
    if (attachedTextures && attachedTextures[attachment]) {
      const obj = attachedTextures[attachment];
      // Check if texture and target not changed
      if (obj.texture === texture && obj.target === target) {
        return false;
      }
    }
    attachment = +attachment;

    let canAttach = true;
    if (attachment === GL_DEPTH_ATTACHMENT || attachment === glenum.DEPTH_STENCIL_ATTACHMENT) {
      const extension = renderer.getGLExtension('WEBGL_depth_texture');

      if (!extension) {
        console.error('Depth texture is not supported by the browser');
        // Still trying to use the depth texture extension.
        // canAttach = false;
      }
      if (texture.format !== glenum.DEPTH_COMPONENT && texture.format !== glenum.DEPTH_STENCIL) {
        console.error('The texture attached to depth buffer is not a valid.');
        canAttach = false;
      }

      // Dispose render buffer created previous
      if (canAttach) {
        const renderbuffer = cache.get(KEY_RENDERBUFFER);
        if (renderbuffer) {
          _gl.framebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, null);
          _gl.deleteRenderbuffer(renderbuffer);
          cache.put(KEY_RENDERBUFFER, false);
        }

        cache.put(KEY_RENDERBUFFER_ATTACHED, false);
        cache.put(KEY_DEPTHTEXTURE_ATTACHED, true);
      }
    }

    // Mipmap level can only be 0
    _gl.framebufferTexture2D(GL_FRAMEBUFFER, attachment, target, webglTexture, 0);

    if (!attachedTextures) {
      attachedTextures = {};
      cache.put('attached_textures', attachedTextures);
    }
    attachedTextures[attachment] = attachedTextures[attachment] || {};
    attachedTextures[attachment].texture = texture;
    attachedTextures[attachment].target = target;

    return canAttach;
  }

  _doDetach(_gl: WebGLRenderingContext, attachment: GLEnum, target: GLEnum) {
    // Detach a texture from framebuffer
    // https://github.com/KhronosGroup/WebGL/blob/master/conformance-suites/1.0.0/conformance/framebuffer-test.html#L145
    _gl.framebufferTexture2D(GL_FRAMEBUFFER, attachment, target, null, 0);

    const cache = this._cache;
    // Assume cache has been used.
    const attachedTextures = cache.get('attached_textures');
    if (attachedTextures && attachedTextures[attachment]) {
      attachedTextures[attachment] = null;
    }

    if (attachment === GL_DEPTH_ATTACHMENT || attachment === glenum.DEPTH_STENCIL_ATTACHMENT) {
      cache.put(KEY_DEPTHTEXTURE_ATTACHED, false);
    }
  }

  /**
   * Detach a texture
   * @param  {number} [attachment=gl.COLOR_ATTACHMENT0]
   * @param  {number} [target=gl.TEXTURE_2D]
   */
  detach(attachment: GLEnum, target: GLEnum) {
    // TODO depth extension check ?
    this._textures[attachment] = undefined;
    const boundRenderer = this._boundRenderer;
    if (boundRenderer) {
      const cache = this._cache;
      cache.use(boundRenderer.__uid__);
      this._doDetach(boundRenderer.gl, attachment, target);
    }
  }
  /**
   * Dispose
   * @param  {WebGLRenderingContext} _gl
   */
  dispose(renderer: Renderer) {
    const _gl = renderer.gl;
    const cache = this._cache;

    cache.use(renderer.__uid__);

    const renderBuffer = cache.get(KEY_RENDERBUFFER);
    if (renderBuffer) {
      _gl.deleteRenderbuffer(renderBuffer);
    }
    const frameBuffer = cache.get(KEY_FRAMEBUFFER);
    if (frameBuffer) {
      _gl.deleteFramebuffer(frameBuffer);
    }
    cache.deleteContext(renderer.__uid__);

    // Clear cache for reusing
    this._textures = {};
  }

  static DEPTH_ATTACHMENT = GL_DEPTH_ATTACHMENT;
  static COLOR_ATTACHMENT0 = GL_COLOR_ATTACHMENT0;
  static STENCIL_ATTACHMENT = glenum.STENCIL_ATTACHMENT;
  static DEPTH_STENCIL_ATTACHMENT = glenum.DEPTH_STENCIL_ATTACHMENT;
}

export default FrameBuffer;

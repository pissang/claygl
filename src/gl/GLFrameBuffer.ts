import {
  DEPTH_ATTACHMENT,
  DEPTH_STENCIL_ATTACHMENT,
  FRAMEBUFFER,
  LINEAR_MIPMAP_LINEAR,
  RENDERBUFFER
} from '../core/constants';
import { keys } from '../core/util';
import type FrameBuffer from '../FrameBuffer';
import Texture from '../Texture';
import GLTexture from './GLTexture';
class GLFrameBuffer {
  private _fb: FrameBuffer;
  private _webglFb?: WebGLFramebuffer;
  private _webglRb?: WebGLRenderbuffer;
  private _webglRbW?: number;
  private _webglRbH?: number;

  // Bound context
  private _bound?: WebGLRenderingContext | null;

  // Attached textures
  private _textures: Record<string, GLTexture> = {};

  constructor(frambuffer: FrameBuffer) {
    this._fb = frambuffer;
  }

  bind(gl: WebGLRenderingContext, helpers: { getGLTexture: (texture: Texture) => GLTexture }) {
    const framebuffer = this._fb;
    const webglFb = this._webglFb || (this._webglFb = gl.createFramebuffer()!);
    let webglRenderBuffer = this._webglRb;
    gl.bindFramebuffer(FRAMEBUFFER, webglFb);

    // Attach textures
    const texturesToAttach = framebuffer.getTextures();
    const attachedTextures = this._textures;

    // Detach unsed textures
    keys(attachedTextures).forEach((attachment) => {
      if (!texturesToAttach[attachment]) {
        // Detach a texture from framebuffer
        gl.framebufferTexture2D(
          FRAMEBUFFER,
          +attachment,
          attachedTextures[attachment].getBindTarget(),
          null,
          0
        );
        delete attachedTextures[attachment];
      }
    });

    let depthAttached = false;
    let renderBufferDetached = false;

    let width: number | undefined;
    let height: number | undefined;

    keys(texturesToAttach).forEach((attachment) => {
      const { texture, target } = texturesToAttach[attachment]!;
      const glTexture = helpers.getGLTexture(texture);
      width = texture.width;
      height = texture.height;
      // TODO validate width, height are same.

      if (attachedTextures[attachment] === glTexture) {
        return;
      }

      if (+attachment === DEPTH_ATTACHMENT || +attachment === DEPTH_STENCIL_ATTACHMENT) {
        depthAttached = true;
        if (webglRenderBuffer) {
          // Detach from renderbuffer before attach to depth texture
          gl.framebufferRenderbuffer(FRAMEBUFFER, DEPTH_ATTACHMENT, RENDERBUFFER, null);
          renderBufferDetached = true;
        }
      }

      gl.framebufferTexture2D(FRAMEBUFFER, +attachment, target, glTexture.getWebGLTexture(gl), 0);

      attachedTextures[attachment] = glTexture;
    });

    if (width && height && !depthAttached && framebuffer.depthBuffer) {
      // Create a render buffer if depth buffer is needed and not bound to a texture
      if (!webglRenderBuffer) {
        webglRenderBuffer = this._webglRb = gl.createRenderbuffer()!;
      }
      if (width !== this._webglRbW || height !== this._webglRbH) {
        gl.bindRenderbuffer(RENDERBUFFER, webglRenderBuffer);
        gl.renderbufferStorage(RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        this._webglRbW = width;
        this._webglRbH = height;
        gl.bindRenderbuffer(RENDERBUFFER, null);
      }

      gl.framebufferRenderbuffer(FRAMEBUFFER, DEPTH_ATTACHMENT, RENDERBUFFER, webglRenderBuffer);
    } else if (webglRenderBuffer) {
      gl.framebufferRenderbuffer(FRAMEBUFFER, DEPTH_ATTACHMENT, RENDERBUFFER, null);
      renderBufferDetached = true;
    }

    // Delete the render buffer.
    if (renderBufferDetached) {
      gl.deleteRenderbuffer(webglRenderBuffer!);
      this._webglRb = undefined;
    }

    this._bound = gl;
  }

  unbind(gl: WebGLRenderingContext) {
    this._bound = null;
    gl.bindFramebuffer(FRAMEBUFFER, null);
    // Because the data of texture is changed over time,
    // Here update the mipmaps of texture each time after rendered;
    this.updateMipmap(gl);
  }

  updateMipmap(gl: WebGLRenderingContext) {
    const textures = this._textures;
    keys(textures).forEach((attachment) =>
      // FIXME some texture format can't generate mipmap
      // TODO check LINEAR_MIPMAP_LINEAR?
      textures[attachment]!.generateMipmap(gl)
    );
  }

  dispose(gl: WebGLRenderingContext) {
    const webglFb = this._webglFb;
    const webglRb = this._webglRb;
    webglFb && gl.deleteFramebuffer(webglFb);
    webglRb && gl.deleteFramebuffer(WebGLFramebuffer);

    // PENDING dispose webgl textures?
    this._textures = {};
  }

  // 0x8CD5, 36053, FRAMEBUFFER_COMPLETE
  // 0x8CD6, 36054, FRAMEBUFFER_INCOMPLETE_ATTACHMENT
  // 0x8CD7, 36055, FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
  // 0x8CD9, 36057, FRAMEBUFFER_INCOMPLETE_DIMENSIONS
  // 0x8CDD, 36061, FRAMEBUFFER_UNSUPPORTED
  checkStatus(_gl: WebGLRenderingContext) {
    return _gl.checkFramebufferStatus(RENDERBUFFER);
  }
}

export default GLFrameBuffer;

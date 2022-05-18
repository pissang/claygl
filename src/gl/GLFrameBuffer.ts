import {
  DEPTH_ATTACHMENT,
  DEPTH_STENCIL_ATTACHMENT,
  FRAMEBUFFER,
  FRAMEBUFFER_COMPLETE,
  RENDERBUFFER
} from '../core/constants';
import { GLEnum } from '../core/type';
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

  // Attached textures, [texture, target, width, height]
  private _textures: Record<string, [GLTexture, GLEnum, number, number]> = {};

  constructor(frambuffer: FrameBuffer) {
    this._fb = frambuffer;
  }

  bind(gl: WebGLRenderingContext, helpers: { getGLTexture: (texture: Texture) => GLTexture }) {
    const frameBuffer = this._fb;
    const webglFb = this._webglFb || (this._webglFb = gl.createFramebuffer()!);
    let webglRenderBuffer = this._webglRb;
    // PENDING. not bind multiple times? if render twice?
    if (this._bound !== gl) {
      gl.bindFramebuffer(FRAMEBUFFER, webglFb);
    }

    // Attach textures
    const texturesToAttach = frameBuffer.getTextures();
    const attachedTextures = this._textures;

    // Detach unused textures
    keys(attachedTextures).forEach((attachment) => {
      if (!texturesToAttach[attachment]) {
        // Detach a texture from framebuffer
        gl.framebufferTexture2D(FRAMEBUFFER, +attachment, attachedTextures[attachment][1], null, 0);
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
      if (+attachment === DEPTH_ATTACHMENT || +attachment === DEPTH_STENCIL_ATTACHMENT) {
        depthAttached = true;
        if (webglRenderBuffer) {
          // Detach from renderbuffer before attach to depth texture
          gl.framebufferRenderbuffer(FRAMEBUFFER, DEPTH_ATTACHMENT, RENDERBUFFER, null);
          renderBufferDetached = true;
        }
      }

      const attached = attachedTextures[attachment];
      if (
        attached &&
        attached[0] === glTexture &&
        attached[1] === target &&
        attached[2] === width &&
        attached[3] === height
      ) {
        return;
      }

      gl.framebufferTexture2D(FRAMEBUFFER, +attachment, target, glTexture.getWebGLTexture(gl), 0);

      attachedTextures[attachment] = [glTexture, target, width, height];
    });

    if (width && height && !depthAttached && frameBuffer.depthBuffer) {
      const renderBufferFirstCreated = !webglRenderBuffer;
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
      if (renderBufferFirstCreated) {
        gl.framebufferRenderbuffer(FRAMEBUFFER, DEPTH_ATTACHMENT, RENDERBUFFER, webglRenderBuffer);
      }
    } else if (webglRenderBuffer) {
      gl.framebufferRenderbuffer(FRAMEBUFFER, DEPTH_ATTACHMENT, RENDERBUFFER, null);
      renderBufferDetached = true;
    }

    // delete render buffer.
    if (renderBufferDetached) {
      gl.deleteRenderbuffer(webglRenderBuffer!);
      this._webglRb = undefined;
    }

    // 0x8CD5, 36053, FRAMEBUFFER_COMPLETE
    // 0x8CD6, 36054, FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    // 0x8CD7, 36055, FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
    // 0x8CD9, 36057, FRAMEBUFFER_INCOMPLETE_DIMENSIONS
    // 0x8CDD, 36061, FRAMEBUFFER_UNSUPPORTED
    // if (gl.checkFramebufferStatus(FRAMEBUFFER) !== FRAMEBUFFER_COMPLETE) {
    //   debugger;
    // }

    this._bound = gl;
  }

  unbind(gl: WebGLRenderingContext, willBooleanNewFrameBuffer: boolean) {
    if (this._bound) {
      this._bound = null;
      if (!willBooleanNewFrameBuffer) {
        // Just skip a binding operation if it will bind another framebuffer.
        // Not sure how much performance will it gain.
        gl.bindFramebuffer(FRAMEBUFFER, null);
      }
      // Because the data of texture is changed over time,
      // Here update the mipmaps of texture each time after rendered;
      this.updateMipmap(gl);
    }
  }

  updateMipmap(gl: WebGLRenderingContext) {
    const textures = this._textures;
    keys(textures).forEach((attachment) =>
      // FIXME some texture format can't generate mipmap
      // TODO check LINEAR_MIPMAP_LINEAR?
      textures[attachment]![0].generateMipmap(gl)
    );
  }

  dispose(gl: WebGLRenderingContext) {
    const webglFb = this._webglFb;
    const webglRb = this._webglRb;
    webglFb && gl.deleteFramebuffer(webglFb);
    webglRb && gl.deleteRenderbuffer(webglRb);

    // PENDING dispose webgl textures?
    this._webglFb = this._webglRb = undefined;
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

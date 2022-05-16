import Texture from './Texture';
import * as constants from './core/constants';
import Renderer, { RendererViewport } from './Renderer';
import { GLEnum } from './core/type';

const GL_DEPTH_ATTACHMENT = constants.DEPTH_ATTACHMENT;

interface FrameBufferOpts {
  /**
   * If use depth buffer
   */
  depthBuffer: boolean;
}
interface FrameBuffer extends FrameBufferOpts {}
class FrameBuffer {
  viewport?: RendererViewport;

  private _width: number = 0;
  private _height: number = 0;

  private _textures: Record<
    string,
    | {
        texture: Texture;
        target: GLEnum;
      }
    | undefined
  > = {};
  private _boundRenderer?: Renderer;

  private _savedViewport?: RendererViewport;

  constructor(opts?: Partial<FrameBufferOpts>) {
    this.depthBuffer = true;
  }

  getTextures() {
    return this._textures;
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
    renderer.setFrameBuffer(this);

    this._boundRenderer = renderer;

    let width: number | undefined;
    let height: number | undefined;
    const textures = this._textures;
    for (const attachment in textures) {
      const obj = textures[attachment];
      if (obj) {
        // TODO Do width, height checking, make sure size are same
        width = obj.texture.width;
        height = obj.texture.height;
      }
    }

    if (!width || !height) {
      console.error('Invalid width and height');
      return;
    }

    this._width = width;
    this._height = height;

    this._savedViewport = renderer.viewport;

    if (this.viewport) {
      renderer.setViewport(this.viewport);
    } else {
      renderer.setViewport(0, 0, width, height, 1);
    }
  }

  /**
   * Unbind the frame buffer after rendering
   * @param  {clay.Renderer} renderer
   */
  unbind(renderer: Renderer) {
    // Remove status record on renderer
    renderer.__currentFrameBuffer = undefined;

    this._boundRenderer = undefined;

    const viewport = this._savedViewport;
    // Reset viewport;
    if (viewport) {
      renderer.setViewport(viewport);
    }
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

    if (attachment === GL_DEPTH_ATTACHMENT || attachment === constants.DEPTH_STENCIL_ATTACHMENT) {
      // const extension = renderer.getGLExtension('WEBGL_depth_texture');
      // if (!extension) {
      //   console.error('Depth texture is not supported by the browser');
      //   // Still trying to use the depth texture extension.
      //   // canAttach = false;
      // }
      if (
        texture.format !== constants.DEPTH_COMPONENT &&
        texture.format !== constants.DEPTH_STENCIL
      ) {
        console.error('The texture attached to depth buffer is not a valid.');
        return;
      }
    }
    // TODO width and height check

    // If the depth_texture extension is enabled, developers
    // Can attach a depth texture to the depth buffer
    // http://blog.tojicode.com/2012/07/using-webgldepthtexture.html
    attachment = attachment || constants.COLOR_ATTACHMENT0;
    target = target || constants.TEXTURE_2D;

    const boundRenderer = this._boundRenderer;

    if (boundRenderer) {
      // Set viewport again incase attached to different size textures.
      if (!this.viewport) {
        boundRenderer.setViewport(0, 0, texture.width, texture.height, 1);
      }
    }
  }

  /**
   * Detach a texture
   * @param  {number} [attachment=gl.COLOR_ATTACHMENT0]
   * @param  {number} [target=gl.TEXTURE_2D]
   */
  detach(attachment: GLEnum, target: GLEnum) {
    // TODO depth extension check ?
    delete this._textures[attachment];
  }
}

export default FrameBuffer;

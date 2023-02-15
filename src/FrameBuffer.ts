import Texture from './Texture';
import * as constants from './core/constants';
import { RendererViewport } from './Renderer';
import { GLEnum } from './core/type';

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
    {
      texture: Texture;
      target: GLEnum;
    }
  > = {};

  constructor(opts?: Partial<FrameBufferOpts>) {
    this.depthBuffer = true;
  }

  /**
   * Get textures attached to framebuffer
   */
  getTextures() {
    return this._textures;
  }

  /**
   * Get width of framebuffer
   */
  getWidth() {
    return this._width;
  }
  /**
   * Get height of framebuffer
   */
  getHeight() {
    return this._height;
  }
  /**
   * Get viewport of bound framebuffer
   */
  getViewport() {
    return (
      this.viewport || {
        x: 0,
        y: 0,
        width: this._width,
        height: this._height,
        devicePixelRatio: 1
      }
    );
  }

  clearTextures() {
    this._textures = {};
    this._width = this._height = 0;
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

    // If the depth_texture extension is enabled, developers
    // Can attach a depth texture to the depth buffer
    // http://blog.tojicode.com/2012/07/using-webgldepthtexture.html
    attachment = attachment || constants.COLOR_ATTACHMENT0;
    target = target || constants.TEXTURE_2D;

    // Simplify the logic. Not check if width and height are match for multiple textures.
    this._width = texture.width;
    this._height = texture.height;

    const textures = this._textures;
    textures[attachment] = {
      texture,
      target
    };
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

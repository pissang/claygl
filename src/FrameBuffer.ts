import Texture from './Texture';
import * as constants from './core/constants';
import { RendererViewport } from './Renderer';
import { GLEnum } from './core/type';
import { assert } from './core/util';

interface FrameBufferOpts {
  /**
   * If use depth buffer
   */
  depthBuffer: boolean;
}
interface FrameBuffer extends FrameBufferOpts {}
class FrameBuffer {
  viewport?: RendererViewport;

  // Auto generate mipmap after render
  // TODO It's some workaround for the case like cubemap prefiltering.
  // Which don't need to generate mipmap again.
  autoGenerateMipmap?: boolean = true;

  private _width: number = 0;
  private _height: number = 0;

  mipmapLevel: number = 0;

  private _textures: Record<
    string,
    {
      texture: Texture;
      target: GLEnum;
    }
  > = {};

  constructor(opts?: Partial<FrameBufferOpts>) {
    const { depthBuffer } = opts || {};
    this.depthBuffer = depthBuffer == null ? true : depthBuffer;
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
    const scale = Math.pow(2, this.mipmapLevel);
    return (
      // PENDING this.viewport scale mipmapLevel?
      this.viewport || {
        x: 0,
        y: 0,
        width: this._width / scale,
        height: this._height / scale,
        pixelRatio: 1
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
    assert(texture.width > 0, 'Invalid texture');

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

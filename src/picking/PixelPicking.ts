import FrameBuffer from '../FrameBuffer';
import Texture2D from '../Texture2D';
import Shader from '../Shader';
import Material from '../Material';

import type Renderer from '../Renderer';
import type Camera from '../Camera';
import type Scene from '../Scene';
import type ClayNode from '../Node';
import type Renderable from '../Renderable';
import { colorFragment, colorVertex } from './color.glsl';

/**
 * Pixel picking is gpu based picking, which is fast and accurate.
 * But not like ray picking, it can't get the intersection point and triangle.
 */
class PixelPicking {
  /**
   * Target renderer
   */
  renderer: Renderer;
  /**
   * Downsample ratio of hidden frame buffer
   * @type {number}
   */
  downSampleRatio = 1;

  width: number;
  height: number;

  lookupOffset = 1;

  private _frameBuffer = new FrameBuffer();
  private _texture = new Texture2D();
  private _shader = new Shader(colorVertex, colorFragment);

  _idMaterials: Material[] = [];
  _lookupTable: Renderable[] = [];

  _meshMaterials: Material[] = [];

  _idOffset = 0;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.width = renderer.getWidth();
    this.height = renderer.getHeight();
  }

  /**
   * Set picking presision
   * @param {number} ratio
   */
  setPrecision(ratio: number) {
    this._texture.width = this.width * ratio;
    this._texture.height = this.height * ratio;
    this.downSampleRatio = ratio;
  }
  resize(width: number, height: number) {
    this._texture.width = width * this.downSampleRatio;
    this._texture.height = height * this.downSampleRatio;
    this.width = width;
    this.height = height;
    this._texture.dirty();
  }
  /**
   * Update the picking framebuffer
   * @param {number} ratio
   */
  update(scene: Scene, camera: Camera) {
    const renderer = this.renderer;
    const frameBuffer = this._frameBuffer;
    const newWidth = renderer.getWidth();
    const newHeight = renderer.getHeight();
    if (newWidth !== this.width || newHeight !== this.height) {
      this.resize(newWidth, newHeight);
    }

    frameBuffer.attach(this._texture);
    this._idOffset = this.lookupOffset;
    this._setMaterial(scene);
    renderer.render(scene, camera, frameBuffer);
    this._restoreMaterial();
  }

  _setMaterial(root: ClayNode) {
    const children = root.childrenRef();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.isRenderable()) {
        const id = this._idOffset++;
        const idx = id - this.lookupOffset;
        let material = this._idMaterials[idx];
        if (!material) {
          material = new Material(this._shader);
          const color = packID(id);
          color[0] /= 255;
          color[1] /= 255;
          color[2] /= 255;
          color[3] = 1.0;
          material.set('color', color);
          this._idMaterials[idx] = material;
        }
        this._meshMaterials[idx] = child.material;
        this._lookupTable[idx] = child;
        child.material = material;
      }
      if (child.childrenRef().length) {
        this._setMaterial(child);
      }
    }
  }

  /**
   * Pick the object
   * @param  {number} x Mouse position x
   * @param  {number} y Mouse position y
   * @return {clay.Node}
   */
  pick(x: number, y: number) {
    const renderer = this.renderer;

    const ratio = this.downSampleRatio;
    x = Math.ceil(ratio * x);
    y = Math.ceil(ratio * (this.height - y));

    renderer.bindFrameBuffer(this._frameBuffer);
    const pixel = new Uint8Array(4);
    const gl = renderer.gl;
    // TODO out of bounds ?
    // preserveDrawingBuffer ?
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    renderer.bindFrameBuffer(this._frameBuffer);
    // Skip interpolated pixel because of anti alias
    if (pixel[3] === 255) {
      const id = unpackID(pixel[0], pixel[1], pixel[2]);
      if (id) {
        const el = this._lookupTable[id - this.lookupOffset];
        return el;
      }
    }
  }

  _restoreMaterial() {
    for (let i = 0; i < this._lookupTable.length; i++) {
      this._lookupTable[i].material = this._meshMaterials[i];
    }
  }

  dispose(renderer: Renderer) {
    renderer.disposeFrameBuffer(this._frameBuffer);
  }
}

function packID(id: number) {
  const r = id >> 16;
  const g = (id - (r << 16)) >> 8;
  const b = id - (r << 16) - (g << 8);
  return [r, g, b];
}

function unpackID(r: number, g: number, b: number) {
  return (r << 16) + (g << 8) + b;
}

export default PixelPicking;

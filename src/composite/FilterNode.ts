// TODO Shader library
import CompositeNode from './CompositeNode';
import FullscreenQuadPass from './Pass';
import Renderer from '../Renderer';
import FrameBuffer from '../FrameBuffer';
import { GLEnum } from '../core/type';
import type Texture2D from '../Texture2D';

/**
 * Filter node
 *
 *
 * @example
 * const node = new clay.CompositeFilterNode({
 *   name: 'fxaa',
 *   shader: clay.Shader.source('clay.compositor.fxaa'),
 *   inputs: {
 *     texture: {
         node: 'scene',
 *       pin: 'color'
 *     }
 *   },
 *   // Multiple outputs is preserved for MRT support in WebGL2.0
 *   outputs: {
 *     color: {
 *       attachment: clay.FrameBuffer.COLOR_ATTACHMENT0
 *       parameters: {
 *         format: clay.Texture.RGBA,
 *         width: 512,
 *         height: 512
 *       },
 *       // Node will keep the RTT rendered in last frame
 *       keepLastFrame: true,
 *       // Force the node output the RTT rendered in last frame
 *       outputLastFrame: true
 *     }
 *   }
 * });
 *
 */

class CompositeFilterNode extends CompositeNode {
  pass: FullscreenQuadPass;

  // Example: { name: 2 }

  constructor(shader: string) {
    super();
    const pass = new FullscreenQuadPass(shader);
    this.pass = pass;
  }

  render(renderer: Renderer, frameBuffer: FrameBuffer) {
    this.trigger('beforerender', renderer);

    this._rendering = true;

    const _gl = renderer.gl;
    const compositor = this._compositor!;
    const pass = this.pass;
    const inputLinks = this.inputLinks;
    const inputNames = Object.keys(inputLinks);

    inputNames.forEach((inputName) => {
      const link = inputLinks[inputName];
      const inputTexture = link.node.renderAndOutput(renderer, link.pin);
      pass.setUniform(inputName, inputTexture);
    });
    // Output
    if (!this.outputs) {
      pass.outputs = undefined;
      compositor.getFrameBuffer().unbind(renderer);
      pass.render(renderer, frameBuffer);
    } else {
      pass.outputs = {};

      const attachedTextures: Record<GLEnum, Texture2D> = {};
      for (const name in this.outputs) {
        const parameters = this.updateParameter(name, renderer);
        if (isNaN(parameters.width as number)) {
          this.updateParameter(name, renderer);
        }
        const outputInfo = this.outputs[name];
        const texture = compositor.allocateTexture(parameters);
        const attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
        this._outputTextures[name] = texture;
        attachedTextures[attachment] = texture;
      }
      compositor.getFrameBuffer().bind(renderer);

      for (const attachment in attachedTextures) {
        // FIXME attachment changes in different nodes
        compositor.getFrameBuffer().attach(attachedTextures[attachment], +attachment);
      }

      pass.render(renderer);

      // Because the data of texture is changed over time,
      // Here update the mipmaps of texture each time after rendered;
      compositor.getFrameBuffer().updateMipmap(renderer);
    }

    inputNames.forEach((inputName) => {
      const link = inputLinks[inputName];
      link.node.removeReference(link.pin);
    });

    this._rendering = false;
    this._rendered = true;

    this.trigger('afterrender', renderer);
  }

  /**
   * Set parameter
   */
  setParameter(name: string, value: any) {
    this.pass.setUniform(name, value);
  }
  /**
   * Get parameter value
   * @param  {string} name
   * @return {}
   */
  getParameter(name: string) {
    return this.pass.getUniform(name);
  }
  /**
   * Set parameters
   */
  setParameters(obj: Record<string, any>) {
    Object.keys(obj).forEach((key) => {
      this.setParameter(key, obj[key]);
    });
  }
  // /**
  //  * Set shader code
  //  * @param {string} shaderStr
  //  */
  // setShader(shaderStr) {
  //     const material = this.pass.material;
  //     material.shader.setFragment(shaderStr);
  //     material.attachShader(material.shader, true);
  // },
  /**
   * Proxy of pass.material.define('fragment', xxx);
   */
  define(symbol: string, val: any) {
    this.pass.material!.define('fragment', symbol, val);
  }

  /**
   * Proxy of pass.material.undefine('fragment', xxx)
   * @param  {string} symbol
   */
  undefine(symbol: string) {
    this.pass.material!.undefine('fragment', symbol);
  }

  link(inputPinName: string, fromNode: CompositeNode, fromPinName: string): void {
    super.link(inputPinName, fromNode, fromPinName);
    // Enabled the pin texture in shader
    this.pass.material!.enableTexture(inputPinName);
  }

  validateInput(inputName: string) {
    return this.pass.material!.isUniformEnabled(inputName);
  }
  clear() {
    super.clear();

    // Default disable all texture
    this.pass.material!.disableTexturesAll();
  }
}
export default CompositeFilterNode;

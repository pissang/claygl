// TODO Shader library
import CompositeNode from './CompositeNode';
import FullscreenQuadPass from './Pass';
import Renderer from '../Renderer';
import FrameBuffer from '../FrameBuffer';
import Texture from '../Texture';
import { keys } from '../core/util';
import { FragmentShader } from '../Shader';

/**
 * Filter node
 *
 *
 * @example
 * const node = new clay.CompositeFilterNode({
 *   name: 'fxaa',
 *   shader: clay.Shader.source('clay.composite.fxaa'),
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

class CompositeFilterNode<T extends FragmentShader<any, any, any>> extends CompositeNode {
  pass: FullscreenQuadPass<T>;

  // Example: { name: 2 }

  constructor(shader: T) {
    super();
    const pass = new FullscreenQuadPass(shader);
    this.pass = pass;
  }

  prepare(renderer: Renderer): void {}

  render(
    renderer: Renderer,
    inputTextures: Record<string, Texture>,
    outputTextures?: Record<string, Texture>,
    finalFrameBuffer?: FrameBuffer
  ): void {
    this.trigger('beforerender', renderer);

    const pass = this.pass;

    pass.material?.disableTexturesAll();
    keys(inputTextures).forEach((inputName) => {
      // Enabled the pin texture in shader
      this.pass.material!.enableTexture(inputName);
      pass.material.set(inputName, inputTextures[inputName]);
    });

    // Output
    if (!outputTextures) {
      pass.outputs = undefined;
      pass.render(renderer, finalFrameBuffer);
    } else {
      pass.outputs = {};

      pass.render(renderer);
    }

    this.trigger('afterrender', renderer);
  }

  get material() {
    return this.pass.material;
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

  validateInput(inputName: string) {
    return !!this.pass.material!.uniforms[inputName];
  }
}
export default CompositeFilterNode;

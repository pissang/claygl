// TODO Shader library
import CompositeNode, { CompositeNodeInput } from './CompositeNode';
import FullscreenQuadPass from './Pass';
import Renderer from '../Renderer';
import FrameBuffer from '../FrameBuffer';
import Texture from '../Texture';
import { keys } from '../core/util';
import { FragmentShaderLoose, PickFragmentTextureUniforms } from '../Shader';

/**
 * Filter node
 *
 *
 * @example
 * const node = new clay.CompositeFilterNode({
 *   name: 'fxaa',
 *   shader: FXAACompositeFragment,
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

class CompositeFilterNode<
  O extends string = string,
  T extends FragmentShaderLoose = FragmentShaderLoose,
  S = PickFragmentTextureUniforms<T['uniforms']>
> extends CompositeNode<keyof S, O> {
  pass: FullscreenQuadPass<T>;

  // inputs?: Record<keyof S, CompositeNode | CompositeNodeInput>;
  // Example: { name: 2 }d

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
    frameBuffer?: FrameBuffer
  ): void {
    const pass = this.pass;
    const material = pass.material;

    // Disable textures all and enable when necessary
    pass.material?.disableTexturesAll();
    keys(inputTextures).forEach((inputName) => {
      // Enabled the pin texture in shader
      material.enableTexture(inputName as any);
      material.set(inputName, inputTextures[inputName]);
    });

    // Output
    pass.render(renderer, frameBuffer);
  }

  get material() {
    return this.pass.material;
  }

  validateInput(inputName: string) {
    return !!this.pass.material!.uniforms[inputName];
  }
}
export default CompositeFilterNode;

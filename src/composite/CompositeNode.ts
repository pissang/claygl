// PENDING
// Use topological sort ?
import Texture2D, { Texture2DOpts } from '../Texture2D';
import Compositor from './Compositor';
import type Renderer from '../Renderer';
import Notifier from '../core/Notifier';
import type FrameBuffer from '../FrameBuffer';
import { GLEnum } from '../core/type';
import type Texture from '../Texture';

export interface CompositeNodeInput {
  /**
   * Input node name or instance
   */
  node: CompositeNode | string;
  /**
   * Name of output. Will use the first if not given.
   */
  output?: string;
}
export interface CompositeNodeOutput {
  /**
   *
   */
  parameters?:
    | Partial<Texture2DOpts>
    | {
        width?: (renderer: Renderer) => number;
        height?: (renderer: Renderer) => number;
      };
  attachment?: GLEnum;
  keepLastFrame?: boolean;
  outputLastFrame?: boolean;
}

/**
 * Node of graph based post processing.
 */
abstract class CompositeNode extends Notifier {
  name: string = '';

  /**
   * Input of node. Key is the uniform name
   */
  inputs?: Record<string, CompositeNode | string | CompositeNodeInput>;
  /**
   * Output of node. Usually only one output. Key is the output name.
   */
  outputs?: Record<string, CompositeNodeOutput>;

  abstract render(
    renderer: Renderer,
    inputTextures?: Record<string, Texture>,
    /**
     * Output texture will be undefined when it's the output node.
     */
    outputTextures?: Record<string, Texture>,
    /**
     * If render to another framebuffer when it's the output node.
     */
    frameBuffer?: FrameBuffer
  ): void;

  validateInput(inputName: string) {
    return true;
  }
}

export default CompositeNode;

// PENDING
// Use topological sort ?
import type Renderer from '../Renderer';
import type FrameBuffer from '../FrameBuffer';
import { GLEnum } from '../core/type';
import type Texture from '../Texture';
import { TexturePoolParameters } from './TexturePool';

export interface CompositeNodeInput {
  /**
   * Input node name or instance
   */
  node: CompositeNode;
  /**
   * Name of output. Will use the first if not given.
   */
  output?: string;
}
export interface CompositeNodeOutput {
  /**
   * Attachment.
   */
  attachment?: GLEnum;
  /**
   * Width of output texture. Will inherit from the largest input texture if not given.
   */
  width?: number | ((renderer: Renderer) => number);
  /**
   * Height of output texture. Will inherit from the largest input texture if not given.
   */
  height?: number | ((renderer: Renderer) => number);
  /**
   * If width and height are not given and inherited from the input texture.
   * Scale can define the downscaling / upscaling factor.
   * default to be 1
   */
  scale?: number;
  params?: Partial<Omit<TexturePoolParameters, 'width' | 'height'>>;
  keepLastFrame?: boolean;
  outputLastFrame?: boolean;
}

/**
 * Node of graph based post processing.
 */
abstract class CompositeNode<InputKey extends string = string, OutputKey extends string = string> {
  name: string = '';

  /**
   * Input of node. Key is the uniform name
   */
  inputs?: Record<InputKey, CompositeNode | CompositeNodeInput>;
  /**
   * Output of node. Usually only one output. Key is the output name.
   */
  outputs?: Record<OutputKey, CompositeNodeOutput>;

  /**
   * If render to screen as an end node. Will ignore outpus.
   */
  renderToScreen?: boolean;

  /**
   * Do preparation logic.
   * For example update inputs and outputs. Update texture size etc
   */
  abstract prepare(renderer: Renderer): void;

  /**
   * Do render logic
   */
  abstract render(
    renderer: Renderer,
    /**
     * Allocated input textures.
     */
    inputTextures?: Record<InputKey, Texture>,
    /**
     * Rendered output textures. It's already attached to the framebuffer.
     * Output texture will be undefined when it's the output node.
     */
    outputTextures?: Record<OutputKey, Texture>,
    /**
     * Target framebuffer.
     */
    frameBuffer?: FrameBuffer
  ): void;

  validateInput(inputName: InputKey) {
    return true;
  }
}

export default CompositeNode;

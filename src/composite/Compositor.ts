import Graph from './Graph';
import TexturePool from './TexturePool';
import FrameBuffer from '../FrameBuffer';
import Texture2D, { Texture2DOpts } from '../Texture2D';
import Renderer from '../Renderer';
import CompositeNode from './CompositeNode';

/**
 * Compositor provide graph based post processing
 */

class Compositor extends Graph {
  // Output node

  private _texturePool = new TexturePool();

  private _frameBuffer = new FrameBuffer({
    depthBuffer: false
  });

  addNode(node: CompositeNode) {
    super.addNode(node);
    // TODO
    node._compositor = this;
  }

  createSceneNode() {}

  createNode() {}
  /**
   * @param  {clay.Renderer} renderer
   */
  render(renderer: Renderer, frameBuffer?: FrameBuffer) {
    const nodes = this.nodes;

    this.update();

    const outputs = nodes.filter((node) => !node.outputs);

    // Update the reference number of each output texture
    nodes.forEach((node) => node.beforeFrame());

    outputs.forEach((output) => output.updateReference());
    outputs.forEach((output) => output.render(renderer, frameBuffer));

    // Clear up
    nodes.forEach((node) => node.afterFrame());
  }

  allocateTexture(parameters: Partial<Texture2DOpts>) {
    return this._texturePool.get(parameters);
  }

  releaseTexture(texture: Texture2D) {
    this._texturePool.put(texture);
  }

  getFrameBuffer() {
    return this._frameBuffer;
  }

  /**
   * Dispose compositor
   * @param {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {
    this._texturePool.clear(renderer);
  }
}

export default Compositor;

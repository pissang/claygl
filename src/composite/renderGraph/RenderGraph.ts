import CompositeNode, { CompositeNodeInput } from '../CompositeNode';
import Texture2D, { Texture2DOpts } from '../../Texture2D';
import TexturePool from '../TexturePool';
import FrameBuffer from '../../FrameBuffer';
import Renderer from '../../Renderer';
import RenderGraphNode from './RenderGraphNode';

/**
 * Internal render graph
 */
class RenderGraph {
  private _nodes: RenderGraphNode[] = [];

  private _texturePool = new TexturePool();
  private _frameBuffer = new FrameBuffer({
    depthBuffer: false
  });

  addNode(node: RenderGraphNode) {
    const nodes = this._nodes;
    if (nodes.indexOf(node) < 0) {
      nodes.push(node);
    }
  }

  removeNode(node: RenderGraphNode) {
    const nodes = this._nodes;
    const idx = nodes.indexOf(node);
    if (idx >= 0) {
      nodes.splice(idx, 1);
    }
  }

  beforeUpdate() {
    this._nodes.forEach((node) => node.beforeUpdate());
  }

  render(renderer: Renderer, frameBuffer?: FrameBuffer) {
    const nodes = this._nodes;
    const outputs = nodes.filter((node) => node.isEndNode());

    if (!outputs.length) {
      console.error('No output. Set renderToScreen on the output node.');
    }

    // Update the reference number of each output texture
    nodes.forEach((node) => node.beforeRender());

    outputs.forEach((output) => output.render(renderer, frameBuffer));

    // Clear up
    nodes.forEach((node) => node.afterRender());
  }

  getTexturePool() {
    return this._texturePool;
  }

  getFrameBuffer() {
    return this._frameBuffer;
  }

  dispose(renderer: Renderer) {
    this._texturePool.clear(renderer);
  }
}
export default RenderGraph;

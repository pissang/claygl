import FrameBuffer from '../FrameBuffer';
import Renderer from '../Renderer';
import CompositeNode, { CompositeNodeInput } from './CompositeNode';
import RenderGraph from './renderGraph/RenderGraph';
import RenderGraphNode from './renderGraph/RenderGraphNode';

const renderGraphNodeMap = new WeakMap<CompositeNode, RenderGraphNode>();

/**
 * Compositor provide graph based post processing
 */
class Compositor {
  // Output node

  private _nodes: CompositeNode[] = [];

  private _renderGraph = new RenderGraph();

  addNode(node: CompositeNode) {
    const nodes = this._nodes;
    if (nodes.indexOf(node) < 0) {
      nodes.push(node);
      const renderGraphNode = new RenderGraphNode(node, this._renderGraph);
      this._renderGraph.addNode(renderGraphNode);
      renderGraphNodeMap.set(node, renderGraphNode);
    }
  }

  /**
   * @param node
   */
  removeNode(node: CompositeNode | string) {
    if (typeof node === 'string') {
      node = this.getNodeByName(node)!;
    }
    const nodes = this._nodes;
    const idx = nodes.indexOf(node);
    if (idx >= 0) {
      nodes.splice(idx, 1);
      const renderGraphNode = renderGraphNodeMap.get(node)!;
      this._renderGraph.removeNode(renderGraphNode);
    }
  }

  /**
   * @param name
   * @return
   */
  getNodeByName(name: string): CompositeNode | undefined {
    return this._nodes.find((node) => node.name === name);
  }
  /**
   * @param  {clay.Renderer} renderer
   */
  render(renderer: Renderer, frameBuffer?: FrameBuffer) {
    this._buildRenderGraphLinks();
    this._renderGraph.render(renderer, frameBuffer);
  }

  /**
   * Update links of graph
   */
  private _buildRenderGraphLinks() {
    const nodes = this._nodes;
    nodes.forEach((node) => renderGraphNodeMap.get(node)!.beforeUpdate());
    // Traverse all the nodes and build the graph
    nodes.forEach((node) => {
      Object.keys(node.inputs || {}).forEach((inputName) => {
        let inputInfo = node.inputs![inputName];
        if (!inputInfo) {
          return;
        }
        if (!node.validateInput(inputName)) {
          console.warn('Pin ' + node.name + '.' + inputName + ' not used.');
          return;
        }
        if (typeof inputInfo === 'string' || inputInfo instanceof CompositeNode) {
          inputInfo = {
            node: inputInfo
          };
        }

        const fromPin = this._findLink(inputInfo);
        if (fromPin) {
          renderGraphNodeMap
            .get(node)!
            .updateLinkFrom(inputName, renderGraphNodeMap.get(fromPin.node)!, fromPin.pin);
        } else {
          console.warn(
            'Pin of ' +
              inputInfo.node +
              (inputInfo.output ? '.' + inputInfo.output : '') +
              ' not exist'
          );
        }
      });
    });
  }

  private _findLink(input: CompositeNodeInput) {
    let node;
    // Try to take input as a directly a node
    if (typeof input === 'string' || input instanceof CompositeNode) {
      input = {
        node: input
      };
    }

    if (typeof input.node === 'string') {
      for (let i = 0; i < this._nodes.length; i++) {
        const tmp = this._nodes[i];
        if (tmp.name === input.node) {
          node = tmp;
        }
      }
    } else {
      node = input.node;
    }
    if (node) {
      let inputPin = input.output;
      if (!inputPin) {
        // Use first pin defaultly
        if (node.outputs) {
          inputPin = Object.keys(node.outputs)[0];
        }
      }
      if (node.outputs && node.outputs[inputPin!]) {
        return {
          node: node,
          pin: inputPin!
        };
      }
    }
  }

  /**
   * Dispose compositor
   * @param {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {
    this._renderGraph.dispose(renderer);
  }
}

export default Compositor;

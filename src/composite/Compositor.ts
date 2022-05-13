import { keys } from '../core/util';
import FrameBuffer from '../FrameBuffer';
import Renderer from '../Renderer';
import CompositeNode, { CompositeNodeInput } from './CompositeNode';
import GroupCompositeNode from './GroupNode';
import RenderGraph from './renderGraph/RenderGraph';
import RenderGraphNode from './renderGraph/RenderGraphNode';

const renderGraphNodeMap = new WeakMap<CompositeNode, RenderGraphNode>();
function createRenderGraphNode(renderGraph: RenderGraph, compositeNode: CompositeNode) {
  const renderGraphNode = new RenderGraphNode(compositeNode, renderGraph);
  renderGraph.addNode(renderGraphNode);
  renderGraphNodeMap.set(compositeNode, renderGraphNode);
}

function removeRenderGraphNode(renderGraph: RenderGraph, compositeNode: CompositeNode) {
  const renderGraphNode = renderGraphNodeMap.get(compositeNode)!;
  renderGraph.removeNode(renderGraphNode);
}
/**
 * Compositor provide graph based post processing
 */
class Compositor {
  private _nodes: CompositeNode[] = [];

  private _renderGraph = new RenderGraph();

  /**
   * Add a new node
   */
  addNode(node: CompositeNode) {
    const nodes = this._nodes;
    const renderGraph = this._renderGraph;
    if (nodes.indexOf(node) < 0) {
      nodes.push(node);
      if (node instanceof GroupCompositeNode) {
        node.eachNode((node) => createRenderGraphNode(renderGraph, node));
      } else {
        createRenderGraphNode(renderGraph, node);
      }
    }
  }

  /**
   * Remove node
   */
  removeNode(node: CompositeNode) {
    const nodes = this._nodes;
    const idx = nodes.indexOf(node);
    const renderGraph = this._renderGraph;
    if (idx >= 0) {
      nodes.splice(idx, 1);
      if (node instanceof GroupCompositeNode) {
        node.eachNode((node) => removeRenderGraphNode(renderGraph, node));
      } else {
        removeRenderGraphNode(renderGraph, node);
      }
    }
  }

  /**
   * Get node by name.
   */
  getNodeByName(name: string): CompositeNode | undefined {
    return this._nodes.find((node) => node.name === name);
  }

  /**
   * Render
   */
  render(renderer: Renderer, frameBuffer?: FrameBuffer) {
    this._nodes.forEach((node) => {
      node.prepare && node.prepare(renderer);
      renderGraphNodeMap.get(node)!.beforeUpdate();
    });

    this._buildRenderGraphLinks(renderer);

    this._renderGraph.render(renderer, frameBuffer);
  }

  /**
   * Update links of graph
   */
  private _buildRenderGraphLinks(renderer: Renderer) {
    function logMissingLink(input: CompositeNodeInput) {
      console.warn(
        'Pin of ' + input.node + (input.output ? '.' + input.output : '') + ' not exist'
      );
    }
    function findLink(input: CompositeNodeInput) {
      // Try to take input as a directly a node
      const node = input.node;
      const outputs = node.outputs;
      let inputPin = input.output;
      if (!inputPin && outputs) {
        // Use first pin defaultly
        inputPin = keys(outputs)[0];
      }
      if (!inputPin) {
        return;
      }

      if (node instanceof GroupCompositeNode) {
        const innerLink = node.getOutputInnerLink(inputPin);
        return (
          innerLink && {
            node: innerLink.node,
            pin: innerLink.output
          }
        );
      }
      if (outputs && outputs[inputPin!]) {
        return {
          node: node,
          pin: inputPin!
        };
      }
    }

    function eachNodeInput(
      node: CompositeNode,
      cb: (inputInfo: CompositeNodeInput, inputName: string) => void
    ) {
      keys(node.inputs || {}).forEach((inputName) => {
        let inputInfo = node.inputs![inputName];
        if (!inputInfo) {
          return;
        }
        if (!node.validateInput(inputName)) {
          console.warn('Pin ' + node.name + '.' + inputName + ' not used.');
          return;
        }
        if (inputInfo instanceof CompositeNode) {
          inputInfo = {
            node: inputInfo
          };
        }

        inputInfo && cb(inputInfo, inputName);
      });
    }

    function buildLinksOfNode(node: CompositeNode) {
      if (node instanceof GroupCompositeNode) {
        buildLinksOfGroupNode(node);
      } else {
        eachNodeInput(node, (inputInfo, inputName) => {
          const fromPin = findLink(inputInfo);
          if (!fromPin) {
            logMissingLink(inputInfo);
            return;
          }
          renderGraphNodeMap
            .get(node)!
            .updateLinkFrom(inputName, renderGraphNodeMap.get(fromPin.node)!, fromPin.pin);
        });
      }
    }

    function buildLinksOfGroupNode(groupNode: GroupCompositeNode) {
      groupNode.eachNode(buildLinksOfNode);
      eachNodeInput(groupNode, (groupInputInfo, groupInputName) => {
        const fromPin = findLink(groupInputInfo);
        if (!fromPin) {
          logMissingLink(groupInputInfo);
          return;
        }
        const inputInnerLink = groupNode.getInputInnerLink(groupInputName);
        if (inputInnerLink) {
          renderGraphNodeMap
            .get(inputInnerLink.node)!
            .updateLinkFrom(groupInputName, renderGraphNodeMap.get(fromPin.node)!, fromPin.pin);
          // TODO Error info when can't find inner link
        }
      });
    }

    // Traverse all the nodes and build the graph
    this._nodes.forEach(buildLinksOfNode);
  }

  /**
   * Dispose compositor
   * @param renderer
   */
  dispose(renderer: Renderer) {
    this._renderGraph.dispose(renderer);
  }
}

export default Compositor;

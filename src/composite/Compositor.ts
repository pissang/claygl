import { keys } from '../core/util';
import FrameBuffer from '../FrameBuffer';
import Renderer from '../Renderer';
import CompositeNode, { CompositeNodeInput } from './CompositeNode';
import GroupCompositeNode, { GroupInput } from './GroupNode';
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
  addNode(...newNodes: CompositeNode[]) {
    const nodes = this._nodes;

    newNodes.forEach((newNode) => {
      const renderGraph = this._renderGraph;
      if (nodes.indexOf(newNode) < 0) {
        nodes.push(newNode);
        if (newNode instanceof GroupCompositeNode) {
          newNode.eachNode((newNode) => createRenderGraphNode(renderGraph, newNode));
        } else {
          createRenderGraphNode(renderGraph, newNode);
        }
      }
    });
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
      if (node instanceof GroupCompositeNode) {
        node.updateInnerLinks();
      }
      node.prepare && node.prepare(renderer);
    });

    this._renderGraph.beforeUpdate();

    this._buildRenderGraphLinks(renderer);

    this._renderGraph.render(renderer, frameBuffer);
  }

  /**
   * Update links of graph
   */
  private _buildRenderGraphLinks(renderer: Renderer) {
    function logMissingLink(input: CompositeNodeInput) {
      console.warn(
        'Pin of ' +
          (input.node.name || 'Anoymous') +
          (input.output ? '.' + input.output : '') +
          ' not exist'
      );
    }
    function findLink(input: CompositeNodeInput) {
      // Try to take input as a directly a node
      const node = input.node;
      const outputs = node.outputs;
      let inputPin = input.output;
      if (!inputPin && outputs) {
        // Use first pin defaultly
        inputPin = keys(outputs).find(
          (outputName) => outputs[outputName] && !outputs[outputName].disabled
        );
      }
      if (!inputPin || (outputs && outputs[inputPin] && outputs[inputPin].disabled)) {
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
        // Just ignore GroupInput because it's already linked in the group nodes
        if (!inputInfo || inputInfo instanceof GroupInput) {
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
            .addLinkFrom(
              inputName,
              renderGraphNodeMap.get(fromPin.node)!,
              fromPin.pin,
              inputInfo.prevFrame
            );
        });
      }
    }

    function buildLinksOfGroupNode(groupNode: GroupCompositeNode<string, string>) {
      groupNode.eachNode(buildLinksOfNode);
      eachNodeInput(groupNode, (groupInputInfo, groupInputName) => {
        const fromPin = findLink(groupInputInfo);
        if (!fromPin) {
          logMissingLink(groupInputInfo);
          return;
        }
        const inputInnerLinks = groupNode.getInputInnerLink(groupInputName);
        if (inputInnerLinks) {
          inputInnerLinks.forEach((inputInnerLink) => {
            renderGraphNodeMap
              .get(inputInnerLink.node)!
              .addLinkFrom(
                inputInnerLink.input,
                renderGraphNodeMap.get(fromPin.node)!,
                fromPin.pin,
                groupInputInfo.prevFrame
              );
            // TODO Error info when can't find inner link
          });
        } else {
          console.error(`Can't find inner node linkes to ${groupInputName}`);
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

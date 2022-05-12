import type FrameBuffer from '../FrameBuffer';
import type Renderer from '../Renderer';
import type Texture from '../Texture';
import CompositeNode from './CompositeNode';

class GroupCompositeNode extends CompositeNode {
  private _nodes: CompositeNode[] = [];

  /**
   * Input links to internal node inputs
   * Key is group input name.
   */
  private _inputLinks: Record<
    string,
    {
      node: CompositeNode;
      input: string;
    }
  > = {};

  /**
   * Input links to internal node output
   * Key is group output name.
   */
  private _outputLinks: Record<
    string,
    {
      node: CompositeNode;
      output: string;
    }
  > = {};

  /**
   * Add a child node
   */
  addNode(
    node: CompositeNode,
    /**
     * Links map to group input. Key is node input name. Value is group input name.
     */
    linksToInput?: Record<string, string>,
    /**
     * Links map to group output. Key is node output name. Value is group output name.
     */
    linksToOutput?: Record<string, string>
  ) {
    const nodes = this._nodes;
    if (nodes.indexOf(node) < 0) {
      nodes.push(node);

      if (linksToInput) {
        Object.keys(linksToInput).forEach((nodeInputName) => {
          this._inputLinks[linksToInput[nodeInputName]] = {
            node,
            input: nodeInputName
          };
        });
      }

      if (linksToOutput) {
        Object.keys(linksToOutput).forEach((nodeOutputName) => {
          this._outputLinks[linksToOutput[nodeOutputName]] = {
            node,
            output: nodeOutputName
          };
        });
      }
    }
  }

  /**
   * Remove a child node
   */
  removeNode(node: CompositeNode) {
    const nodes = this._nodes;
    const idx = nodes.indexOf(node);
    const inputLinks = this._inputLinks;
    const outputLinks = this._outputLinks;
    if (idx >= 0) {
      nodes.splice(idx, 1);

      Object.keys(inputLinks).forEach((groupInputName) => {
        if (inputLinks[groupInputName].node === node) {
          delete inputLinks[groupInputName];
        }
      });
      Object.keys(outputLinks).forEach((groupOutputName) => {
        if (outputLinks[groupOutputName].node === node) {
          delete outputLinks[groupOutputName];
        }
      });
    }
  }

  eachNode(cb: (node: CompositeNode) => void) {
    this._nodes.forEach(cb);
  }

  /**
   * Get node by name.
   */
  getNodeByName(name: string): CompositeNode | undefined {
    return this._nodes.find((node) => node.name === name);
  }

  prepare(renderer: Renderer): void {
    this._nodes.forEach((node) => node.prepare(renderer));
    // Update inputs
  }

  getInputInnerLink(groupInputName: string) {
    return this._inputLinks[groupInputName];
  }
  getOutputInnerLink(groupInputName: string) {
    return this._outputLinks[groupInputName];
  }

  render(
    renderer: Renderer,
    inputTextures?: Record<string, Texture>,
    outputTextures?: Record<string, Texture>,
    frameBuffer?: FrameBuffer
  ): void {}
}

export default GroupCompositeNode;

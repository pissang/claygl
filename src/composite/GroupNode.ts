import { keys } from '../core/util';
import type FrameBuffer from '../FrameBuffer';
import type Renderer from '../Renderer';
import type Texture from '../Texture';
import CompositeNode from './CompositeNode';

class GroupCompositeNode<InputKey extends string, OutputKeys extends string> extends CompositeNode<
  InputKey,
  OutputKeys
> {
  private _nodes: CompositeNode[] = [];

  /**
   * Input links to internal node inputs
   * Key is group input name.
   */
  private _inputLinks = {} as Record<
    InputKey,
    {
      node: CompositeNode;
      input: string;
    }
  >;

  /**
   * Input links to internal node output
   * Key is group output name.
   */
  private _outputLinks = {} as Record<
    OutputKeys,
    {
      node: CompositeNode;
      output: string;
    }
  >;

  /**
   * Add a child node
   */
  addNode<T extends CompositeNode>(
    node: T,
    /**
     * Links map to group input. Key is node input name. Value is group input name.
     */
    linksToInput?: Record<keyof T['inputs'], InputKey>,
    /**
     * Links map to group output. Key is node output name. Value is group output name.
     */
    linksToOutput?: Record<keyof T['outputs'], OutputKeys>
  ) {
    const nodes = this._nodes;
    if (nodes.indexOf(node) < 0) {
      nodes.push(node);

      if (linksToInput) {
        keys(linksToInput).forEach((nodeInputName) => {
          this._inputLinks[linksToInput[nodeInputName as keyof T['inputs']]] = {
            node,
            input: nodeInputName
          };
        });
      }

      if (linksToOutput) {
        keys(linksToOutput).forEach((nodeOutputName) => {
          this._outputLinks[linksToOutput[nodeOutputName as keyof T['outputs']]] = {
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

      keys(inputLinks).forEach((groupInputName) => {
        if (inputLinks[groupInputName as InputKey].node === node) {
          delete inputLinks[groupInputName as InputKey];
        }
      });
      keys(outputLinks).forEach((groupOutputName) => {
        if (outputLinks[groupOutputName as OutputKeys].node === node) {
          delete outputLinks[groupOutputName as OutputKeys];
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

    const outputLinks = this._outputLinks;
    // Update renderToScreen in output nodes.
    keys(outputLinks).forEach(
      (groupOutputName) =>
        (outputLinks[groupOutputName as OutputKeys].node.renderToScreen = this.renderToScreen)
    );
    // TODO what if group node set outputs to empty?
  }

  getInputInnerLink(groupInputName: InputKey) {
    return this._inputLinks[groupInputName];
  }
  getOutputInnerLink(groupInputName: OutputKeys) {
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

import { keys } from '../core/util';
import type FrameBuffer from '../FrameBuffer';
import type Renderer from '../Renderer';
import type Texture from '../Texture';
import CompositeNode, { CompositeNodeInput, CompositeNodeOutput } from './CompositeNode';

export class GroupInput implements CompositeNodeInput {
  output: string;
  /**
   * Group node is self. Must have here to compatitable with CompositeNode#inputs
   */
  node: GroupCompositeNode<string, string>;
  constructor(node: GroupCompositeNode<string, string>, output: string) {
    this.output = output;
    this.node = node;
  }
}

// It will only be used as a handle to verify it's connected to the group output.
// The parameters will be not used.
export interface GroupOutput extends CompositeNodeOutput {}
export class GroupOutput {
  name: string;
  /**
   * The alactul output info of group
   * Will be updated in the prepare
   */
  // TODO should be optimized
  groupOutput?: CompositeNodeOutput;
  constructor(name: string) {
    this.name = name;
  }
}

type InputLinksMap<Key extends string> = Record<
  Key,
  {
    node: CompositeNode;
    input: string;
  }
>;
type OutputLinksMap<Key extends string> = Record<
  Key,
  {
    node: CompositeNode;
    output: string;
  }
>;

class GroupCompositeNode<InputKey extends string, OutputKey extends string> extends CompositeNode<
  InputKey,
  OutputKey
> {
  private _nodes: CompositeNode[] = [];

  /**
   * Input links to internal node inputs
   * Key is group input name.
   */
  private _inputLinks = {} as InputLinksMap<InputKey>;

  /**
   * Input links to internal node output
   * Key is group output name.
   */
  private _outputLinks = {} as OutputLinksMap<OutputKey>;

  /**
   * Add a child node
   */
  addNode<T extends CompositeNode>(node: T) {
    const nodes = this._nodes;
    if (nodes.indexOf(node) < 0) {
      nodes.push(node);
    }
  }

  /**
   * Remove a child node
   */
  removeNode(node: CompositeNode) {
    const nodes = this._nodes;
    const idx = nodes.indexOf(node);
    if (idx >= 0) {
      nodes.splice(idx, 1);
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

  // TODO it's easy to forget call super.prepare when it's overridden
  prepare(renderer: Renderer): void {
    const inputLinks = (this._inputLinks = {} as InputLinksMap<InputKey>);
    const outputLinks = (this._outputLinks = {} as OutputLinksMap<OutputKey>);
    this._nodes.forEach((node) => {
      node.prepare(renderer);

      keys(node.inputs).forEach((inputName) => {
        const groupInput = node.inputs![inputName];
        if (groupInput instanceof GroupInput) {
          inputLinks[groupInput.output as InputKey] = {
            node: node,
            input: inputName
          };
        }
      });
      keys(node.outputs).forEach((outputName) => {
        const groupOutput = node.outputs![outputName];
        if (groupOutput instanceof GroupOutput) {
          outputLinks[groupOutput.name as OutputKey] = {
            node: node,
            output: outputName
          };
          groupOutput.groupOutput = this.outputs && this.outputs[groupOutput.name as OutputKey];
          // Update renderToScreen in output nodes.
          node.renderToScreen = this.renderToScreen;
        }
      });
    });

    // TODO what if group node set outputs to empty?
  }

  /**
   * Get a handle of group input. Group will know how to link to the inside nodes to outside.
   */
  getGroupInput(inputName: InputKey): GroupInput {
    return new GroupInput(this, inputName);
  }
  /**
   * Get a handle of group output. Group will know how to link to the inside nodes to outside.
   */
  getGroupOutput(outputName: OutputKey): GroupOutput {
    return new GroupOutput(outputName);
  }

  getInputInnerLink(groupInputName: InputKey) {
    return this._inputLinks[groupInputName];
  }
  getOutputInnerLink(groupInputName: OutputKey) {
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

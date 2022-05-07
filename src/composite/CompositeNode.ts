// PENDING
// Use topological sort ?
import Texture2D, { Texture2DOpts } from '../Texture2D';
import Compositor from './Compositor';
import type Renderer from '../Renderer';
import { isFunction } from '../core/util';
import Notifier from '../core/Notifier';
import type FrameBuffer from '../FrameBuffer';
import { GLEnum } from '../core/type';

const parametersCopyMap = new WeakMap<CompositeNodeOutput, Partial<Texture2DOpts>>();

interface CompositeNodeLink {
  node: CompositeNode;
  pin: string;
}

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
class CompositeNode extends Notifier {
  name: string = '';

  /**
   * Input of node. Key is the uniform name
   */
  inputs?: Record<string, CompositeNode | string | CompositeNodeInput>;
  /**
   * Output of node. Usually only one output. Key is the output name.
   */
  outputs?: Record<string, CompositeNodeOutput>;

  /**
   * Input links, will be updated by the graph
   * @example:
   *     inputName: {
   *         node: someNode,
   *         pin: 'xxxx'
   *     }
   * @type {Object}
   */
  inputLinks: Record<string, CompositeNodeLink> = {};

  /**
   * Output links, will be updated by the graph
   * @example:
   *     outputName: [{
   *         node: someNode,
   *         pin: 'xxxx'
   *     }]
   * @type {Object}
   */
  outputLinks: Record<string, CompositeNodeLink[]> = {};

  // Save the output texture of previous frame
  // Will be used when there exist a circular reference
  _prevOutputTextures: Record<string, Texture2D> = {};
  _outputTextures: Record<string, Texture2D> = {};

  // Example: { name: 2 }
  _outputReferences: Record<string, number> = {};

  protected _rendering = false;
  // If rendered in this frame
  protected _rendered = false;

  _compositor?: Compositor;

  updateParameter(outputName: string, renderer: Renderer) {
    const outputInfo = this.outputs![outputName];
    const parameters = outputInfo.parameters || {};
    let parametersCopy = parametersCopyMap.get(outputInfo);
    if (!parametersCopy) {
      parametersCopy = {};
      parametersCopyMap.set(outputInfo, parametersCopy);
    }
    Object.keys(parameters).forEach((key) => {
      if (key !== 'width' && key !== 'height') {
        (parametersCopy as any)[key] = (parameters as any)[key];
      }
    });
    const width = isFunction(parameters.width) ? parameters.width(renderer) : parameters.width;
    const height = isFunction(parameters.height) ? parameters.height(renderer) : parameters.height;
    const outputTextures = this._outputTextures;

    if (parametersCopy.width !== width || parametersCopy.height !== height) {
      if (outputTextures[outputName]) {
        outputTextures[outputName].dispose(renderer);
      }
    }
    parametersCopy.width = width;
    parametersCopy.height = height;

    return parametersCopy;
  }

  /**
   * Set parameter
   * @param {string} name
   * @param {} value
   */
  setParameter(name: string, value: any) {}
  /**
   * Get parameter value
   * @param  {string} name
   * @return {}
   */
  getParameter(name: string) {}
  /**
   * Set parameters
   * @param {Object} obj
   */
  setParameters(obj: any) {
    Object.keys(obj).forEach((key) => {
      this.setParameter(key, obj[key]);
    });
  }

  render(renderer: Renderer, frameBuffer?: FrameBuffer) {}

  renderAndOutput(renderer: Renderer, name: string): Texture2D | undefined {
    const outputInfo = this.outputs![name];
    const prevOutputTextures = this._prevOutputTextures;
    if (!outputInfo) {
      return;
    }

    // Already been rendered in this frame
    if (this._rendered) {
      // Force return texture in last frame
      if (outputInfo.outputLastFrame) {
        return prevOutputTextures[name];
      } else {
        return this._outputTextures[name];
      }
    } else if (
      // TODO
      this._rendering // Solve Circular Reference
    ) {
      if (!prevOutputTextures[name]) {
        // Create a blank texture at first pass
        prevOutputTextures[name] = this._compositor!.allocateTexture(
          parametersCopyMap.get(outputInfo) || {}
        );
      }
      return this._prevOutputTextures[name];
    }

    this.render(renderer as Renderer);

    return this._outputTextures[name];
  }

  getOutput(name: string) {
    return this._outputTextures[name];
  }

  removeReference(outputName: string) {
    this._outputReferences[outputName]--;
    if (this._outputReferences[outputName] === 0) {
      const outputInfo = this.outputs![outputName];
      if (outputInfo.keepLastFrame) {
        if (this._prevOutputTextures[outputName]) {
          this._compositor!.releaseTexture(this._prevOutputTextures[outputName]);
        }
        this._prevOutputTextures[outputName] = this._outputTextures[outputName];
      } else {
        // Output of this node have alreay been used by all other nodes
        // Put the texture back to the pool.
        this._compositor!.releaseTexture(this._outputTextures[outputName]);
      }
    }
  }

  link(inputPinName: string, fromNode: CompositeNode, fromPinName: string) {
    // The relationship from output pin to input pin is one-on-multiple
    this.inputLinks[inputPinName] = {
      node: fromNode,
      pin: fromPinName
    };
    const outputLinks = fromNode.outputLinks;
    if (!outputLinks[fromPinName]) {
      outputLinks[fromPinName] = [];
    }
    outputLinks[fromPinName].push({
      node: this,
      pin: inputPinName
    });
  }

  clear() {
    this.inputLinks = {};
    this.outputLinks = {};
  }

  updateReference(outputName?: string) {
    if (!this._rendering) {
      this._rendering = true;
      for (const inputName in this.inputLinks) {
        const link = this.inputLinks[inputName];
        link.node.updateReference(link.pin);
      }
      this._rendering = false;
    }
    if (outputName) {
      this._outputReferences[outputName]++;
    }
  }

  beforeFrame() {
    this._rendered = false;

    for (const name in this.outputLinks) {
      this._outputReferences[name] = 0;
    }
  }

  afterFrame() {
    const compositor = this._compositor!;
    // Put back all the textures to pool
    for (const name in this.outputLinks) {
      if (this._outputReferences[name] > 0) {
        const outputInfo = this.outputs![name];
        if (outputInfo.keepLastFrame) {
          if (this._prevOutputTextures[name]) {
            compositor.releaseTexture(this._prevOutputTextures[name]);
          }
          this._prevOutputTextures[name] = this._outputTextures[name];
        } else {
          compositor.releaseTexture(this._outputTextures[name]);
        }
      }
    }
  }

  validateInput(inputName: string) {
    return true;
  }
}

export default CompositeNode;

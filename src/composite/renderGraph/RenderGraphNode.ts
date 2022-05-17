import { COLOR_ATTACHMENT0 } from '../../core/constants';
import { GLEnum } from '../../core/type';
import { isFunction, keys } from '../../core/util';
import type FrameBuffer from '../../FrameBuffer';
import type Renderer from '../../Renderer';
import type Texture from '../../Texture';
import Texture2D, { Texture2DOpts } from '../../Texture2D';
import CompositeNode, { CompositeNodeOutput } from '../CompositeNode';
import type RenderGraph from './RenderGraph';

const parametersCopyMap = new WeakMap<CompositeNodeOutput, Partial<Texture2DOpts>>();

interface RenderGraphNodeLink {
  node: RenderGraphNode;
  pin: string;
}

class RenderGraphNode {
  private _rendering = false;
  // If rendered in this frame
  private _rendered = false;

  /**
   * Input links, will be updated by the graph
   * @example:
   *     inputName: {
   *         node: someNode,
   *         pin: 'xxxx'
   *     }
   */
  protected _inputs: Record<string, RenderGraphNodeLink> = {};

  /**
   * Output links, will be updated by the graph
   * @example:
   *     outputName: [{
   *         node: someNode,
   *         pin: 'xxxx'
   *     }]
   */
  protected _outputs: Record<string, RenderGraphNodeLink[]> = {};

  // Save the output texture of previous frame
  // Will be used when there exist a circular reference
  private _prevOutputTextures: Record<string, Texture2D> = {};
  private _outputTextures: Record<string, Texture2D> = {};

  // Example: { name: 2 }
  private _outputReferences: Record<string, number> = {};

  private _compositeNode: CompositeNode;
  private _renderGraph: RenderGraph;

  constructor(compositeNode: CompositeNode, renderGraph: RenderGraph) {
    this._compositeNode = compositeNode;
    this._renderGraph = renderGraph;
  }

  updateParameter(outputName: string, renderer: Renderer) {
    const outputInfo = this._compositeNode.outputs![outputName];
    const parameters = outputInfo.parameters || {};
    let parametersCopy = parametersCopyMap.get(outputInfo);
    if (!parametersCopy) {
      parametersCopy = {};
      parametersCopyMap.set(outputInfo, parametersCopy);
    }
    keys(parameters).forEach((key) => {
      if (key !== 'width' && key !== 'height') {
        (parametersCopy as any)[key] = (parameters as any)[key];
      }
    });
    const width = isFunction(parameters.width) ? parameters.width(renderer) : parameters.width;
    const height = isFunction(parameters.height) ? parameters.height(renderer) : parameters.height;
    // const outputTextures = this._outputTextures;
    // if (parametersCopy.width !== width || parametersCopy.height !== height) {
    //   if (outputTextures[outputName]) {
    //     outputTextures[outputName].dispose(renderer);
    //   }
    // }
    parametersCopy.width = width;
    parametersCopy.height = height;

    return parametersCopy;
  }

  renderAndOutputTexture(renderer: Renderer, outputPin: string): Texture2D | undefined {
    const outputInfo = this._compositeNode.outputs![outputPin];
    const prevOutputTextures = this._prevOutputTextures;
    if (!outputInfo) {
      return;
    }

    // Already been rendered in this frame
    if (this._rendered) {
      // Force return texture in last frame
      if (outputInfo.outputLastFrame) {
        return prevOutputTextures[outputPin];
      } else {
        return this._outputTextures[outputPin];
      }
    } else if (
      // TODO
      this._rendering // Solve Circular Reference
    ) {
      if (!prevOutputTextures[outputPin]) {
        // Create a blank texture at first pass
        prevOutputTextures[outputPin] = this._renderGraph.allocateTexture(
          this.updateParameter(outputPin, renderer)
          // parametersCopyMap.get(outputInfo) || {}
        );
      }
      return this._prevOutputTextures[outputPin];
    }

    this.render(renderer);

    return this._outputTextures[outputPin];
  }

  hasOutput() {
    return keys(this._outputs).length > 0;
  }

  render(renderer: Renderer, finalFrameBuffer?: FrameBuffer) {
    this._rendering = true;

    const renderGraph = this._renderGraph;
    const inputLinks = this._inputs || {};
    const inputNames = keys(inputLinks);
    const outputLinks = this._outputs || {};
    const outputNames = keys(outputLinks);
    const sharedFrameBuffer = renderGraph.getFrameBuffer();

    const inputTextures: Record<string, Texture> = {};
    inputNames.forEach((inputName) => {
      const link = inputLinks[inputName];
      const texture = link.node.renderAndOutputTexture(renderer, link.pin);
      if (texture) {
        inputTextures[inputName] = texture;
      }
    });

    // MRT Support in chrome
    // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
    const ext = renderer.getWebGLExtension('EXT_draw_buffers');
    const bufs: GLEnum[] = [];
    let outputTextures: Record<string, Texture> | undefined;
    if (!outputNames.length) {
      // Final output
      sharedFrameBuffer.unbind(renderer);
    } else {
      outputTextures = {};

      outputNames.forEach((outputName) => {
        const parameters = this.updateParameter(outputName, renderer);
        if (isNaN(parameters.width as number)) {
          this.updateParameter(outputName, renderer);
        }
        // TODO Avoid reading from composite node too much
        const outputInfo = this._compositeNode.outputs![outputName];
        const texture = renderGraph.allocateTexture(parameters);
        const attachment = outputInfo.attachment || COLOR_ATTACHMENT0;
        this._outputTextures[outputName] = texture;
        outputTextures![outputName] = texture;

        if (ext && attachment >= COLOR_ATTACHMENT0 && attachment <= COLOR_ATTACHMENT0 + 8) {
          bufs.push(attachment);
        }
        // FIXME attachment changes in different nodes
        sharedFrameBuffer.attach(texture, +attachment);
      });

      sharedFrameBuffer.bind(renderer);
    }
    if (ext && bufs.length) {
      ext.drawBuffersEXT(bufs);
    }

    this._compositeNode.render(renderer, inputTextures, outputTextures, finalFrameBuffer);

    // Because the data of texture is changed over time,
    // Here update the mipmaps of texture each time after rendered;
    if (outputNames.length) {
      sharedFrameBuffer.updateMipmap(renderer);
      sharedFrameBuffer.unbind(renderer);
    }

    inputNames.forEach((inputName) => {
      const link = inputLinks[inputName];
      link.node.releaseReference(link.pin);
    });

    this._rendering = false;
    this._rendered = true;
  }

  getOutputTexture(name: string) {
    return this._outputTextures[name];
  }

  /**
   * Remove reference from subsequent node after it's rendered.
   */
  releaseReference(outputName: string) {
    const prevOutputTextures = this._prevOutputTextures;
    const outputTextures = this._outputTextures;
    this._outputReferences[outputName]--;
    if (this._outputReferences[outputName] === 0) {
      const outputInfo = this._compositeNode.outputs![outputName];
      if (outputInfo.keepLastFrame) {
        if (prevOutputTextures[outputName]) {
          this._renderGraph!.releaseTexture(prevOutputTextures[outputName]);
        }
        prevOutputTextures[outputName] = outputTextures[outputName];
      } else {
        // Output of this node have alreay been used by all other nodes
        // Put the texture back to the pool.
        this._renderGraph!.releaseTexture(outputTextures[outputName]);
      }
    }
  }

  updateLinkFrom(inputPinName: string, fromNode: RenderGraphNode, fromPinName: string) {
    // The relationship from output pin to input pin is one-on-multiple
    this._inputs[inputPinName] = {
      node: fromNode,
      pin: fromPinName
    };
    const outputLinks = fromNode._outputs;
    if (!outputLinks[fromPinName]) {
      outputLinks[fromPinName] = [];
    }
    outputLinks[fromPinName].push({
      node: this,
      pin: inputPinName
    });
  }

  beforeUpdate() {
    this._inputs = {};
    this._outputs = {};
  }

  countReference(outputName?: string) {
    if (!this._rendering) {
      for (const inputName in this._inputs) {
        const link = this._inputs[inputName];
        link.node.countReference(link.pin);
      }
    }
    if (outputName) {
      this._outputReferences[outputName]++;
    }
  }

  beforeFrame() {
    this._rendered = false;

    for (const name in this._outputs) {
      this._outputReferences[name] = 0;
    }
  }

  afterFrame() {
    const compositor = this._renderGraph!;
    // Put back all the textures to pool
    for (const name in this._outputs) {
      if (this._outputReferences[name] > 0) {
        const outputInfo = this._compositeNode.outputs![name];
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
}

export default RenderGraphNode;

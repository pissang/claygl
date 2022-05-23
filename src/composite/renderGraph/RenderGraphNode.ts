import { COLOR_ATTACHMENT0 } from '../../core/constants';
import { assign, isFunction, keys, optional } from '../../core/util';
import type FrameBuffer from '../../FrameBuffer';
import type Renderer from '../../Renderer';
import type Texture from '../../Texture';
import Texture2D from '../../Texture2D';
import CompositeNode from '../CompositeNode';
import { GroupOutput } from '../GroupNode';
import { TexturePoolParameters } from '../TexturePool';
import type RenderGraph from './RenderGraph';

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
   *   inputName: {
   *     node: someNode,
   *     pin: 'xxxx'
   *    }
   */
  protected _inputs: Record<string, RenderGraphNodeLink> = {};

  /**
   * Output links, will be updated by the graph
   * @example:
   *   outputName: [{
   *     node: someNode,
   *     pin: 'xxxx'
   *   }]
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

  // Cached texture params.
  private _textureParams: Record<string, TexturePoolParameters> = {};

  constructor(compositeNode: CompositeNode, renderGraph: RenderGraph) {
    this._compositeNode = compositeNode;
    this._renderGraph = renderGraph;
  }

  getTextureParams(
    outputName: string,
    renderer: Renderer
    // derivedParams: TexturePoolParameters
  ) {
    const textureParams = this._textureParams;
    if (!textureParams[outputName]) {
      const derivedParams = this._deriveTextureParams(renderer);
      const outputInfo = this._compositeNode.outputs![outputName];
      const width = isFunction(outputInfo.width) ? outputInfo.width(renderer) : outputInfo.width;
      const height = isFunction(outputInfo.height)
        ? outputInfo.height(renderer)
        : outputInfo.height;
      // TODO Omit other params??
      const params = assign({} as TexturePoolParameters, derivedParams, outputInfo);
      const scale = optional(outputInfo.scale, 1);
      width != null && (params.width = width * scale);
      height != null && (params.height = height * scale);
      // Use width/height from renderer by default
      params.width = params.width || renderer.getWidth();
      params.height = params.height || renderer.getHeight();

      textureParams[outputName] = params;
    }
    return textureParams[outputName];
  }

  /**
   * Find the most large input texture to inherit.
   */
  private _deriveTextureParams(renderer: Renderer) {
    let mostProbablyParams: TexturePoolParameters | undefined;
    let largestSize = 0;
    keys(this._inputs).forEach((inputName) => {
      const { node, pin } = this._inputs[inputName];
      const params = node.getTextureParams(pin, renderer);
      const size = params.width * params.height;
      if (size > largestSize) {
        largestSize = size;
        mostProbablyParams = params;
      }
    });
    return mostProbablyParams;
  }

  renderAndOutputTexture(renderer: Renderer, outputPin: string): Texture2D | undefined {
    const outputInfo = this._compositeNode.outputs![outputPin];
    const prevOutputTextures = this._prevOutputTextures;
    const outputTextures = this._outputTextures;
    if (!outputInfo) {
      return;
    }

    // Already been rendered in this frame
    if (this._rendered) {
      // Force return texture in last frame
      if (outputInfo.outputLastFrame) {
        return prevOutputTextures[outputPin];
      } else {
        return outputTextures[outputPin];
      }
    } else if (
      // TODO
      this._rendering // Solve Circular Reference
    ) {
      if (!prevOutputTextures[outputPin]) {
        // Create a blank texture at first pass
        prevOutputTextures[outputPin] = this._renderGraph.allocateTexture(
          this.getTextureParams(outputPin, renderer)
          // parametersCopyMap.get(outputInfo) || {}
        );
      }
      return this._prevOutputTextures[outputPin];
    }

    // Update for all outputs. this.outputs only inlcude that is linked.
    keys(this._compositeNode.outputs).forEach((outputName) => {
      this.getTextureParams(outputName, renderer);
    });

    this.render(renderer);

    return outputTextures[outputPin];
  }

  hasOutput() {
    const outputs = this._outputs;
    return keys(outputs).find((key) => outputs[key] && outputs[key].length > 0) != null;
  }

  isEndNode() {
    const compositeNode = this._compositeNode;
    return compositeNode.renderToScreen || !this.hasOutput();
  }

  render(renderer: Renderer, finalFrameBuffer?: FrameBuffer) {
    this._rendering = true;

    const renderGraph = this._renderGraph;
    const inputLinks = this._inputs || {};
    const inputNames = keys(inputLinks);
    const outputLinks = this._outputs || {};
    const hasOutput = !this.isEndNode();
    const outputNames = hasOutput ? keys(outputLinks) : [];
    const sharedFrameBuffer = hasOutput ? renderGraph.getFrameBuffer() : undefined;

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
    const outputTextures: Record<string, Texture> | undefined = hasOutput ? {} : undefined;

    // Clear before rebind.
    sharedFrameBuffer && sharedFrameBuffer.clearTextures();

    outputNames.forEach((outputName) => {
      const parameters = this.getTextureParams(outputName, renderer);
      if (isNaN(parameters.width as number)) {
        this.getTextureParams(outputName, renderer);
      }
      // TODO Avoid reading from composite node too much
      const outputInfo = this._compositeNode.outputs![outputName];
      const texture = renderGraph.allocateTexture(parameters);
      const attachment = outputInfo.attachment || COLOR_ATTACHMENT0;
      this._outputTextures[outputName] = texture;
      outputTextures![outputName] = texture;

      // FIXME attachment changes in different nodes
      sharedFrameBuffer!.attach(texture, +attachment);
    });

    this._compositeNode.render(
      renderer,
      inputTextures,
      outputTextures,
      sharedFrameBuffer || finalFrameBuffer
    );

    inputNames.forEach((inputName) => {
      const link = inputLinks[inputName];
      link.node.releaseReference(link.pin);
    });

    // Release textures that are not taken
    outputNames.forEach((outputName) => {
      if (!this._outputReferences[outputName]) {
        renderGraph!.releaseTexture(outputTextures![outputName] as Texture2D);
      }
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
    const renderGraph = this._renderGraph;
    const outputReferences = this._outputReferences;

    outputReferences[outputName]--;

    if (outputReferences[outputName] === 0) {
      const outputInfo = this._compositeNode.outputs![outputName];
      if (outputInfo.keepLastFrame) {
        if (prevOutputTextures[outputName]) {
          renderGraph!.releaseTexture(prevOutputTextures[outputName]);
        }
        prevOutputTextures[outputName] = outputTextures[outputName];
      } else {
        // Output of this node have alreay been used by all other nodes
        // Put the texture back to the pool.
        renderGraph!.releaseTexture(outputTextures[outputName]);
      }
    }
  }

  addLinkFrom(inputPinName: string, fromNode: RenderGraphNode, fromPinName: string) {
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
    const rawOutputs = this._compositeNode.outputs!;
    this._inputs = {};
    // All parameters of outputs need to be updated
    this._outputs = keys(rawOutputs)
      .filter((key) => {
        const rawOutput = this._getOutputInfo(key);
        return rawOutput && !rawOutput.disabled;
      })
      .reduce((obj, key) => {
        obj[key] = [];
        return obj;
      }, {} as RenderGraphNode['_outputs']);
    this._textureParams = {};
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

  beforeRender() {
    this._rendered = false;
    for (const name in this._outputs) {
      this._outputReferences[name] = 0;
    }
  }

  afterRender() {
    const renderGraph = this._renderGraph!;
    // Put back all the textures to pool
    for (const name in this._outputs) {
      if (this._outputReferences[name] > 0) {
        const outputInfo = this._compositeNode.outputs![name];
        if (outputInfo.keepLastFrame) {
          if (this._prevOutputTextures[name]) {
            renderGraph.releaseTexture(this._prevOutputTextures[name]);
          }
          this._prevOutputTextures[name] = this._outputTextures[name];
        } else {
          renderGraph.releaseTexture(this._outputTextures[name]);
        }
      }
    }
  }

  // TODO Should avoid accessing the composite node too much
  private _getOutputInfo(outputName: string) {
    const output = this._compositeNode.outputs![outputName];
    if ((output as GroupOutput).groupOutput) {
      return (output as GroupOutput).groupOutput;
    }
    return output;
  }
}

export default RenderGraphNode;

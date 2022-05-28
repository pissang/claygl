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
  prevFrame?: boolean;
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

  private _needsKeepPrevFrame: Record<string, boolean> = {};
  private _outputRefCount: Record<string, number> = {};
  private _prevOutputRefCount: Record<string, number> = {};

  private _compositeNode: CompositeNode;
  private _renderGraph: RenderGraph;

  // Cached texture params.
  private _textureParams: Record<string, TexturePoolParameters> = {};

  // A flag to avoid infinite loop when having a self-pointing node.
  private _inLoop = false;

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
      width != null && (params.width = width);
      height != null && (params.height = height);
      // Use width/height from renderer by default
      params.width = params.width || renderer.getWidth();
      params.height = params.height || renderer.getHeight();

      if (scale != null) {
        params.width *= scale;
        params.height *= scale;
      }

      textureParams[outputName] = params;
    }
    return textureParams[outputName];
  }

  /**
   * Find the most large input texture to inherit.
   */
  private _deriveTextureParams(renderer: Renderer) {
    if (this._inLoop) {
      return;
    }
    this._inLoop = true;
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
    this._inLoop = false;
    return mostProbablyParams;
  }

  getOutputTexture(
    renderer: Renderer,
    outputPin: string,
    usePrevFrame?: boolean
  ): Texture2D | undefined {
    const outputInfo = this._compositeNode.outputs![outputPin];
    const prevOutputTextures = this._prevOutputTextures;
    const outputTextures = this._outputTextures;
    if (!outputInfo) {
      return;
    }

    if (usePrevFrame) {
      return prevOutputTextures[outputPin];
    }

    if (this._rendering) {
      throw new Error('Circular reference exists.');
    }

    if (!this._rendered) {
      // Update for all outputs. this.outputs only inlcude that is linked.
      keys(this._compositeNode.outputs).forEach((outputName) => {
        this.getTextureParams(outputName, renderer);
      });

      this.render(renderer, undefined);
    }

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
    const texturePool = renderGraph.getTexturePool();

    const inputTextures: Record<string, Texture> = {};
    inputNames.forEach((inputName) => {
      const link = inputLinks[inputName];
      const texture = link.node.getOutputTexture(renderer, link.pin, link.prevFrame);
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
      const texture = texturePool.allocate(parameters);
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
      link.node.outputLinkReleased(link, inputTextures[inputName]);
    });

    // Release textures that are not linked
    outputNames.forEach((outputName) => {
      const texture = outputTextures![outputName] as Texture2D;
      if (!outputLinks[outputName].length) {
        texturePool.release(texture);
      }
    });

    this._rendering = false;
    this._rendered = true;
  }

  addLinkFrom(
    inputPinName: string,
    fromNode: RenderGraphNode,
    outputPinName: string,
    usePrevFrame: boolean | undefined
  ) {
    // The relationship from output pin to input pin is one-on-multiple
    this._inputs[inputPinName] = {
      node: fromNode,
      pin: outputPinName,
      prevFrame: usePrevFrame
    };
    const outputLinks = fromNode._outputs;
    if (!outputLinks[outputPinName]) {
      outputLinks[outputPinName] = [];
    }
    outputLinks[outputPinName].push({
      node: this,
      pin: inputPinName,
      prevFrame: usePrevFrame
    });

    const refCount = usePrevFrame ? this._prevOutputRefCount : this._outputRefCount;
    refCount[outputPinName] = refCount[outputPinName] || 0;
    refCount[outputPinName]++;
    if (usePrevFrame) {
      this._needsKeepPrevFrame[outputPinName] = true;
    }
  }

  beforeUpdate() {
    const rawOutputs = this._compositeNode.outputs!;
    this._inputs = {};
    this._needsKeepPrevFrame = {};
    this._outputRefCount = {};
    this._prevOutputRefCount = {};
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

  beforeRender() {
    this._rendered = false;
    this._outputTextures = {};
  }

  afterRender() {
    const texturePool = this._renderGraph!.getTexturePool();
    // Put back all the textures to pool
    keys(this._outputs).forEach((outputName) => {
      const outputTexture = this._outputTextures[outputName];
      if (this._needsKeepPrevFrame[outputName]) {
        this._prevOutputTextures[outputName] = outputTexture;
      } else {
        texturePool.release(outputTexture);
      }
    });
  }

  outputLinkReleased(link: RenderGraphNodeLink, texture: Texture) {
    const outputName = link.pin;
    const texturePool = this._renderGraph.getTexturePool();
    const refCount = link.prevFrame ? this._prevOutputRefCount : this._outputRefCount;
    refCount[outputName]--;
    if (refCount[outputName] <= 0) {
      if (link.prevFrame || !this._needsKeepPrevFrame[outputName]) {
        texturePool.release(texture as Texture2D);
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

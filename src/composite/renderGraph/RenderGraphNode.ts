import {
  COLOR_ATTACHMENT0,
  HALF_FLOAT,
  UNSIGNED_BYTE,
  UNSIGNED_INT_24_8
} from '../../core/constants';
import { assign, isFunction, keys, optional } from '../../core/util';
import type FrameBuffer from '../../FrameBuffer';
import type Renderer from '../../Renderer';
import type Texture from '../../Texture';
import Texture2D from '../../Texture2D';
import CompositeNode from '../CompositeNode';
import FilterCompositeNode from '../FilterNode';
import { GroupOutput } from '../GroupNode';
import { TexturePoolParameters, texturePropList } from '../TexturePool';
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

  // Textures will be persisted
  private _persistedTextures: Record<string, Texture2D> = {};

  private _needsKeepPrevFrame: Record<string, boolean> = {};

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
      const derivedParams = this._deriveTextureParams(renderer) || {};
      const outputInfo = this._getOutputInfo(outputName) || {};
      const width = isFunction(outputInfo.width) ? outputInfo.width(renderer) : outputInfo.width;
      const height = isFunction(outputInfo.height)
        ? outputInfo.height(renderer)
        : outputInfo.height;
      const params = {} as TexturePoolParameters;
      for (let i = 0; i < texturePropList.length; i++) {
        const propName = texturePropList[i];
        const val = optional((outputInfo as any)[propName], (derivedParams as any)[propName]);
        if (val != null) {
          (params as any)[propName] = val;
        }
      }
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

      params.width = Math.round(params.width);
      params.height = Math.round(params.height);

      // Not generate mipmap by default. It will cause huge performance drop.
      if (params.useMipmap == null) {
        params.useMipmap = false;
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
    let mostProbablyParams: Partial<TexturePoolParameters> | undefined;
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
    const result = mostProbablyParams && assign({}, mostProbablyParams);
    if (result) {
      // TODO
      if (result.internalFormat) {
        // Ignore internalFormat and format
        delete result.internalFormat;
      }
      if (result.format) {
        delete result.format;
      }
      if (
        // Not derive type like UNSIGNED_INT_24_8 that will be used in the depth texture.
        // TODO may be confusing?
        result.type &&
        result.type !== UNSIGNED_BYTE &&
        result.type !== HALF_FLOAT &&
        result.type !== UNSIGNED_INT_24_8
      ) {
        delete result.type;
      }
    }
    return result;
  }

  getOutputTexture(
    renderer: Renderer,
    outputPin: string,
    usePrevFrame?: boolean
  ): Texture2D | undefined {
    const outputInfo = this._getOutputInfo(outputPin);
    const prevOutputTextures = this._prevOutputTextures;
    const outputTextures = this._outputTextures;
    const texturePool = this._renderGraph.getTexturePool();
    if (!outputInfo) {
      return;
    }

    if (usePrevFrame) {
      const texture = prevOutputTextures[outputPin];
      texture && texturePool.useTexture(texture);
      return texture;
    }

    if (this._rendering) {
      throw new Error('Circular reference exists.');
    }

    // Use before render.
    const texture = outputTextures[outputPin];
    texture && texturePool.useTexture(texture);

    if (!this._rendered) {
      // Update for all outputs. this.outputs only inlcude that is linked.
      keys(this._compositeNode.outputs).forEach((outputName) => {
        this.getTextureParams(outputName, renderer);
      });

      this.render(renderer, undefined);

      keys(outputTextures).forEach((outputName) => {
        if (this._needsKeepPrevFrame[outputName]) {
          texturePool.useTexture(outputTextures[outputName]);
        }
      });

      this._rendered = true;
    }

    return texture;
  }

  hasOutput() {
    const outputs = this._outputs;
    return keys(outputs).find((key) => outputs[key] && outputs[key].length > 0) != null;
  }

  isEndNode() {
    const compositeNode = this._compositeNode;
    return compositeNode.renderToScreen;
    // return compositeNode.renderToScreen || !this.hasOutput();
  }

  render(renderer: Renderer, finalFrameBuffer?: FrameBuffer) {
    this._rendering = true;

    try {
      this._doRender(renderer, finalFrameBuffer);
    } finally {
      this._rendering = false;
      this._rendered = true;
    }
  }

  private _doRender(renderer: Renderer, finalFrameBuffer?: FrameBuffer) {
    const renderGraph = this._renderGraph;
    const inputLinks = this._inputs || {};
    const inputNames = keys(inputLinks);
    const outputNames = this._getOutputNames();
    const compositeNode = this._compositeNode;
    const sharedFrameBuffer =
      this.hasOutput() && !this.isEndNode()
        ? renderGraph.getFrameBuffer(compositeNode.depthBuffer || false)
        : undefined;
    const texturePool = renderGraph.getTexturePool();

    this._updateOutputTextures(renderer);
    const outputTextures = this._outputTextures;

    const inputTextures: Record<string, Texture> = {};
    inputNames.forEach((inputName) => {
      const link = inputLinks[inputName];
      const texture = link.node.getOutputTexture(renderer, link.pin, link.prevFrame);
      if (texture) {
        inputTextures[inputName] = texture;
      }
    });

    // Clear before rebind.
    sharedFrameBuffer && sharedFrameBuffer.clearTextures();

    console.log(`%c${this._compositeNode.name}`, 'color: gray;');
    console.log(
      'input',
      Object.keys(inputTextures).map((key) => inputTextures[key].id + ',' + key)
    );
    if (outputTextures) {
      console.log(
        'outputTexturesMRT',
        Object.keys(outputTextures).map((key) => outputTextures[key].id + ',' + key)
      );
    }

    // The outputTextures follows the order of assigning node.outputs. It's easily to get wrong with the order of frag.outputs.
    // Align them
    if (sharedFrameBuffer) {
      (compositeNode instanceof FilterCompositeNode && outputNames.length > 0
        ? compositeNode.pass.material.shader.outputs
        : outputNames
      ).forEach((outputName, idx) => {
        const outputInfo = this._getOutputInfo(outputName);
        if (!outputInfo) {
          // When outputName is from compositeNode.pass.material.shader.outputs
          return;
        }
        const texture = outputTextures[outputName];
        const attachment = outputInfo.attachment || COLOR_ATTACHMENT0 + idx;
        // FIXME attachment changes in different nodes
        sharedFrameBuffer.attach(texture, +attachment);
      });
    }

    // TODO. Getting viewport in the beforeRender hook will be wrong because frame buffer is not bound yet.
    compositeNode.beforeRender &&
      compositeNode.beforeRender(renderer, inputTextures, outputTextures);
    compositeNode.render(
      renderer,
      inputTextures,
      outputTextures,
      sharedFrameBuffer || finalFrameBuffer
    );

    // Release after use.
    keys(inputTextures).forEach((inputName) => {
      const texture = inputTextures[inputName];
      texturePool.releaseTexture(texture as Texture2D);
    });

    compositeNode.afterRender && compositeNode.afterRender();
  }

  private _getOutputNames() {
    const outputLinks = this._outputs || {};
    const outputNames = !this.isEndNode() ? keys(outputLinks) : [];
    return outputNames;
  }

  private _updateOutputTextures(renderer: Renderer) {
    const texturePool = this._renderGraph.getTexturePool();
    const outputNames = this._getOutputNames();
    const outputTextures: Record<string, Texture2D> = {};
    outputNames.forEach((outputName, idx) => {
      const outputInfo = this._getOutputInfo(outputName);
      const parameters = this.getTextureParams(outputName, renderer);
      const persistedTextures = this._persistedTextures;
      let texture: Texture2D;
      if (!outputInfo.persist) {
        texture = texturePool.allocate(parameters);
      } else {
        texture =
          persistedTextures[outputName] || (persistedTextures[outputName] = new Texture2D());
        assign(texture, parameters);
      }

      outputTextures[outputName] = texture;
    });
    this._outputTextures = outputTextures;
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

    if (usePrevFrame) {
      this._needsKeepPrevFrame[outputPinName] = true;
    }
  }

  beforeUpdate() {
    const rawOutputs = this._compositeNode.outputs!;
    this._inputs = {};
    this._needsKeepPrevFrame = {};
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
  }
  afterRender() {
    const texturePool = this._renderGraph.getTexturePool();
    // Put back all the textures to pool
    keys(this._outputs).forEach((outputName) => {
      const outputTexture = this._outputTextures[outputName];
      // Prev output texture has already been used.
      if (this._prevOutputTextures[outputName]) {
        texturePool.releaseTexture(this._prevOutputTextures[outputName]);
      }
      if (this._needsKeepPrevFrame[outputName]) {
        this._prevOutputTextures[outputName] = outputTexture;
      }
    });
  }

  // TODO Should avoid accessing the composite node too much
  private _getOutputInfo(outputName: string) {
    const output = this._compositeNode.outputs![outputName];
    return (output as GroupOutput).groupOutput || output;
  }
}

export default RenderGraphNode;

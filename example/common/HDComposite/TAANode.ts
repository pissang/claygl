import { GroupCompositeNode, FilterCompositeNode, Renderer, Camera, Texture } from 'claygl';
import { outputTextureFragment } from 'claygl/shaders';
import TAAFragment from './TAA.glsl';
import TAACameraJitter from './TAACameraJitter';

class TAACompositeNode extends GroupCompositeNode<
  'gBufferTexture2' | 'gBufferTexture5' | 'colorTex',
  'color'
> {
  readonly name = 'TAA';

  private _taaNode = new FilterCompositeNode(TAAFragment, 'TAABlend');
  private _outputNode = new FilterCompositeNode(outputTextureFragment, 'TAAOutput');
  private _camera: Camera;
  private _TAAJitter: TAACameraJitter;

  constructor(camera: Camera, taaJitter: TAACameraJitter) {
    super();

    this._taaNode.inputs = {
      prevTex: {
        node: this._taaNode,
        prevFrame: true,
        output: 'color'
      },
      currTex: this.getGroupInput('colorTex'),
      depthTex: this.getGroupInput('gBufferTexture2'),
      velocityTex: this.getGroupInput('gBufferTexture5')
    };

    this._outputNode.inputs = {
      colorTex: this._taaNode
    };
    this._outputNode.outputs = {
      color: this.getGroupOutput('color')
    };

    this._outputNode.material.blend = function (gl) {
      gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    };

    this.outputs = {
      color: {}
    };

    this._camera = camera;

    this.addNode(this._taaNode, this._outputNode);

    this._TAAJitter = taaJitter;

    this._taaNode.beforeRender = (renderer, inputTextures) => {
      if (!(inputTextures.depthTex && inputTextures.velocityTex)) {
        // Force to set still
        this._taaNode.material.set('still', 1);
      }
    };
  }

  prepare(renderer: Renderer): void {
    const frame = this._TAAJitter.getFrame();
    this._taaNode.material.set('frame', frame);
  }

  setDynamic(isDynamic: boolean) {
    this._taaNode.material.set('still', +!isDynamic);
  }
}

export default TAACompositeNode;

import { GroupCompositeNode, FilterCompositeNode, Renderer, Camera } from 'claygl';
import { outputTextureFragment } from 'claygl/shaders';
import TAAFragment from './TAA.glsl';
import TAACameraJitter from './TAACameraJitter';

class TAACompositeNode extends GroupCompositeNode<
  'gBufferTexture2' | 'gBufferTexture3' | 'colorTexture',
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
      currTex: this.getGroupInput('colorTexture'),
      velocityTex: this.getGroupInput('gBufferTexture3'),
      depthTex: this.getGroupInput('gBufferTexture2')
    };

    this._outputNode.inputs = {
      texture: this._taaNode
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

import { GroupCompositeNode, FilterCompositeNode, Renderer, Camera } from 'claygl';
import { outputTextureFragment } from 'claygl/shaders';
import TAAFragment from './TAA.glsl';

class TAACompositeNode extends GroupCompositeNode<
  'gBufferTexture2' | 'gBufferTexture3' | 'colorTexture',
  'color'
> {
  readonly name = 'TAA';

  private _taaNode = new FilterCompositeNode(TAAFragment, 'TAABlend');
  private _outputNode = new FilterCompositeNode(outputTextureFragment, 'TAAOutput');
  private _camera: Camera;

  constructor(camera: Camera) {
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

    this._camera = camera;

    this.addNode(this._taaNode, this._outputNode);
  }

  prepare(renderer: Renderer): void {
    this._taaNode.material.set('projection', this._camera.projectionMatrix.array);
  }

  setStill(isStill: boolean) {
    this._taaNode.material.set('still', +isStill || 0);
  }
}

export default TAACompositeNode;

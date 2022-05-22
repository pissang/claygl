import {
  Texture2D,
  Vector3,
  constants,
  GroupCompositeNode,
  FilterCompositeNode,
  PerspectiveCamera,
  Renderer,
  Matrix4
} from 'claygl';
import { SSRBlurFragment, SSRTraceFragment } from './SSR.glsl';

interface SSRCompositeNodeOpts {
  RGBM?: boolean;
  downscale?: number;
  maxRayDistance?: number;
  pixelStride?: number;
  pixelStrideZCutoff?: number;
  screenEdgeFadeStart?: number;
  eyeFadeStart?: number;
  eyeFadeEnd?: number;
  minGlossiness?: number;
  zThicknessThreshold?: number;
}
class SSRCompositeNode extends GroupCompositeNode<
  'gBufferTexture1' | 'gBufferTexture2' | 'colorTexture',
  'color'
> {
  private _ssrNode = new FilterCompositeNode<typeof SSRTraceFragment, 'color'>(SSRTraceFragment);
  private _blurHNode = new FilterCompositeNode<typeof SSRBlurFragment, 'color'>(SSRBlurFragment);
  private _blurVNode = new FilterCompositeNode<typeof SSRBlurFragment, 'color'>(SSRBlurFragment);
  private _camera: PerspectiveCamera;
  constructor(camera: PerspectiveCamera, opts?: SSRCompositeNodeOpts) {
    super();

    const ssrNode = this._ssrNode;
    const blurHNode = this._blurHNode;
    const blurVNode = this._blurVNode;
    this._camera = camera;

    blurVNode.material.set('blurDir', 1);

    const defaultOpts: Required<SSRCompositeNodeOpts> = {
      RGBM: false,
      downscale: 2,
      pixelStride: 16,
      pixelStrideZCutoff: 10,
      maxRayDistance: 4,
      screenEdgeFadeStart: 0.9,
      eyeFadeStart: 0.4,
      eyeFadeEnd: 0.8,
      minGlossiness: 0.2,
      zThicknessThreshold: 0.1
    };

    opts = Object.assign({}, defaultOpts, opts);

    ssrNode.pass!.clearColor = [0, 0, 0, 0];
    ssrNode.inputs = {
      gBufferTexture1: this.getGroupInput('gBufferTexture1'),
      gBufferTexture2: this.getGroupInput('gBufferTexture2'),
      colorTex: this.getGroupInput('colorTexture')
    };
    ssrNode.outputs = {
      color: {
        scale: 1 / opts.downscale!
      }
    };

    blurHNode.inputs = {
      gBufferTexture1: this.getGroupInput('gBufferTexture1'),
      colorTex: ssrNode
    };
    blurHNode.outputs = {
      color: {}
    };
    blurVNode.inputs = {
      gBufferTexture1: this.getGroupInput('gBufferTexture1'),
      colorTex: blurHNode
    };
    blurVNode.outputs = {
      color: this.getGroupOutput('color')
    };

    this.addNode(ssrNode, blurHNode, blurVNode);

    this.setParams(opts || {});
  }

  setParams(opts: SSRCompositeNodeOpts) {
    (Object.keys(opts || {}) as (keyof SSRCompositeNodeOpts)[]).forEach((key) => {
      if (key === 'RGBM') {
        [this._ssrNode, this._blurHNode, this._blurVNode].forEach((node) => {
          node.material[opts.RGBM ? 'define' : 'undefine']('fragment', 'RGBM');
        });
      } else if (key === 'downscale') {
        this._ssrNode.outputs!.color.scale = 1 / opts[key]!;
      } else {
        this._ssrNode.material.set(key, opts[key]!);
      }
    });
  }

  prepare(renderer: Renderer): void {
    super.prepare(renderer);

    const viewInverseTranspose = new Matrix4();
    const camera = this._camera;
    const ssrNode = this._ssrNode;
    const blurHNode = this._blurHNode;
    const blurVNode = this._blurVNode;
    Matrix4.transpose(viewInverseTranspose, camera.worldTransform);

    ssrNode.material.set('projection', camera.projectionMatrix.array);
    ssrNode.material.set('projectionInv', camera.invProjectionMatrix.array);
    ssrNode.material.set('viewInverseTranspose', viewInverseTranspose.array);
    ssrNode.material.set('nearZ', camera.near);

    [blurHNode, blurVNode].forEach((node) => {
      node.beforeRender = (renderer, inputTextures) => {
        blurHNode.material.set('textureSize', [
          inputTextures.colorTex.width,
          inputTextures.colorTex.height
        ]);
      };
    });
  }
}

export default SSRCompositeNode;

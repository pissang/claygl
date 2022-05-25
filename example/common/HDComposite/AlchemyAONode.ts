import {
  Texture2D,
  Vector2,
  GroupCompositeNode,
  FilterCompositeNode,
  PerspectiveCamera,
  Renderer,
  Matrix4
} from 'claygl';
import { alchemyAOBlurFragment, alchemyAOEstimateFragment } from './alchemy.glsl';

function generateKernel(size: number) {
  var kernel = new Float32Array(size * 2);
  var v2 = new Vector2();

  // Hardcoded 7 REPEAT
  // repeat should not be dividable by kernel size
  var repeat = 7;
  // Spiral sample
  for (var i = 0; i < size; i++) {
    var angle = ((i + 0.5) / size) * Math.PI * 2 * repeat;
    v2.set(((i + 0.5) / size) * Math.cos(angle), ((i + 0.5) / size) * Math.sin(angle));
    // v2.set(Math.random() * 2 - 1, Math.random() * 2 - 1)
    //     .normalize().scale(Math.random());
    kernel[i * 2] = v2.x;
    kernel[i * 2 + 1] = v2.y;
  }

  return kernel;
}

function generateNoiseData(size: number) {
  var data = new Uint8Array(size * size * 4);
  var n = 0;
  var v2 = new Vector2();
  for (var i = 0; i < size; i++) {
    for (var j = 0; j < size; j++) {
      v2.set(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      data[n++] = (v2.x * 0.5 + 0.5) * 255;
      data[n++] = (v2.y * 0.5 + 0.5) * 255;
      data[n++] = 0;
      data[n++] = 255;
    }
  }
  return data;
}

function generateNoiseTexture(size: number) {
  return new Texture2D({
    pixels: generateNoiseData(size),
    width: size,
    height: size
  });
}

interface AlchemyAOCompositeNodeOpts {
  blurSize?: number;
  kernelSize?: number;
  radius?: number;
  power?: number;
  noiseSize?: number;
}

class AlchemyAOCompositeNode extends GroupCompositeNode<
  'gBufferTexture1' | 'gBufferTexture2',
  'color'
> {
  name = 'AlchemyAO';
  private _estimateNode = new FilterCompositeNode<typeof alchemyAOEstimateFragment, 'color'>(
    alchemyAOEstimateFragment,
    'AlchemyAO Estimate'
  );
  private _blurHNode = new FilterCompositeNode<typeof alchemyAOBlurFragment, 'color'>(
    alchemyAOBlurFragment,
    'AlchemyAO BlurH'
  );
  private _blurVNode = new FilterCompositeNode<typeof alchemyAOBlurFragment, 'color'>(
    alchemyAOBlurFragment,
    'AlchemyAO BlurV'
  );
  private _camera: PerspectiveCamera;

  constructor(camera: PerspectiveCamera, opts?: AlchemyAOCompositeNodeOpts) {
    super();
    this._camera = camera;

    this._estimateNode.inputs = {
      gBufferTexture1: this.getGroupInput('gBufferTexture1'),
      gBufferTexture2: this.getGroupInput('gBufferTexture2')
    };
    this._estimateNode.outputs = {
      color: {}
    };
    this._estimateNode.pass.clearColor = [0, 0, 0, 0];
    this._blurHNode.inputs = {
      colorTex: this._estimateNode,
      depthTex: this.getGroupInput('gBufferTexture2')
    };
    this._blurHNode.outputs = {
      color: {}
    };
    this._blurVNode.inputs = {
      colorTex: this._blurHNode,
      depthTex: this.getGroupInput('gBufferTexture2')
    };
    this._blurVNode.outputs = {
      color: this.getGroupOutput('color')
    };
    this._blurVNode.material.set('blurDir', 1);

    this.outputs = {
      color: {}
    };

    this.addNode(this._estimateNode, this._blurHNode, this._blurVNode);

    const defaultOpts: Required<AlchemyAOCompositeNodeOpts> = {
      kernelSize: 12,
      blurSize: 1,
      noiseSize: 4,
      radius: 1.5,
      power: 1
    };
    opts = Object.assign({}, defaultOpts, opts);
    this.setParams(opts);
  }

  setParams(params: AlchemyAOCompositeNodeOpts) {
    (Object.keys(params) as (keyof AlchemyAOCompositeNodeOpts)[]).forEach((key) => {
      const val = params[key]!;
      if (key === 'kernelSize') {
        this.setKernelSize(val);
      } else if (key === 'noiseSize') {
        this.setNoiseSize(val);
      } else if (key === 'blurSize') {
        this._blurHNode.material.set('blurSize', val);
        this._blurVNode.material.set('blurSize', val);
      } else {
        this._estimateNode.material.set(key, val);
      }
    });
  }

  setKernelSize(size: number) {
    this._estimateNode.material.define('fragment', 'KERNEL_SIZE', size);
    var kernel = generateKernel(size);
    this._estimateNode.material.set('kernel', kernel);
  }
  setNoiseSize(size: number) {
    let texture = this._estimateNode.material.get('noiseTex');
    if (!texture) {
      texture = generateNoiseTexture(size);
      this._estimateNode.material.set('noiseTex', generateNoiseTexture(size));
    } else {
      texture.pixels = generateNoiseData(size);
      texture.width = texture.height = size;
      texture.dirty();
    }

    this._estimateNode.material.set('noiseTexSize', [size, size]);
  }

  prepare(renderer: Renderer): void {
    const estimateNode = this._estimateNode;
    const camera = this._camera;

    const viewInverseTranspose = new Matrix4();
    Matrix4.transpose(viewInverseTranspose, camera.worldTransform);
    estimateNode.material.set('projection', camera.projectionMatrix.array);
    estimateNode.material.set('projectionInv', camera.invProjectionMatrix.array);
    estimateNode.material.set('viewInverseTranspose', viewInverseTranspose.array);
  }
}

export default AlchemyAOCompositeNode;

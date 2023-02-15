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
import { SSAOBlurFragment, SSAOEstimateFragment } from './SSAO.glsl';
import TAACameraJitter from './TAACameraJitter';

function generateNoiseData(size: number) {
  const data = new Uint8Array(size * size * 4);
  const v3 = new Vector3();
  let n = 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      v3.set(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize();
      data[n++] = (v3.x * 0.5 + 0.5) * 255;
      data[n++] = (v3.y * 0.5 + 0.5) * 255;
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

function generateKernel(size: number) {
  const kernel = new Float32Array(size * 3);
  const v3 = new Vector3();
  for (let i = 0; i < size; i++) {
    v3.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random())
      .normalize()
      .scale(Math.random());
    kernel[i * 3] = v3.x;
    kernel[i * 3 + 1] = v3.y;
    kernel[i * 3 + 2] = v3.z;
  }
  return kernel;
}

interface SSAOCompositeNodeOpts {
  blurSize?: number;
  kernelSize?: number;
  radius?: number;
  power?: number;
  TAAJitter?: TAACameraJitter;
}

class SSAOCompositeNode extends GroupCompositeNode<'gBufferTex' | 'depthTex', 'color'> {
  private _estimateNode = new FilterCompositeNode<typeof SSAOEstimateFragment, 'color'>(
    SSAOEstimateFragment
  );
  private _blurNode = new FilterCompositeNode<typeof SSAOBlurFragment, 'color'>(SSAOBlurFragment);

  private _camera: PerspectiveCamera;

  private _kernels: Float32Array[] = [];
  private _TAAJitter?: TAACameraJitter;

  constructor(camera: PerspectiveCamera, opts?: SSAOCompositeNodeOpts) {
    super();
    this._camera = camera;

    this._estimateNode.inputs = {
      gBufferTex: this.getGroupInput('gBufferTex'),
      depthTex: this.getGroupInput('depthTex')
    };
    this._estimateNode.pass.clearColor = [0, 0, 0, 0];
    this._blurNode.inputs = {
      colorTex: this._estimateNode
    };
    this._blurNode.outputs = {
      color: this.getGroupOutput('color')
    };

    // Default output
    this.outputs = {
      color: {}
    };

    this.addNode(this._estimateNode, this._blurNode);

    opts = {
      kernelSize: 64,
      blurSize: 3,
      radius: 1.5,
      power: 2,
      ...opts
    };
    this._TAAJitter = opts!.TAAJitter;

    this.setKernelSize(opts!.kernelSize!);
    this.setNoiseSize(4);
    this.setEstimatePower(opts!.power!);
    this.setEstimateRadius(opts!.radius!);
    this.setBlurSize(opts!.blurSize!);
  }

  prepare(renderer: Renderer): void {
    const estimateMaterial = this._estimateNode.material;
    const camera = this._camera;

    const viewInverseTranspose = new Matrix4();
    Matrix4.transpose(viewInverseTranspose, camera.worldTransform);
    estimateMaterial.setUniforms({
      projection: camera.projectionMatrix.array,
      projectionInv: camera.invProjectionMatrix.array,
      viewInverseTranspose: viewInverseTranspose.array
    });

    if (this._TAAJitter) {
      const kernel = this._kernels[this._TAAJitter.getFrame() % this._kernels.length];
      estimateMaterial.set('kernel', kernel);
    }
  }

  setEstimateRadius(radius: number) {
    this._estimateNode.material.set('radius', radius);
  }

  setEstimatePower(power: number) {
    this._estimateNode.material.set('power', power);
  }

  setKernelSize(size: number) {
    const estimateMaterial = this._estimateNode.material;
    estimateMaterial.define('fragment', 'KERNEL_SIZE', size);
    if (this._TAAJitter) {
      this._kernels = [];
      for (let i = 0; i < this._TAAJitter.getSequenceFrames(); i++) {
        const kernel = generateKernel(size);
        this._kernels.push(kernel);
      }
    } else {
      estimateMaterial.set('kernel', generateKernel(size));
    }
  }

  setBlurSize(size: number) {
    this._blurNode.material.define('BLUR_SIZE', size);
  }

  setNoiseSize(size: number) {
    const estimateMaterial = this._estimateNode.material;
    let texture = estimateMaterial.get('noiseTex');
    if (!texture) {
      texture = generateNoiseTexture(size);
      estimateMaterial.set('noiseTex', generateNoiseTexture(size));
    } else {
      texture.pixels = generateNoiseData(size);
      texture.width = texture.height = size;
      texture.dirty();
    }

    estimateMaterial.set('noiseTexSize', [size, size]);
  }
}

export default SSAOCompositeNode;

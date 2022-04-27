import Mesh, { MeshOpts } from './Mesh';
import ClayCache from './core/Cache';
import BoundingBox from './math/BoundingBox';
import { optional } from './core/util';
import type ClayNode from './Node';
import type Renderer from './Renderer';
import type { AttributeSize, AttributeType, AttributeValue } from './GeometryBase';

const tmpBoundingBox = new BoundingBox();

export interface InstancedAttributeBuffer {
  type: AttributeType;
  symbol: string;
  divisor: number;
  size: number;
  buffer: WebGLBuffer;
}

interface InstancedAttribute {
  symbol: string;
  type: AttributeType;
  size: AttributeSize;
  divisor: number;
  value?: AttributeValue;
}

interface Instance {
  node: ClayNode;
}
interface InstancedMeshOpts extends MeshOpts {
  /**
   * Instances array. Each object in array must have node property
   * @example
   *  const node = new clay.Node()
   *  instancedMesh.instances.push({
   *      node: node
   *  });
   */
  instances: Instance[];
}

interface InstancedMesh extends InstancedMeshOpts {}
class InstancedMesh extends Mesh {
  instances: Instance[];
  instancedAttributes: Record<string, InstancedAttribute> = {};

  boundingBox?: BoundingBox;
  private _cache = new ClayCache();
  private _attributesSymbols: string[] = [];

  constructor(opts?: Partial<InstancedMeshOpts>) {
    opts = opts || {};
    super(opts);

    this.instances = optional(opts.instances, []);
    this.createInstancedAttribute('instanceMat1', 'float', 4, 1);
    this.createInstancedAttribute('instanceMat2', 'float', 4, 1);
    this.createInstancedAttribute('instanceMat3', 'float', 4, 1);
  }

  isInstancedMesh() {
    return true;
  }

  getInstanceCount() {
    return this.instances.length;
  }

  removeAttribute(symbol: string) {
    const idx = this._attributesSymbols.indexOf(symbol);
    if (idx >= 0) {
      this._attributesSymbols.splice(idx, 1);
    }
    delete this.instancedAttributes[symbol];
  }

  createInstancedAttribute(
    symbol: string,
    type: AttributeType,
    size: AttributeSize,
    divisor: number
  ) {
    if (this.instancedAttributes[symbol]) {
      return;
    }
    this.instancedAttributes[symbol] = {
      symbol: symbol,
      type: type,
      size: size,
      divisor: divisor == null ? 1 : divisor
    };

    this._attributesSymbols.push(symbol);
  }

  getInstancedAttributesBuffers(renderer: Renderer) {
    const cache = this._cache;

    cache.use(renderer.__uid__);

    const buffers: InstancedAttributeBuffer[] = cache.get('buffers') || [];

    if (cache.isDirty('dirty')) {
      const gl = renderer.gl;

      for (let i = 0; i < this._attributesSymbols.length; i++) {
        const attr = this.instancedAttributes[this._attributesSymbols[i]];

        let bufferObj = buffers[i];
        if (!bufferObj) {
          bufferObj = {
            buffer: gl.createBuffer()
          } as InstancedAttributeBuffer;
          buffers[i] = bufferObj;
        }
        bufferObj.symbol = attr.symbol;
        bufferObj.divisor = attr.divisor;
        bufferObj.size = attr.size;
        bufferObj.type = attr.type;

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.buffer);
        // TODO Type
        gl.bufferData(gl.ARRAY_BUFFER, attr.value as any as ArrayBufferView, gl.DYNAMIC_DRAW);
      }

      cache.fresh('dirty');

      cache.put('buffers', buffers);
    }

    return buffers;
  }

  update() {
    Mesh.prototype.update.call(this);

    const arraySize = this.getInstanceCount() * 4;
    const instancedAttributes = this.instancedAttributes;

    let instanceMat1 = instancedAttributes.instanceMat1.value!;
    let instanceMat2 = instancedAttributes.instanceMat2.value!;
    let instanceMat3 = instancedAttributes.instanceMat3.value!;
    if (!instanceMat1 || instanceMat1.length !== arraySize) {
      instanceMat1 = instancedAttributes.instanceMat1.value = new Float32Array(arraySize);
      instanceMat2 = instancedAttributes.instanceMat2.value = new Float32Array(arraySize);
      instanceMat3 = instancedAttributes.instanceMat3.value = new Float32Array(arraySize);
    }

    const sourceBoundingBox =
      (this.skeleton && this.skeleton.boundingBox) || this.geometry.boundingBox;
    const needUpdateBoundingBox =
      sourceBoundingBox != null && (this.castShadow || this.frustumCulling);
    if (needUpdateBoundingBox && this.instances.length > 0) {
      this.boundingBox = this.boundingBox || new BoundingBox();

      this.boundingBox.min.set(Infinity, Infinity, Infinity);
      this.boundingBox.max.set(-Infinity, -Infinity, -Infinity);
    } else {
      this.boundingBox = undefined;
    }

    for (let i = 0; i < this.instances.length; i++) {
      const instance = this.instances[i];
      const node = instance.node;

      if (!node) {
        throw new Error('Instance must include node');
      }
      const transform = node.worldTransform.array;
      const i4 = i * 4;
      instanceMat1[i4] = transform[0];
      instanceMat1[i4 + 1] = transform[1];
      instanceMat1[i4 + 2] = transform[2];
      instanceMat1[i4 + 3] = transform[12];

      instanceMat2[i4] = transform[4];
      instanceMat2[i4 + 1] = transform[5];
      instanceMat2[i4 + 2] = transform[6];
      instanceMat2[i4 + 3] = transform[13];

      instanceMat3[i4] = transform[8];
      instanceMat3[i4 + 1] = transform[9];
      instanceMat3[i4 + 2] = transform[10];
      instanceMat3[i4 + 3] = transform[14];

      // Update bounding box
      if (needUpdateBoundingBox) {
        tmpBoundingBox.transformFrom(sourceBoundingBox, node.worldTransform);
        this.boundingBox!.union(tmpBoundingBox);
      }
    }

    this._cache.dirty('dirty');
  }
}

export default InstancedMesh;

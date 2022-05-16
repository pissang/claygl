import Mesh, { MeshOpts } from './Mesh';
import BoundingBox from './math/BoundingBox';
import { optional } from './core/util';
import type ClayNode from './Node';
import type Renderer from './Renderer';
import type { AttributeSize, AttributeType, AttributeValue } from './GeometryBase';
import Material from './Material';
import Geometry from './Geometry';

const tmpBoundingBox = new BoundingBox();

interface InstancedAttribute {
  name: string;
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

interface InstancedMesh<T extends Material = Material> extends InstancedMeshOpts {}
class InstancedMesh<T extends Material = Material> extends Mesh<T> {
  instances: Instance[];
  instancedAttributes: Record<string, InstancedAttribute> = {};

  boundingBox?: BoundingBox;
  private _attributesNames: string[] = [];

  __dirty: boolean = true;

  constructor(geometry: Geometry, material: T, opts?: Partial<InstancedMeshOpts>) {
    super(geometry, material, opts);

    this.instances = optional(opts && opts.instances, []);
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

  removeAttribute(name: string) {
    const idx = this._attributesNames.indexOf(name);
    if (idx >= 0) {
      this._attributesNames.splice(idx, 1);
    }
    delete this.instancedAttributes[name];
  }

  createInstancedAttribute(
    name: string,
    type: AttributeType,
    size: AttributeSize,
    divisor: number
  ) {
    if (this.instancedAttributes[name]) {
      return;
    }
    this.instancedAttributes[name] = {
      name,
      type,
      size,
      divisor: divisor == null ? 1 : divisor
    };

    this._attributesNames.push(name);
  }

  getInstancedAttributes() {
    return this._attributesNames;
  }

  update() {
    super.update();

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

    this.__dirty = true;
  }
}

export default InstancedMesh;

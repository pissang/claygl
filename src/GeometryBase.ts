import Ray from './math/Ray';
import { genGUID, keys } from './core/util';
import { Vec3Array } from './glmatrix/common';

import type Renderer from './Renderer';
import type Camera from './Camera';
import type Renderable from './Renderable';
import type BoundingBox from './math/BoundingBox';
import type { Intersection } from './picking/rayPicking';
import { AttributeSemantic } from './Shader';

export type AttributeType = 'byte' | 'ubyte' | 'short' | 'ushort' | 'float';
export type AttributeSize = 1 | 2 | 3 | 4;
export type AttributeValue = {
  [key: number]: number;
  readonly length: number;
};

function getArrayCtorByType(type: AttributeType) {
  return (
    {
      byte: Int8Array,
      ubyte: Uint8Array,
      short: Int16Array,
      ushort: Uint16Array,
      int: Uint32Array,
      float: Float32Array
    }[type] || Float32Array
  );
}

function is2DArray(array: ArrayLike<number> | number[][]): array is number[][] {
  return !!(array[0] && (array as number[][])[0].length);
}

type AttributeNumberGetter = (idx: number) => number;
type AttributeArrayGetter = (idx: number, out?: number[]) => number[];
type AttributeNumberSetter = (idx: number, value: number) => number;
type AttributeArraySetter = (idx: number, value: number[]) => number[];
/**
 * GeometryBase attribute
 */
export class GeometryAttribute<TSize extends AttributeSize = AttributeSize> {
  /**
   * Attribute name
   * @type {string}
   */
  readonly name: string;
  /**
   * Attribute type
   * Possible values:
   *  + `'byte'`
   *  + `'ubyte'`
   *  + `'short'`
   *  + `'ushort'`
   *  + `'float'` Most commonly used.
   * @type {string}
   */
  readonly type: AttributeType;
  /**
   * Size of attribute component. 1 - 4.
   * @type {number}
   */
  readonly size: TSize;
  /**
   * Semantic of this attribute.
   * Possible values:
   *  + `'POSITION'`
   *  + `'NORMAL'`
   *  + `'BINORMAL'`
   *  + `'TANGENT'`
   *  + `'TEXCOORD'`
   *  + `'TEXCOORD_0'`
   *  + `'TEXCOORD_1'`
   *  + `'COLOR'`
   *  + `'JOINT'`
   *  + `'WEIGHT'`
   *
   * In shader, attribute with same semantic will be automatically mapped. For example:
   * ```glsl
   * attribute vec3 pos: POSITION
   * ```
   * will use the attribute value with semantic POSITION in geometry, no matter what name it used.
   */
  semantic?: AttributeSemantic;

  /**
   * Value of the attribute.
   */
  value?: AttributeValue;

  get: TSize extends 1 ? AttributeNumberGetter : AttributeArrayGetter;
  set: TSize extends 1 ? AttributeNumberSetter : AttributeArraySetter;
  copy: (source: number, target: number) => void;
  constructor(name: string, type: AttributeType, size: TSize, semantic?: AttributeSemantic) {
    this.name = name;
    this.type = type;
    this.size = size;
    this.semantic = semantic;

    // Init getter setter
    switch (this.size) {
      case 1:
        this.get = function (this: GeometryAttribute<TSize>, idx: number) {
          return this.value![idx];
        } as any; // TODO
        this.set = function (this: GeometryAttribute<TSize>, idx: number, value: number) {
          this.value![idx] = value;
        } as any;
        // Copy from source to target
        this.copy = function (target, source) {
          this.value![target] = this.value![source];
        };
        break;
      default:
        this.get = function (this: GeometryAttribute<TSize>, idx: number, out: number[]) {
          const arr = this.value!;
          idx *= size;
          for (let i = 0; i < size; i++) {
            out[i] = arr[idx + i];
          }
          return out;
        } as any;
        this.set = function (this: GeometryAttribute<TSize>, idx: number, val: number[]) {
          const arr = this.value!;
          idx *= size;
          for (let i = 0; i < size; i++) {
            arr[idx + i] = val[i];
          }
        } as any;
        this.copy = function (target, source) {
          const arr = this.value!;
          source *= size;
          target *= size;
          for (let i = 0; i < size; i++) {
            arr[target + i] = arr[source + i];
          }
        };
        break;
    }
  }
  /**
   * Initialize attribute with given vertex count
   * @param {number} nVertex
   */
  init(nVertex: number) {
    if (!this.value || this.value.length !== nVertex * this.size) {
      const ArrayConstructor = getArrayCtorByType(this.type);
      this.value = new ArrayConstructor(nVertex * this.size);
    }
  }

  /**
   * Initialize attribute with given array. Which can be 1 dimensional or 2 dimensional
   * @param {Array} array
   * @example
   *  geometry.getAttribute('position').fromArray(
   *      [-1, 0, 0, 1, 0, 0, 0, 1, 0]
   *  );
   *  geometry.getAttribute('position').fromArray(
   *      [ [-1, 0, 0], [1, 0, 0], [0, 1, 0] ]
   *  );
   */
  fromArray(array: ArrayLike<number> | number[][]) {
    const ArrayConstructor = getArrayCtorByType(this.type);
    let value;
    // Convert 2d array to flat
    if (is2DArray(array)) {
      let n = 0;
      const size = this.size;
      value = new ArrayConstructor(array.length * size);
      for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < size; j++) {
          value[n++] = array[i][j];
        }
      }
    } else {
      value = new ArrayConstructor(array);
    }
    this.value = value;
  }

  clone(copyValue?: boolean) {
    const ret = new GeometryAttribute(this.name, this.type, this.size, this.semantic);
    // FIXME
    if (copyValue) {
      console.warn('todo');
    }
    return ret;
  }
}

export interface GeometryBaseOpts {
  name: string;
  /**
   * Indices of geometry.
   */
  indices?: Uint16Array | Uint32Array;

  /**
   * Is vertices data dynamically updated.
   * Attributes value can't be changed after first render if dyanmic is false.
   */
  dynamic: boolean;
}

interface GeometryBase extends GeometryBaseOpts {}
class GeometryBase {
  readonly uid = genGUID();

  // TODO put in GeometryBase?
  boundingBox?: BoundingBox;
  /**
   * Attributes of geometry.
   */
  attributes: Record<string, GeometryAttribute<AttributeSize>> = {};
  /**
   * Main attribute will be used to count vertex number
   * @type {string}
   */
  mainAttribute = '';

  // TODO Put into renderable
  /**
   * User defined picking algorithm instead of default
   * triangle ray intersection
   * x, y are NDC.
   * ```typescript
   * (x, y, renderer, camera, renderable, out) => boolean
   * ```
   * @type {?Function}
   */
  pick?: (
    x: number,
    y: number,
    renderer: Renderer,
    camera: Camera,
    renderable: Renderable,
    out: Intersection[]
  ) => boolean;

  /**
   * User defined ray picking algorithm instead of default
   * triangle ray intersection
   * ```typescript
   * (ray: clay.Ray, renderable: clay.Renderable, out: Array) => boolean
   * ```
   * @type {?Function}
   */
  pickByRay?: (ray: Ray, renderable: Renderable, out: Intersection[]) => boolean;

  private _attributeList: string[];
  private _enabledAttributes?: string[];
  private _attributesUploaded: Record<string, boolean> = {};

  __indicesDirty: boolean = true;

  constructor(opts?: Partial<GeometryBaseOpts>) {
    opts = opts || {};
    this.name = opts.name || '';
    this.indices = opts.indices;
    this.dynamic = opts.dynamic || false;

    this._attributeList = keys(this.attributes);
  }
  get vertexCount() {
    let mainAttribute = this.attributes[this.mainAttribute];

    if (!mainAttribute) {
      mainAttribute = this.attributes[this._attributeList[0]];
    }

    if (!mainAttribute || !mainAttribute.value) {
      return 0;
    }
    return mainAttribute.value.length / mainAttribute.size;
  }

  get triangleCount() {
    const indices = this.indices;
    return indices ? indices.length / 3 : 0;
  }
  /**
   * Mark attributes and indices in geometry needs to update.
   * Usually called after you change the data in attributes.
   */
  dirty() {
    this._attributesUploaded = {};
    this.dirtyIndices();
    this._enabledAttributes = undefined;
  }
  /**
   * Mark the indices needs to update.
   */
  dirtyIndices() {
    this.__indicesDirty = true;
  }
  /**
   * Mark the attributes needs to update.
   * @param {string} [attrName]
   */
  dirtyAttribute(attrName: string) {
    this._attributesUploaded[attrName] = false;
  }
  /**
   * Is any of attributes dirty.
   */
  isAttributesDirty() {
    if (!this._enabledAttributes) {
      return true;
    }
    const enabledAttributes = this.getEnabledAttributes();
    for (let i = 0; i < enabledAttributes.length; i++) {
      if (this.isAttributeDirty(enabledAttributes[i])) {
        return true;
      }
    }
    return false;
  }

  isAttributeDirty(attrName: string) {
    return !this._attributesUploaded[attrName];
  }

  // Mark this attribute has been uploaded to GPU.
  // Used internal
  __markAttributeUploaded(attrName: string) {
    this._attributesUploaded[attrName] = true;
  }

  /**
   * Get indices of triangle at given index.
   * @param {number} idx
   * @param {Array.<number>} out
   * @return {Array.<number>}
   */
  getTriangleIndices(idx: number, out: Vec3Array) {
    if (idx < this.triangleCount && idx >= 0) {
      if (!out) {
        out = [] as unknown as Vec3Array;
      }
      const indices = this.indices!;
      out[0] = indices[idx * 3];
      out[1] = indices[idx * 3 + 1];
      out[2] = indices[idx * 3 + 2];
      return out;
    }
  }

  /**
   * Set indices of triangle at given index.
   * @param {number} idx
   * @param {Array.<number>} arr
   */
  setTriangleIndices(idx: number, arr: Vec3Array) {
    const indices = this.indices!;
    indices[idx * 3] = arr[0];
    indices[idx * 3 + 1] = arr[1];
    indices[idx * 3 + 2] = arr[2];
  }

  isUseIndices() {
    return !!this.indices;
  }

  /**
   * Initialize indices from an array.
   * @param {Array} array
   */
  initIndicesFromArray(array: ArrayLike<number> | number[][]) {
    let value;
    const ArrayConstructor = this.vertexCount > 0xffff ? Uint32Array : Uint16Array;
    // Convert 2d array to flat
    if (is2DArray(array)) {
      let n = 0;
      const size = 3;

      value = new ArrayConstructor(array.length * size);
      for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < size; j++) {
          value[n++] = array[i][j];
        }
      }
    } else {
      value = new ArrayConstructor(array);
    }

    this.indices = value;
  }
  /**
   * Create a new attribute
   * @param {string} name
   * @param {string} type
   * @param {number} size
   * @param {string} [semantic]
   */
  createAttribute<T extends AttributeSize>(
    name: string,
    type: AttributeType,
    size: T,
    semantic?: AttributeSemantic
  ) {
    const attrib = new GeometryAttribute<T>(name, type, size, semantic);
    if (this.attributes[name]) {
      this.removeAttribute(name);
    }
    this.attributes[name] = attrib;
    this._attributeList.push(name);
    return attrib;
  }
  /**
   * Remove attribute
   * @param {string} name
   */
  removeAttribute(name: string) {
    const attributeList = this._attributeList;
    const idx = attributeList.indexOf(name);
    if (idx >= 0) {
      attributeList.splice(idx, 1);
      delete this.attributes[name];
      return true;
    }
    return false;
  }

  /**
   * Get attribute
   * @param {string} name
   * @return {clay.GeometryBase.Attribute}
   */
  getAttribute(name: string) {
    return this.attributes[name];
  }

  /**
   * Get enabled attributes name list
   * Attribute which has the same vertex number with position is treated as a enabled attribute
   * @return {string[]}
   */
  getEnabledAttributes() {
    const enabledAttributes = this._enabledAttributes;
    const attributeList = this._attributeList;
    // Cache
    if (enabledAttributes) {
      return enabledAttributes;
    }

    const result = [];
    const nVertex = this.vertexCount;

    for (let i = 0; i < attributeList.length; i++) {
      const name = attributeList[i];
      const attrib = this.attributes[name];
      if (attrib.value) {
        if (attrib.value.length === nVertex * attrib.size) {
          result.push(name);
        }
      }
    }

    this._enabledAttributes = result;

    return result;
  }
}
export default GeometryBase;

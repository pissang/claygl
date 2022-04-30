import glenum from './core/glenum';
import ClayCache from './core/Cache';
import Ray from './math/Ray';
import { genGUID } from './core/util';
import { Vec3Array } from './glmatrix/common';

import type Renderer from './Renderer';
import type Camera from './Camera';
import type Renderable from './Renderable';
import type Vector2 from './math/Vector2';

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
      float: Float32Array
    }[type] || Float32Array
  );
}

function makeAttrKey(attrName: string) {
  return 'attr_' + attrName;
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
  semantic?: string;

  /**
   * Value of the attribute.
   */
  value?: AttributeValue;

  get: TSize extends 1 ? AttributeNumberGetter : AttributeArrayGetter;
  set: TSize extends 1 ? AttributeNumberSetter : AttributeArraySetter;
  copy: (source: number, target: number) => void;
  constructor(name: string, type: AttributeType, size: TSize, semantic?: string) {
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
      case 2:
        this.get = function (this: GeometryAttribute<TSize>, idx: number, out: number[]) {
          const arr = this.value!;
          out[0] = arr[idx * 2];
          out[1] = arr[idx * 2 + 1];
          return out;
        } as any;
        this.set = function (this: GeometryAttribute<TSize>, idx: number, val: number[]) {
          const arr = this.value!;
          arr[idx * 2] = val[0];
          arr[idx * 2 + 1] = val[1];
        } as any;
        this.copy = function (target, source) {
          const arr = this.value!;
          source *= 2;
          target *= 2;
          arr[target] = arr[source];
          arr[target + 1] = arr[source + 1];
        };
        break;
      case 3:
        this.get = function (this: GeometryAttribute<TSize>, idx: number, out: number[]) {
          const idx3 = idx * 3;
          const arr = this.value!;
          out[0] = arr[idx3];
          out[1] = arr[idx3 + 1];
          out[2] = arr[idx3 + 2];
          return out;
        } as any;
        this.set = function (this: GeometryAttribute<TSize>, idx: number, val: number[]) {
          const idx3 = idx * 3;
          const arr = this.value!;
          arr[idx3] = val[0];
          arr[idx3 + 1] = val[1];
          arr[idx3 + 2] = val[2];
        } as any;
        this.copy = function (target, source) {
          const arr = this.value!;
          source *= 3;
          target *= 3;
          arr[target] = arr[source];
          arr[target + 1] = arr[source + 1];
          arr[target + 2] = arr[source + 2];
        };
        break;
      default: // 4
        this.get = function (this: GeometryAttribute<TSize>, idx: number, out: number[]) {
          const arr = this.value!;
          const idx4 = idx * 4;
          out[0] = arr[idx4];
          out[1] = arr[idx4 + 1];
          out[2] = arr[idx4 + 2];
          out[3] = arr[idx4 + 3];
          return out;
        } as any;
        this.set = function (this: GeometryAttribute<TSize>, idx: number, val: number[]) {
          const arr = this.value!;
          const idx4 = idx * 4;
          arr[idx4] = val[0];
          arr[idx4 + 1] = val[1];
          arr[idx4 + 2] = val[2];
          arr[idx4 + 3] = val[3];
        } as any;
        this.copy = function (target, source) {
          const arr = this.value!;
          source *= 4;
          target *= 4;
          // copyWithin is extremely slow
          arr[target] = arr[source];
          arr[target + 1] = arr[source + 1];
          arr[target + 2] = arr[source + 2];
          arr[target + 3] = arr[source + 3];
        };
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

export class AttributeBuffer {
  readonly name: string;
  readonly type: AttributeType;
  readonly buffer: WebGLBuffer;
  readonly size: AttributeSize;
  readonly semantic?: string;

  // To be set in mesh
  // symbol in the shader
  // Needs remove flag
  symbol: string = '';
  needsRemove = false;

  constructor(
    name: string,
    type: AttributeType,
    buffer: WebGLBuffer,
    size: AttributeSize,
    semantic?: string
  ) {
    this.name = name;
    this.type = type;
    this.buffer = buffer;
    this.size = size;
    this.semantic = semantic;
  }
}

export class IndicesBuffer {
  buffer: WebGLBuffer;
  count: number = 0;
  constructor(buffer: WebGLBuffer) {
    this.buffer = buffer;
  }
}

export interface GeometryBaseOpts {
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
  readonly __uid__ = genGUID();

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
    out: Vector2
  ) => boolean;

  /**
   * User defined ray picking algorithm instead of default
   * triangle ray intersection
   * ```typescript
   * (ray: clay.Ray, renderable: clay.Renderable, out: Array) => boolean
   * ```
   * @type {?Function}
   */
  pickByRay?: (ray: Ray, renderable: Renderable, out: Vector2) => boolean;

  protected _cache = new ClayCache();
  private _attributeList: string[];
  private _enabledAttributes?: string[];

  constructor(opts?: Partial<GeometryBaseOpts>) {
    opts = opts || {};
    this.indices = opts.indices;
    this.dynamic = opts.dynamic || false;

    this._attributeList = Object.keys(this.attributes);
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
    const enabledAttributes = this.getEnabledAttributes();
    for (let i = 0; i < enabledAttributes.length; i++) {
      this.dirtyAttribute(enabledAttributes[i]);
    }
    this.dirtyIndices();
    this._enabledAttributes = undefined;

    this._cache.dirty('any');
  }
  /**
   * Mark the indices needs to update.
   */
  dirtyIndices() {
    this._cache.dirtyAll('indices');
  }
  /**
   * Mark the attributes needs to update.
   * @param {string} [attrName]
   */
  dirtyAttribute(attrName: string) {
    this._cache.dirtyAll(makeAttrKey(attrName));
    this._cache.dirtyAll('attributes');
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
    semantic?: string
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

  getBufferChunks(renderer: Renderer) {
    const cache = this._cache;
    cache.use(renderer.__uid__);
    const isAttributesDirty = cache.isDirty('attributes');
    const isIndicesDirty = cache.isDirty('indices');
    if (isAttributesDirty || isIndicesDirty) {
      this._updateBuffer(renderer.gl, isAttributesDirty, isIndicesDirty);
      const enabledAttributes = this.getEnabledAttributes();
      for (let i = 0; i < enabledAttributes.length; i++) {
        cache.fresh(makeAttrKey(enabledAttributes[i]));
      }
      cache.fresh('attributes');
      cache.fresh('indices');
    }
    cache.fresh('any');
    return cache.get('chunks');
  }

  private _updateBuffer(
    gl: WebGLRenderingContext,
    isAttributesDirty: boolean,
    isIndicesDirty: boolean
  ) {
    const cache = this._cache;
    let chunks = cache.get('chunks');
    let firstUpdate = false;
    if (!chunks) {
      chunks = [];
      // Intialize
      chunks[0] = {
        attributeBuffers: [],
        indicesBuffer: null
      };
      cache.put('chunks', chunks);
      firstUpdate = true;
    }

    const chunk = chunks[0];
    const attributeBuffers = chunk.attributeBuffers;
    let indicesBuffer = chunk.indicesBuffer;

    if (isAttributesDirty || firstUpdate) {
      const attributeList = this.getEnabledAttributes();

      const attributeBufferMap: Record<string, AttributeBuffer> = {};
      if (!firstUpdate) {
        for (let i = 0; i < attributeBuffers.length; i++) {
          attributeBufferMap[attributeBuffers[i].name] = attributeBuffers[i];
        }
      }
      let k;
      // FIXME If some attributes removed
      for (k = 0; k < attributeList.length; k++) {
        const name = attributeList[k];
        const attribute = this.attributes[name];

        let bufferInfo;

        if (!firstUpdate) {
          bufferInfo = attributeBufferMap[name];
        }
        let buffer: WebGLBuffer;
        if (bufferInfo) {
          buffer = bufferInfo.buffer;
        } else {
          buffer = gl.createBuffer()!;
        }
        if (cache.isDirty(makeAttrKey(name))) {
          // Only update when they are dirty.
          // TODO: Use BufferSubData?
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            attribute.value as Float32Array,
            this.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
          );
        }

        attributeBuffers[k] = new AttributeBuffer(
          name,
          attribute.type,
          buffer,
          attribute.size,
          attribute.semantic
        );
      }
      // Remove unused attributes buffers.
      // PENDING
      for (let i = k; i < attributeBuffers.length; i++) {
        gl.deleteBuffer(attributeBuffers[i].buffer);
      }
      attributeBuffers.length = k;
    }

    if (this.isUseIndices() && (isIndicesDirty || firstUpdate)) {
      if (!indicesBuffer) {
        indicesBuffer = new IndicesBuffer(gl.createBuffer()!);
        chunk.indicesBuffer = indicesBuffer;
      }
      indicesBuffer.count = this.indices!.length;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        this.indices!,
        this.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
      );
    }
  }

  /**
   * Dispose geometry data in GL context.
   */
  dispose(renderer: Renderer) {
    const cache = this._cache;

    cache.use(renderer.__uid__);
    const chunks = cache.get('chunks');
    if (chunks) {
      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];

        for (let k = 0; k < chunk.attributeBuffers.length; k++) {
          const attribs = chunk.attributeBuffers[k];
          renderer.gl.deleteBuffer(attribs.buffer);
        }

        if (chunk.indicesBuffer) {
          renderer.gl.deleteBuffer(chunk.indicesBuffer.buffer);
        }
      }
    }

    const vaoCache = renderer.__getGeometryVaoCache(this);
    if (vaoCache) {
      const vaoExt = renderer.getGLExtension('OES_vertex_array_object');
      for (const id in vaoCache) {
        const vao = vaoCache[id].vao;
        if (vao) {
          vaoExt.deleteVertexArrayOES(vao);
        }
      }
    }
    renderer.__removeGeometryVaoCache(this);
    cache.deleteContext(renderer.__uid__);
  }

  static STATIC_DRAW = glenum.STATIC_DRAW;

  static DYNAMIC_DRAW = glenum.DYNAMIC_DRAW;
  static STREAM_DRAW = glenum.STREAM_DRAW;
}
export default GeometryBase;

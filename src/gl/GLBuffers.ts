import GeometryBase, { AttributeSize, AttributeType } from '../GeometryBase';
import { AttributeSemantic } from '../Shader';
import GLProgram from './GLProgram';
import * as constants from '../core/constants';

const enabledAttributesMap = new WeakMap<WebGL2RenderingContext, number[]>();

export const attributeBufferTypeMap = {
  float: constants.FLOAT,
  byte: constants.BYTE,
  ubyte: constants.UNSIGNED_BYTE,
  short: constants.SHORT,
  ushort: constants.UNSIGNED_SHORT
};

export class GLAttributeBuffer {
  readonly name: string;
  readonly type: AttributeType;
  readonly buffer: WebGLBuffer;
  readonly size: AttributeSize;
  readonly semantic?: AttributeSemantic;

  constructor(
    name: string,
    type: AttributeType,
    buffer: WebGLBuffer,
    size: AttributeSize,
    semantic?: AttributeSemantic
  ) {
    this.name = name;
    this.type = type;
    this.buffer = buffer;
    this.size = size;
    this.semantic = semantic;
  }
}

export class GLIndicesBuffer {
  buffer: WebGLBuffer;
  count: number = 0;
  constructor(buffer: WebGLBuffer) {
    this.buffer = buffer;
  }
}
class GLBuffers {
  private _attrbBuffs: GLAttributeBuffer[] = [];
  private _idxBuff?: GLIndicesBuffer;
  private _geometry: GeometryBase;

  private _vao?: any;
  private _vaoExt?: any;

  constructor(geometry: GeometryBase) {
    this._geometry = geometry;
  }

  getIndicesBuffer() {
    return this._idxBuff;
  }

  update(gl: WebGL2RenderingContext) {
    const geometry = this._geometry;
    const attributesDirty = geometry.isAttributesDirty();
    const indicesDirty = geometry.__indicesDirty;
    if (!attributesDirty && !indicesDirty) {
      return;
    }

    const attributeBuffers = this._attrbBuffs;
    let indicesBuffer = this._idxBuff;
    const DRAW = geometry.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;

    if (attributesDirty) {
      const attributeList = geometry.getEnabledAttributes();
      const attributeBufferMap: Record<string, GLAttributeBuffer> = {};
      for (let i = 0; i < attributeBuffers.length; i++) {
        attributeBufferMap[attributeBuffers[i].name] = attributeBuffers[i];
      }
      let k;
      // FIXME If some attributes removed
      for (k = 0; k < attributeList.length; k++) {
        const attrName = attributeList[k];
        const attribute = geometry.attributes[attrName];

        const existsBufferInfo = attributeBufferMap[attrName];
        let buffer: WebGLBuffer;
        if (existsBufferInfo) {
          buffer = existsBufferInfo.buffer;
        } else {
          buffer = gl.createBuffer()!;
        }
        if (geometry.isAttributeDirty(attrName)) {
          // Only update when they are dirty.
          // TODO: Use BufferSubData?
          gl.bindBuffer(constants.ARRAY_BUFFER, buffer);
          gl.bufferData(constants.ARRAY_BUFFER, attribute.value as Float32Array, DRAW);
          geometry.__markAttributeUploaded(attrName);
        }

        attributeBuffers[k] = new GLAttributeBuffer(
          attrName,
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

    if (geometry.isUseIndices() && indicesDirty) {
      if (!indicesBuffer) {
        indicesBuffer = new GLIndicesBuffer(gl.createBuffer()!);
        this._idxBuff = indicesBuffer;
      }
      indicesBuffer.count = geometry.indices!.length;
      gl.bindBuffer(constants.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
      gl.bufferData(constants.ELEMENT_ARRAY_BUFFER, geometry.indices!, DRAW);
    }
    geometry.__indicesDirty = false;
  }

  bindToProgram(gl: WebGL2RenderingContext, program: GLProgram) {
    this.update(gl);
    // const geometry = this._geometry;
    // const isStatic = !geometry.dynamic;
    // const vaoExt = (this._vaoExt = glext.getExtension('OES_vertex_array_object'));
    // let vao = this._vao;

    const attributeBuffers = this._attrbBuffs;
    const indicesBuffer = this._idxBuff;
    const attributeBuffersLen = attributeBuffers.length;

    // let needsBindBuffer = true;

    // // Create vertex object array cost a lot
    // // So we don't use it on the dynamic object
    // if (vaoExt && isStatic) {
    //   // Use vertex array object
    //   // http://blog.tojicode.com/2012/10/oesvertexarrayobject-extension.html
    //   if (vao == null) {
    //     vao = vaoExt.createVertexArrayOES();
    //   } else {
    //     needsBindBuffer = false;
    //   }
    //   vaoExt.bindVertexArrayOES(vao.vao);
    // }

    const lastEnabledAttributes = enabledAttributesMap.get(gl) || [];
    const currentEnabledAttributes: number[] = [];
    // Always bind attribute location
    for (let i = 0; i < attributeBuffersLen; i++) {
      const attributeBufferInfo = attributeBuffers[i];
      const location = program.getAttributeLocation(gl, attributeBufferInfo);
      // Will be -1 if not found
      if (location == null || location < 0) {
        continue;
      }

      const buffer = attributeBufferInfo.buffer;
      const size = attributeBufferInfo.size;
      const glType = attributeBufferTypeMap[attributeBufferInfo.type] || constants.FLOAT;

      gl.bindBuffer(constants.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(location, size, glType, false, 0, 0);
      currentEnabledAttributes[location] = 1;
      if (!lastEnabledAttributes[location]) {
        gl.enableVertexAttribArray(location);
      }
    }

    // Disable unused attribute
    for (let loc = 0; loc < lastEnabledAttributes.length; loc++) {
      if (lastEnabledAttributes[loc] && !currentEnabledAttributes[loc]) {
        gl.disableVertexAttribArray(loc);
      }
    }

    enabledAttributesMap.set(gl, currentEnabledAttributes);

    // Binding buffers
    // if (needsBindBuffer) {

    if (indicesBuffer) {
      gl.bindBuffer(constants.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
    }
    // }
  }

  // unbind(gl: WebGL2RenderingContext) {
  //   if (this._vao) {
  //     this._vaoExt.bindVertexArrayOES(null);
  //   }
  // }

  /**
   * Dispose geometry data in GL context.
   */
  dispose(gl: WebGL2RenderingContext) {
    const attributeBuffers = this._attrbBuffs;
    const indicesBuffer = this._idxBuff;
    attributeBuffers && attributeBuffers.forEach((buffer) => gl.deleteBuffer(buffer.buffer));
    if (indicesBuffer) {
      gl.deleteBuffer(indicesBuffer.buffer);
    }
    const vao = this._vao;
    const vaoExt = this._vaoExt;
    if (vaoExt && vao && vao.vao) {
      vaoExt.deleteVertexArrayOES(vao.vao);
    }
    this._attrbBuffs = [];
    this._idxBuff = undefined;
  }
}

export default GLBuffers;

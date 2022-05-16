import { constants } from '../claygl';
import GeometryBase, { AttributeSize, AttributeType } from '../GeometryBase';
import { AttributeSemantic } from '../Shader';
import GLExtension from './GLExtension';
import GLProgram from './GLProgram';

const enabledAttributesMap = new WeakMap<WebGLRenderingContext, number>();

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
  private _attributeBuffers: GLAttributeBuffer[] = [];
  private _indicesBuffer?: GLIndicesBuffer;
  private _geometry: GeometryBase;

  private _instancedBuffer?: GLAttributeBuffer[];

  private _vao?: any;
  private _vaoExt?: any;

  constructor(geometry: GeometryBase) {
    this._geometry = geometry;
  }

  getIndicesBuffer() {
    return this._indicesBuffer;
  }

  update(gl: WebGLRenderingContext) {
    const geometry = this._geometry;
    const attributesDirty = geometry.isAttributesDirty();
    const indicesDirty = geometry.__indicesDirty;
    if (!attributesDirty && !indicesDirty) {
      return;
    }

    const attributeBuffers = this._attributeBuffers;
    let indicesBuffer = this._indicesBuffer;
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
        const name = attributeList[k];
        const attribute = geometry.attributes[name];

        const existsBufferInfo = attributeBufferMap[name];
        let buffer: WebGLBuffer;
        if (existsBufferInfo) {
          buffer = existsBufferInfo.buffer;
        } else {
          buffer = gl.createBuffer()!;
        }
        if (attribute.__dirty) {
          // Only update when they are dirty.
          // TODO: Use BufferSubData?
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, attribute.value as Float32Array, DRAW);
        }

        attributeBuffers[k] = new GLAttributeBuffer(
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

    if (geometry.isUseIndices() && indicesDirty) {
      if (!indicesBuffer) {
        indicesBuffer = new GLIndicesBuffer(gl.createBuffer()!);
        this._indicesBuffer = indicesBuffer;
      }
      indicesBuffer.count = geometry.indices!.length;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices!, DRAW);
    }
  }

  bindToProgram(gl: WebGLRenderingContext, program: GLProgram) {
    this.update(gl);
    // const geometry = this._geometry;
    // const isStatic = !geometry.dynamic;
    // const vaoExt = (this._vaoExt = glext.getExtension('OES_vertex_array_object'));
    // let vao = this._vao;

    const attributeBuffers = this._attributeBuffers;
    const indicesBuffer = this._indicesBuffer;
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

    const enabledAttributeCount = enabledAttributesMap.get(gl) || 0;

    let attrIndex = 0;
    // Always bind attribute location
    for (let i = 0; i < attributeBuffersLen; i++) {
      const successed = program.bindAttributeLocation(gl, attrIndex, attributeBuffers[i]);
      if (!successed) {
        continue;
      }

      const attributeBufferInfo = attributeBuffers[i];
      const buffer = attributeBufferInfo.buffer;
      const size = attributeBufferInfo.size;
      const glType = attributeBufferTypeMap[attributeBufferInfo.type] || constants.FLOAT;

      gl.bindBuffer(constants.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(attrIndex, size, glType, false, 0, 0);
      if (i >= enabledAttributeCount) {
        gl.enableVertexAttribArray(attrIndex);
      }
      attrIndex++;
    }

    // Disable unused attribute
    for (let i = attrIndex; i < enabledAttributeCount; i++) {
      gl.disableVertexAttribArray(i);
    }

    enabledAttributesMap.set(gl, attrIndex);

    // Binding buffers
    // if (needsBindBuffer) {

    if (indicesBuffer) {
      gl.bindBuffer(constants.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
    }
    // }
  }

  unbind(gl: WebGLRenderingContext) {
    // if (this._vao) {
    //   this._vaoExt.bindVertexArrayOES(null);
    // }
  }

  /**
   * Dispose geometry data in GL context.
   */
  dispose(gl: WebGLRenderingContext) {
    const attributeBuffers = this._attributeBuffers;
    const indicesBuffer = this._indicesBuffer;
    for (let k = 0; k < attributeBuffers.length; k++) {
      gl.deleteBuffer(attributeBuffers[k].buffer);
    }

    if (indicesBuffer) {
      gl.deleteBuffer(indicesBuffer);
    }

    const vao = this._vao;
    const vaoExt = this._vaoExt;
    if (vaoExt && vao && vao.vao) {
      vaoExt.deleteVertexArrayOES(vao.vao);
    }
  }
}

export default GLBuffers;

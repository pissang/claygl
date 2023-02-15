import * as constants from '../core/constants';
import type { AttributeType } from '../GeometryBase';
import type InstancedMesh from '../InstancedMesh';
import { attributeBufferTypeMap } from './GLBuffers';
import GLProgram from './GLProgram';

export interface InstancedAttributeBuffer {
  type: AttributeType;
  name: string;
  divisor: number;
  size: number;
  buffer: WebGLBuffer;
}

class GLInstancedBuffers {
  private _buffers?: InstancedAttributeBuffer[];
  private _mesh: InstancedMesh;
  constructor(instancedMesh: InstancedMesh) {
    this._mesh = instancedMesh;
  }

  update(gl: WebGL2RenderingContext) {
    const mesh = this._mesh;
    if (!mesh.__dirty) {
      return;
    }

    const buffers = this._buffers || (this._buffers = []);

    const instancedAttributesNames = mesh.getInstancedAttributes();
    instancedAttributesNames.forEach((name, i) => {
      const attr = mesh.instancedAttributes[name];

      let bufferObj = buffers[i];
      if (!bufferObj) {
        bufferObj = {
          buffer: gl.createBuffer()
        } as InstancedAttributeBuffer;
        buffers[i] = bufferObj;
      }
      bufferObj.name = attr.name;
      bufferObj.divisor = attr.divisor;
      bufferObj.size = attr.size;
      bufferObj.type = attr.type;

      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.buffer);
      // TODO Type
      gl.bufferData(gl.ARRAY_BUFFER, attr.value as any as ArrayBufferView, gl.DYNAMIC_DRAW);
    });

    mesh.__dirty = false;
  }

  bindToProgram(gl: WebGL2RenderingContext, program: GLProgram) {
    this.update(gl);
    const instancedBuffers = this._buffers!;
    const locations: number[] = [];

    instancedBuffers.forEach((bufferObj) => {
      const location = program.getAttributeLocation(gl, bufferObj);
      if (location < 0) {
        return;
      }

      const glType = attributeBufferTypeMap[bufferObj.type] || constants.FLOAT;
      gl.enableVertexAttribArray(location);
      locations.push(location);
      gl.bindBuffer(constants.ARRAY_BUFFER, bufferObj.buffer);
      gl.vertexAttribPointer(location, bufferObj.size, glType, false, 0, 0);
      gl.vertexAttribDivisor(location, bufferObj.divisor);
    });

    return locations;
  }

  dispose(gl: WebGL2RenderingContext) {
    this._buffers &&
      this._buffers.forEach((buffer) => {
        gl.deleteBuffer(buffer.buffer);
      });
  }
}

export default GLInstancedBuffers;

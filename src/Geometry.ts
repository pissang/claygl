import * as vec3 from './glmatrix/vec3';
import * as mat4 from './glmatrix/mat4';
import BoundingBox from './math/BoundingBox';
import GeometryBase, { AttributeValue, GeometryAttribute, GeometryBaseOpts } from './GeometryBase';
import type Matrix4 from './math/Matrix4';

export interface GeometryOpts extends GeometryBaseOpts {}

/**
 * Geometry in ClayGL contains vertex attributes of mesh. These vertex attributes will be finally provided to the {@link clay.Shader}.
 * Different {@link clay.Shader} needs different attributes. Here is a list of attributes used in the builtin shaders.
 *
 * + position: `clay.basic`, `clay.lambert`, `clay.standard`
 * + texcoord0: `clay.basic`, `clay.lambert`, `clay.standard`
 * + color: `clay.basic`, `clay.lambert`, `clay.standard`
 * + weight: `clay.basic`, `clay.lambert`, `clay.standard`
 * + joint: `clay.basic`, `clay.lambert`, `clay.standard`
 * + normal: `clay.lambert`, `clay.standard`
 * + tangent: `clay.standard`
 *
 * #### Create a procedural geometry
 *
 * ClayGL provides a couple of builtin procedural geometries. Inlcuding:
 *
 *  + {@link clay.geometry.Cube}
 *  + {@link clay.geometry.Sphere}
 *  + {@link clay.geometry.Plane}
 *  + {@link clay.geometry.Cylinder}
 *  + {@link clay.geometry.Cone}
 *  + {@link clay.geometry.ParametricSurface}
 *
 * It's simple to create a basic geometry with these classes.
 *
```js
const sphere = new clay.geometry.Sphere({
    radius: 2
});
```
 *
 * #### Create the geometry data by yourself
 *
 * Usually the vertex attributes data are created by the {@link clay.loader.GLTF} or procedural geometries like {@link clay.geometry.Sphere}.
 * Besides these, you can create the data manually. Here is a simple example to create a triangle.
```js
const TRIANGLE_POSITIONS = [
    [-0.5, -0.5, 0],
    [0.5, -0.5, 0],
    [0, 0.5, 0]
];
const geometry = new clay.GeometryBase();
// Add triangle vertices to position attribute.
geometry.attributes.position.fromArray(TRIANGLE_POSITIONS);
```
 * Then you can use the utility methods like `generateVertexNormals`, `generateTangents` to create the remaining necessary attributes.
 *
 *
 * #### Use with custom shaders
 *
 * If you wan't to write custom shaders. Don't forget to add SEMANTICS to these attributes. For example
 *
 ```glsl
uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 worldInverseTranspose : WORLDINVERSETRANSPOSE;
uniform mat4 world : WORLD;

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;
attribute vec3 normal : NORMAL;
```
 * These `POSITION`, `TEXCOORD_0`, `NORMAL` are SEMANTICS which will map the attributes in shader to the attributes in the GeometryBase
 *
 * Available attributes SEMANTICS includes `POSITION`, `TEXCOORD_0`, `TEXCOORD_1` `NORMAL`, `TANGENT`, `COLOR`, `WEIGHT`, `JOINT`.
 *
 *
 * @constructor clay.Geometry
 * @extends clay.GeometryBase
 */
class Geometry extends GeometryBase {
  mainAttribute = 'position';
  /**
   * Calculated bounding box of geometry.
   */

  attributes!: {
    position: GeometryAttribute<3>;
    texcoord0: GeometryAttribute<2>;
    texcoord1: GeometryAttribute<2>;
    normal: GeometryAttribute<3>;
    tangent: GeometryAttribute<4>;
    color: GeometryAttribute<4>;
    // Skinning Geometryattributes
    // Each vertex can be bind to 4 bones, because the
    // sum of weights is 1, so the weights is stored in vec3 and the last
    // can be calculated by 1-w.x-w.y-w.z
    weight: GeometryAttribute<3>;
    joint: GeometryAttribute<4>;
    // For wireframe display
    // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
    barycentric: GeometryAttribute<3>;

    // Any other attributes
    [key: string]: GeometryAttribute;
  };
  constructor(opts?: Partial<GeometryOpts>) {
    super(opts);

    this.createAttribute('position', 'float', 3, 'POSITION');
    this.createAttribute('texcoord0', 'float', 2, 'TEXCOORD_0');
    this.createAttribute('texcoord1', 'float', 2, 'TEXCOORD_1');
    this.createAttribute('normal', 'float', 3, 'NORMAL');
    this.createAttribute('tangent', 'float', 4, 'TANGENT');
    this.createAttribute('color', 'float', 4, 'COLOR');
    this.createAttribute('weight', 'float', 3, 'WEIGHT');
    this.createAttribute('joint', 'float', 4, 'JOINT');
    this.createAttribute('barycentric', 'float', 3);
  }
  /**
   * Update boundingBox of Geometry
   */
  updateBoundingBox() {
    let bbox = this.boundingBox;
    if (!bbox) {
      bbox = this.boundingBox = new BoundingBox();
    }
    const posArr = this.attributes.position.value;
    if (posArr && posArr.length) {
      const min = bbox.min;
      const max = bbox.max;
      const minArr = min.array;
      const maxArr = max.array;
      vec3.set(minArr, posArr[0], posArr[1], posArr[2]);
      vec3.set(maxArr, posArr[0], posArr[1], posArr[2]);
      for (let i = 3; i < posArr.length; ) {
        const x = posArr[i++];
        const y = posArr[i++];
        const z = posArr[i++];
        if (x < minArr[0]) {
          minArr[0] = x;
        }
        if (y < minArr[1]) {
          minArr[1] = y;
        }
        if (z < minArr[2]) {
          minArr[2] = z;
        }

        if (x > maxArr[0]) {
          maxArr[0] = x;
        }
        if (y > maxArr[1]) {
          maxArr[1] = y;
        }
        if (z > maxArr[2]) {
          maxArr[2] = z;
        }
      }
    }
  }

  /**
   * Generate normals per vertex.
   */
  generateVertexNormals() {
    if (!this.vertexCount) {
      return;
    }

    const indices = this.indices;
    const attributes = this.attributes;
    const positions = attributes.position.value!;
    let normals = attributes.normal.value!;

    if (!normals || normals.length !== positions.length) {
      normals = attributes.normal.value = new Float32Array(positions.length);
    } else {
      // Reset
      for (let i = 0; i < normals.length; i++) {
        normals[i] = 0;
      }
    }

    const p1 = vec3.create();
    const p2 = vec3.create();
    const p3 = vec3.create();

    const v21 = vec3.create();
    const v32 = vec3.create();

    const n = vec3.create();

    const len = indices ? indices.length : this.vertexCount;
    let i1, i2, i3;
    for (let f = 0; f < len; ) {
      if (indices) {
        i1 = indices[f++];
        i2 = indices[f++];
        i3 = indices[f++];
      } else {
        i1 = f++;
        i2 = f++;
        i3 = f++;
      }

      vec3.set(p1, positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
      vec3.set(p2, positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);
      vec3.set(p3, positions[i3 * 3], positions[i3 * 3 + 1], positions[i3 * 3 + 2]);

      vec3.sub(v21, p1, p2);
      vec3.sub(v32, p2, p3);
      vec3.cross(n, v21, v32);
      // Already be weighted by the triangle area
      for (let i = 0; i < 3; i++) {
        normals[i1 * 3 + i] = normals[i1 * 3 + i] + n[i];
        normals[i2 * 3 + i] = normals[i2 * 3 + i] + n[i];
        normals[i3 * 3 + i] = normals[i3 * 3 + i] + n[i];
      }
    }

    for (let i = 0; i < normals.length; ) {
      vec3.set(n, normals[i], normals[i + 1], normals[i + 2]);
      vec3.normalize(n, n);
      normals[i++] = n[0];
      normals[i++] = n[1];
      normals[i++] = n[2];
    }
    this.dirty();
  }

  /**
   * Generate normals per face.
   */
  generateFaceNormals() {
    if (!this.vertexCount) {
      return;
    }

    if (!this.isUniqueVertex()) {
      this.generateUniqueVertex();
    }

    const indices = this.indices;
    const attributes = this.attributes;
    const positions = attributes.position.value!;
    let normals = attributes.normal.value!;

    const p1 = vec3.create();
    const p2 = vec3.create();
    const p3 = vec3.create();

    const v21 = vec3.create();
    const v32 = vec3.create();
    const n = vec3.create();

    if (!normals) {
      normals = attributes.normal.value = new Float32Array(positions.length);
    }
    const len = indices ? indices.length : this.vertexCount;
    let i1, i2, i3;
    for (let f = 0; f < len; ) {
      if (indices) {
        i1 = indices[f++];
        i2 = indices[f++];
        i3 = indices[f++];
      } else {
        i1 = f++;
        i2 = f++;
        i3 = f++;
      }

      vec3.set(p1, positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
      vec3.set(p2, positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);
      vec3.set(p3, positions[i3 * 3], positions[i3 * 3 + 1], positions[i3 * 3 + 2]);

      vec3.sub(v21, p1, p2);
      vec3.sub(v32, p2, p3);
      vec3.cross(n, v21, v32);

      vec3.normalize(n, n);

      for (let i = 0; i < 3; i++) {
        normals[i1 * 3 + i] = n[i];
        normals[i2 * 3 + i] = n[i];
        normals[i3 * 3 + i] = n[i];
      }
    }
    this.dirty();
  }

  /**
   * Generate tangents attributes.
   */
  generateTangents() {
    if (!this.vertexCount) {
      return;
    }

    const nVertex = this.vertexCount;
    const attributes = this.attributes;
    if (!attributes.tangent.value) {
      attributes.tangent.value = new Float32Array(nVertex * 4);
    }
    const texcoords = attributes.texcoord0.value!;
    const positions = attributes.position.value!;
    const tangents = attributes.tangent.value!;
    const normals = attributes.normal.value!;

    if (!texcoords) {
      console.warn("Geometry without texcoords can't generate tangents.");
      return;
    }

    const tan1: vec3.Vec3Array[] = [];
    const tan2: vec3.Vec3Array[] = [];
    for (let i = 0; i < nVertex; i++) {
      tan1[i] = [0.0, 0.0, 0.0];
      tan2[i] = [0.0, 0.0, 0.0];
    }

    const sdir = [0.0, 0.0, 0.0] as vec3.Vec3Array;
    const tdir = [0.0, 0.0, 0.0] as vec3.Vec3Array;
    const indices = this.indices;

    const len = indices ? indices.length : this.vertexCount;
    let i1, i2, i3;
    for (let i = 0; i < len; ) {
      if (indices) {
        i1 = indices[i++];
        i2 = indices[i++];
        i3 = indices[i++];
      } else {
        i1 = i++;
        i2 = i++;
        i3 = i++;
      }

      const st1s = texcoords[i1 * 2],
        st2s = texcoords[i2 * 2],
        st3s = texcoords[i3 * 2],
        st1t = texcoords[i1 * 2 + 1],
        st2t = texcoords[i2 * 2 + 1],
        st3t = texcoords[i3 * 2 + 1],
        p1x = positions[i1 * 3],
        p2x = positions[i2 * 3],
        p3x = positions[i3 * 3],
        p1y = positions[i1 * 3 + 1],
        p2y = positions[i2 * 3 + 1],
        p3y = positions[i3 * 3 + 1],
        p1z = positions[i1 * 3 + 2],
        p2z = positions[i2 * 3 + 2],
        p3z = positions[i3 * 3 + 2];

      const x1 = p2x - p1x,
        x2 = p3x - p1x,
        y1 = p2y - p1y,
        y2 = p3y - p1y,
        z1 = p2z - p1z,
        z2 = p3z - p1z;

      const s1 = st2s - st1s,
        s2 = st3s - st1s,
        t1 = st2t - st1t,
        t2 = st3t - st1t;

      const r = 1.0 / (s1 * t2 - t1 * s2);
      sdir[0] = (t2 * x1 - t1 * x2) * r;
      sdir[1] = (t2 * y1 - t1 * y2) * r;
      sdir[2] = (t2 * z1 - t1 * z2) * r;

      tdir[0] = (s1 * x2 - s2 * x1) * r;
      tdir[1] = (s1 * y2 - s2 * y1) * r;
      tdir[2] = (s1 * z2 - s2 * z1) * r;

      vec3.add(tan1[i1], tan1[i1], sdir);
      vec3.add(tan1[i2], tan1[i2], sdir);
      vec3.add(tan1[i3], tan1[i3], sdir);
      vec3.add(tan2[i1], tan2[i1], tdir);
      vec3.add(tan2[i2], tan2[i2], tdir);
      vec3.add(tan2[i3], tan2[i3], tdir);
    }
    const tmp = vec3.create();
    const nCrossT = vec3.create();
    const n = vec3.create();
    for (let i = 0; i < nVertex; i++) {
      n[0] = normals[i * 3];
      n[1] = normals[i * 3 + 1];
      n[2] = normals[i * 3 + 2];
      const t = tan1[i];

      // Gram-Schmidt orthogonalize
      vec3.scale(tmp, n, vec3.dot(n, t));
      vec3.sub(tmp, t, tmp);
      vec3.normalize(tmp, tmp);
      // Calculate handedness.
      vec3.cross(nCrossT, n, t);
      tangents[i * 4] = tmp[0];
      tangents[i * 4 + 1] = tmp[1];
      tangents[i * 4 + 2] = tmp[2];
      // PENDING can config ?
      tangents[i * 4 + 3] = vec3.dot(nCrossT, tan2[i]) < 0.0 ? -1.0 : 1.0;
    }
    this.dirty();
  }

  /**
   * If vertices are not shared by different indices.
   */
  isUniqueVertex() {
    if (this.isUseIndices()) {
      return this.vertexCount === this.indices!.length;
    } else {
      return true;
    }
  }
  /**
   * Create a unique vertex for each index.
   */
  generateUniqueVertex() {
    if (!this.vertexCount || !this.indices) {
      return;
    }

    if (this.indices.length > 0xffff) {
      this.indices = new Uint32Array(this.indices);
    }

    const attributes = this.attributes;
    const indices = this.indices;

    const attributeNameList = this.getEnabledAttributes();

    const oldAttrValues: Record<string, AttributeValue> = {};
    for (let a = 0; a < attributeNameList.length; a++) {
      const name = attributeNameList[a];
      oldAttrValues[name] = attributes[name].value!;
      attributes[name].init(this.indices.length);
    }

    let cursor = 0;
    for (let i = 0; i < indices.length; i++) {
      const ii = indices[i];
      for (let a = 0; a < attributeNameList.length; a++) {
        const name = attributeNameList[a];
        const array = attributes[name].value!;
        const size = attributes[name].size;

        for (let k = 0; k < size; k++) {
          array[cursor * size + k] = oldAttrValues[name][ii * size + k];
        }
      }
      indices[i] = cursor;
      cursor++;
    }

    this.dirty();
  }

  /**
   * Generate barycentric coordinates for wireframe draw.
   */
  generateBarycentric() {
    if (!this.vertexCount) {
      return;
    }

    if (!this.isUniqueVertex()) {
      this.generateUniqueVertex();
    }

    const attributes = this.attributes;
    let array = attributes.barycentric.value;
    const indices = this.indices!;
    // Already existed;
    if (array && array.length === indices.length * 3) {
      return;
    }
    array = attributes.barycentric.value = new Float32Array(indices.length * 3);

    for (let i = 0; i < (indices ? indices.length : this.vertexCount / 3); ) {
      for (let j = 0; j < 3; j++) {
        const ii = indices ? indices[i++] : i * 3 + j;
        array[ii * 3 + j] = 1;
      }
    }
    this.dirty();
  }

  /**
   * Apply transform to geometry attributes.
   * @param {clay.Matrix4} matrix
   */
  applyTransform(matrix: Matrix4) {
    const attributes = this.attributes;
    const positions = attributes.position.value!;
    const normals = attributes.normal.value!;
    const tangents = attributes.tangent.value!;

    const matArr = matrix.array;
    // Normal Matrix
    const inverseTransposeMatrix = mat4.create();
    mat4.invert(inverseTransposeMatrix, matArr);
    mat4.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

    const vec3ForEach = vec3.forEach;
    vec3ForEach(positions, 3, 0, undefined, vec3.transformMat4, matArr);
    if (normals) {
      vec3ForEach(normals, 3, 0, undefined, vec3.transformMat4, inverseTransposeMatrix);
    }
    if (tangents) {
      vec3ForEach(tangents, 4, 0, undefined, vec3.transformMat4, inverseTransposeMatrix);
    }

    if (this.boundingBox) {
      this.updateBoundingBox();
    }
  }
}

export { GeometryAttribute };

export default Geometry;

// TODO test
import Geometry from '../Geometry';
import Mesh from '../Mesh';
import ClayNode from '../Node';
import BoundingBox from '../math/BoundingBox';
import * as vec3 from '../glmatrix/vec3';
import * as mat4 from '../glmatrix/mat4';

/**
 * @namespace clay.util.mesh
 */
/**
 * Merge multiple meshes to one.
 * Note that these meshes must have the same material
 */
export function merge(meshes: Mesh[], applyWorldTransform?: boolean) {
  if (!meshes.length) {
    return;
  }

  const templateMesh = meshes[0];
  const templateGeo = templateMesh.geometry;
  const material = templateMesh.material;

  const geometry = new Geometry({
    dynamic: false
  });
  geometry.boundingBox = new BoundingBox();

  const attributeNames = templateGeo.getEnabledAttributes();

  for (let i = 0; i < attributeNames.length; i++) {
    const name = attributeNames[i];
    const attr = templateGeo.attributes[name];
    // Extend custom attributes
    if (!geometry.attributes[name]) {
      geometry.attributes[name] = attr.clone(false);
    }
  }

  const inverseTransposeMatrix = mat4.create();
  // Initialize the array data and merge bounding box
  let nVertex = 0;
  let nFace = 0;
  for (let k = 0; k < meshes.length; k++) {
    const currentGeo = meshes[k].geometry;
    if (currentGeo.boundingBox) {
      currentGeo.boundingBox.applyTransform(
        applyWorldTransform ? meshes[k].worldTransform : meshes[k].localTransform
      );
      geometry.boundingBox.union(currentGeo.boundingBox);
    }
    nVertex += currentGeo.vertexCount;
    nFace += currentGeo.triangleCount;
  }
  for (let n = 0; n < attributeNames.length; n++) {
    const name = attributeNames[n];
    const attrib = geometry.attributes[name];
    attrib.init(nVertex);
  }
  if (nVertex >= 0xffff) {
    geometry.indices = new Uint32Array(nFace * 3);
  } else {
    geometry.indices = new Uint16Array(nFace * 3);
  }

  let vertexOffset = 0;
  let indicesOffset = 0;
  const useIndices = templateGeo.isUseIndices();

  for (let mm = 0; mm < meshes.length; mm++) {
    const mesh = meshes[mm];
    const currentGeo = mesh.geometry;

    const nVertex = currentGeo.vertexCount;

    const matrix = applyWorldTransform ? mesh.worldTransform.array : mesh.localTransform.array;
    mat4.invert(inverseTransposeMatrix, matrix);
    mat4.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

    for (let nn = 0; nn < attributeNames.length; nn++) {
      const name = attributeNames[nn];
      const currentAttr = currentGeo.attributes[name];
      const targetAttr = geometry.attributes[name];
      const attrValue = currentAttr.value!;
      const targetAttrValue = targetAttr.value!;
      // Skip the unused attributes;
      if (!attrValue.length) {
        continue;
      }
      const len = attrValue.length;
      const size = currentAttr.size;
      const offset = vertexOffset * size;
      const count = len / size;
      for (let i = 0; i < len; i++) {
        targetAttrValue[offset + i] = attrValue[i];
      }
      // Transform position, normal and tangent
      if (name === 'position') {
        vec3.forEach(targetAttrValue, size, offset, count, vec3.transformMat4, matrix);
      } else if (name === 'normal' || name === 'tangent') {
        vec3.forEach(
          targetAttrValue,
          size,
          offset,
          count,
          vec3.transformMat4,
          inverseTransposeMatrix
        );
      }
    }

    if (useIndices) {
      const len = currentGeo.indices!.length;
      for (let i = 0; i < len; i++) {
        geometry.indices[i + indicesOffset] = currentGeo.indices![i] + vertexOffset;
      }
      indicesOffset += len;
    }

    vertexOffset += nVertex;
  }

  return new Mesh(geometry, material);
}

/**
 * Split mesh into sub meshes, each mesh will have maxJointNumber joints.
 * @param {clay.Mesh} mesh
 * @param {number} maxJointNumber
 * @param {boolean} inPlace
 * @return {clay.Node}
 *
 * @memberOf clay.util.mesh
 */

// FIXME, Have issues on some models
export function splitByJoints(mesh: Mesh, maxJointNumber: number, inPlace?: boolean) {
  const geometry = mesh.geometry;
  const skeleton = mesh.skeleton;
  const material = mesh.material;
  const joints = mesh.joints;
  if (!geometry || !skeleton || !joints.length) {
    return;
  }
  if (joints.length < maxJointNumber) {
    return mesh;
  }

  const indices = geometry.indices;
  const jointValues = geometry.attributes.joint.value;
  if (!indices || !jointValues) {
    // TODO
    console.error('Geometry must have indices and joint attribute');
    return;
  }

  const faceLen = geometry.triangleCount;
  let rest = faceLen;
  const isFaceAdded = [];
  for (let i = 0; i < faceLen; i++) {
    isFaceAdded[i] = false;
  }
  const addedJointIdxPerFace = [];

  const buckets = [];

  const getJointByIndex = function (idx: number) {
    return joints[idx];
  };
  while (rest > 0) {
    const bucketTriangles = [];
    const bucketJointReverseMap = [];
    const bucketJoints = [];
    let subJointNumber = 0;
    for (let i = 0; i < joints.length; i++) {
      bucketJointReverseMap[i] = -1;
    }
    for (let f = 0; f < faceLen; f++) {
      if (isFaceAdded[f]) {
        continue;
      }
      let canAddToBucket = true;
      let addedNumber = 0;
      for (let i = 0; i < 3; i++) {
        const idx = indices[f * 3 + i];

        for (let j = 0; j < 4; j++) {
          const jointIdx = jointValues[idx * 4 + j];

          if (jointIdx >= 0) {
            if (bucketJointReverseMap[jointIdx] === -1) {
              if (subJointNumber < maxJointNumber) {
                bucketJointReverseMap[jointIdx] = subJointNumber;
                bucketJoints[subJointNumber++] = jointIdx;
                addedJointIdxPerFace[addedNumber++] = jointIdx;
              } else {
                canAddToBucket = false;
              }
            }
          }
        }
      }
      if (!canAddToBucket) {
        // Reverse operation
        for (let i = 0; i < addedNumber; i++) {
          bucketJointReverseMap[addedJointIdxPerFace[i]] = -1;
          bucketJoints.pop();
          subJointNumber--;
        }
      } else {
        bucketTriangles.push(indices.subarray(f * 3, (f + 1) * 3));

        isFaceAdded[f] = true;
        rest--;
      }
    }
    buckets.push({
      triangles: bucketTriangles,
      joints: bucketJoints.map(getJointByIndex),
      jointReverseMap: bucketJointReverseMap
    });
  }

  const root = new ClayNode({
    name: mesh.name
  });
  const attribNames = geometry.getEnabledAttributes();

  attribNames.splice(attribNames.indexOf('joint'), 1);
  // Map from old vertex index to new vertex index
  const newIndices = [];
  for (let b = 0; b < buckets.length; b++) {
    const bucket = buckets[b];
    const jointReverseMap = bucket.jointReverseMap;

    const subGeo = new Geometry();

    const subMesh = new Mesh(subGeo, material, {
      name: [mesh.name, b].join('-'),
      // DON'T clone material.
      skeleton: skeleton,
      joints: bucket.joints.slice()
    });
    let nVertex = 0;
    const nVertex2 = geometry.vertexCount;
    for (let i = 0; i < nVertex2; i++) {
      newIndices[i] = -1;
    }
    // Count sub geo number
    for (let f = 0; f < bucket.triangles.length; f++) {
      const face = bucket.triangles[f];
      for (let i = 0; i < 3; i++) {
        const idx = face[i];
        if (newIndices[idx] === -1) {
          newIndices[idx] = nVertex;
          nVertex++;
        }
      }
    }
    for (let a = 0; a < attribNames.length; a++) {
      const attribName = attribNames[a];
      const subAttrib = subGeo.attributes[attribName];
      subAttrib.init(nVertex);
    }
    subGeo.attributes.joint.value = new Float32Array(nVertex * 4);

    if (nVertex > 0xffff) {
      subGeo.indices = new Uint32Array(bucket.triangles.length * 3);
    } else {
      subGeo.indices = new Uint16Array(bucket.triangles.length * 3);
    }

    let indicesOffset = 0;
    nVertex = 0;
    for (let i = 0; i < nVertex2; i++) {
      newIndices[i] = -1;
    }

    for (let f = 0; f < bucket.triangles.length; f++) {
      const triangle = bucket.triangles[f];
      for (let i = 0; i < 3; i++) {
        const idx = triangle[i];

        if (newIndices[idx] === -1) {
          newIndices[idx] = nVertex;
          for (let a = 0; a < attribNames.length; a++) {
            const attribName = attribNames[a];
            const attrib = geometry.attributes[attribName];
            const subAttrib = subGeo.attributes[attribName];
            const size = attrib.size;

            for (let j = 0; j < size; j++) {
              subAttrib.value![nVertex * size + j] = attrib.value![idx * size + j];
            }
          }
          for (let j = 0; j < 4; j++) {
            const jointIdx = jointValues[idx * 4 + j];
            const offset = nVertex * 4 + j;
            if (jointIdx >= 0) {
              subGeo.attributes.joint.value[offset] = jointReverseMap[jointIdx];
            } else {
              subGeo.attributes.joint.value[offset] = -1;
            }
          }
          nVertex++;
        }
        subGeo.indices[indicesOffset++] = newIndices[idx];
      }
    }
    subGeo.updateBoundingBox();

    root.add(subMesh);
  }
  const children = mesh.children();
  for (let i = 0; i < children.length; i++) {
    root.add(children[i]);
  }
  root.position.copy(mesh.position);
  root.rotation.copy(mesh.rotation);
  root.scale.copy(mesh.scale);

  if (inPlace) {
    const parent = mesh.getParent();
    if (parent) {
      parent.remove(mesh);
      parent.add(root);
    }
  }
  return root;
}

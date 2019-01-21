// TODO test
import Geometry from '../Geometry';
import Mesh from '../Mesh';
import Node from '../Node';
import BoundingBox from '../math/BoundingBox';
import vec3 from '../glmatrix/vec3';
import mat4 from '../glmatrix/mat4';

/**
 * @namespace clay.util.mesh
 */
var meshUtil = {

    /**
     * Merge multiple meshes to one.
     * Note that these meshes must have the same material
     *
     * @param {Array.<clay.Mesh>} meshes
     * @param {boolean} applyWorldTransform
     * @return {clay.Mesh}
     * @memberOf clay.util.mesh
     */
    merge: function (meshes, applyWorldTransform) {

        if (! meshes.length) {
            return;
        }

        var templateMesh = meshes[0];
        var templateGeo = templateMesh.geometry;
        var material = templateMesh.material;

        var geometry = new Geometry({
            dynamic: false
        });
        geometry.boundingBox = new BoundingBox();

        var attributeNames = templateGeo.getEnabledAttributes();

        for (var i = 0; i < attributeNames.length; i++) {
            var name = attributeNames[i];
            var attr = templateGeo.attributes[name];
            // Extend custom attributes
            if (!geometry.attributes[name]) {
                geometry.attributes[name] = attr.clone(false);
            }
        }

        var inverseTransposeMatrix = mat4.create();
        // Initialize the array data and merge bounding box
        var nVertex = 0;
        var nFace = 0;
        for (var k = 0; k < meshes.length; k++) {
            var currentGeo = meshes[k].geometry;
            if (currentGeo.boundingBox) {
                currentGeo.boundingBox.applyTransform(applyWorldTransform ? meshes[k].worldTransform : meshes[k].localTransform);
                geometry.boundingBox.union(currentGeo.boundingBox);
            }
            nVertex += currentGeo.vertexCount;
            nFace += currentGeo.triangleCount;
        }
        for (var n = 0; n < attributeNames.length; n++) {
            var name = attributeNames[n];
            var attrib = geometry.attributes[name];
            attrib.init(nVertex);
        }
        if (nVertex >= 0xffff) {
            geometry.indices = new Uint32Array(nFace * 3);
        }
        else {
            geometry.indices = new Uint16Array(nFace * 3);
        }

        var vertexOffset = 0;
        var indicesOffset = 0;
        var useIndices = templateGeo.isUseIndices();

        for (var mm = 0; mm < meshes.length; mm++) {
            var mesh = meshes[mm];
            var currentGeo = mesh.geometry;

            var nVertex = currentGeo.vertexCount;

            var matrix = applyWorldTransform ? mesh.worldTransform.array : mesh.localTransform.array;
            mat4.invert(inverseTransposeMatrix, matrix);
            mat4.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

            for (var nn = 0; nn < attributeNames.length; nn++) {
                var name = attributeNames[nn];
                var currentAttr = currentGeo.attributes[name];
                var targetAttr = geometry.attributes[name];
                // Skip the unused attributes;
                if (!currentAttr.value.length) {
                    continue;
                }
                var len = currentAttr.value.length;
                var size = currentAttr.size;
                var offset = vertexOffset * size;
                var count = len / size;
                for (var i = 0; i < len; i++) {
                    targetAttr.value[offset + i] = currentAttr.value[i];
                }
                // Transform position, normal and tangent
                if (name === 'position') {
                    vec3.forEach(targetAttr.value, size, offset, count, vec3.transformMat4, matrix);
                }
                else if (name === 'normal' || name === 'tangent') {
                    vec3.forEach(targetAttr.value, size, offset, count, vec3.transformMat4, inverseTransposeMatrix);
                }
            }

            if (useIndices) {
                var len = currentGeo.indices.length;
                for (var i = 0; i < len; i++) {
                    geometry.indices[i + indicesOffset] = currentGeo.indices[i] + vertexOffset;
                }
                indicesOffset += len;
            }

            vertexOffset += nVertex;
        }

        return new Mesh({
            material: material,
            geometry: geometry
        });
    },

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
    splitByJoints: function (mesh, maxJointNumber, inPlace) {
        var geometry = mesh.geometry;
        var skeleton = mesh.skeleton;
        var material = mesh.material;
        var joints = mesh.joints;
        if (!geometry || !skeleton || !joints.length) {
            return;
        }
        if (joints.length < maxJointNumber) {
            return mesh;
        }


        var indices = geometry.indices;

        var faceLen = geometry.triangleCount;
        var rest = faceLen;
        var isFaceAdded = [];
        var jointValues = geometry.attributes.joint.value;
        for (var i = 0; i < faceLen; i++) {
            isFaceAdded[i] = false;
        }
        var addedJointIdxPerFace = [];

        var buckets = [];

        var getJointByIndex = function (idx) {
            return joints[idx];
        };
        while (rest > 0) {
            var bucketTriangles = [];
            var bucketJointReverseMap = [];
            var bucketJoints = [];
            var subJointNumber = 0;
            for (var i = 0; i < joints.length; i++) {
                bucketJointReverseMap[i] = -1;
            }
            for (var f = 0; f < faceLen; f++) {
                if (isFaceAdded[f]) {
                    continue;
                }
                var canAddToBucket = true;
                var addedNumber = 0;
                for (var i = 0; i < 3; i++) {

                    var idx = indices[f * 3 + i];

                    for (var j = 0; j < 4; j++) {
                        var jointIdx = jointValues[idx * 4 + j];

                        if (jointIdx >= 0) {
                            if (bucketJointReverseMap[jointIdx] === -1) {
                                if (subJointNumber < maxJointNumber) {
                                    bucketJointReverseMap[jointIdx] = subJointNumber;
                                    bucketJoints[subJointNumber++] = jointIdx;
                                    addedJointIdxPerFace[addedNumber++] = jointIdx;
                                }
                                else {
                                    canAddToBucket = false;
                                }
                            }
                        }
                    }
                }
                if (!canAddToBucket) {
                    // Reverse operation
                    for (var i = 0; i < addedNumber; i++) {
                        bucketJointReverseMap[addedJointIdxPerFace[i]] = -1;
                        bucketJoints.pop();
                        subJointNumber--;
                    }
                }
                else {
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

        var root = new Node({
            name: mesh.name
        });
        var attribNames = geometry.getEnabledAttributes();

        attribNames.splice(attribNames.indexOf('joint'), 1);
        // Map from old vertex index to new vertex index
        var newIndices = [];
        for (var b = 0; b < buckets.length; b++) {
            var bucket = buckets[b];
            var jointReverseMap = bucket.jointReverseMap;
            var subJointNumber = bucket.joints.length;

            var subGeo = new Geometry();

            var subMesh = new Mesh({
                name: [mesh.name, i].join('-'),
                // DON'T clone material.
                material: material,
                geometry: subGeo,
                skeleton: skeleton,
                joints: bucket.joints.slice()
            });
            var nVertex = 0;
            var nVertex2 = geometry.vertexCount;
            for (var i = 0; i < nVertex2; i++) {
                newIndices[i] = -1;
            }
            // Count sub geo number
            for (var f = 0; f < bucket.triangles.length; f++) {
                var face = bucket.triangles[f];
                for (var i = 0; i < 3; i++) {
                    var idx = face[i];
                    if (newIndices[idx] === -1) {
                        newIndices[idx] = nVertex;
                        nVertex++;
                    }
                }
            }
            for (var a = 0; a < attribNames.length; a++) {
                var attribName = attribNames[a];
                var subAttrib = subGeo.attributes[attribName];
                subAttrib.init(nVertex);
            }
            subGeo.attributes.joint.value = new Float32Array(nVertex * 4);

            if (nVertex > 0xffff) {
                subGeo.indices = new Uint32Array(bucket.triangles.length * 3);
            }
            else {
                subGeo.indices = new Uint16Array(bucket.triangles.length * 3);
            }

            var indicesOffset = 0;
            nVertex = 0;
            for (var i = 0; i < nVertex2; i++) {
                newIndices[i] = -1;
            }

            for (var f = 0; f < bucket.triangles.length; f++) {
                var triangle = bucket.triangles[f];
                for (var i = 0; i < 3; i++) {

                    var idx = triangle[i];

                    if (newIndices[idx] === -1) {
                        newIndices[idx] = nVertex;
                        for (var a = 0; a < attribNames.length; a++) {
                            var attribName = attribNames[a];
                            var attrib = geometry.attributes[attribName];
                            var subAttrib = subGeo.attributes[attribName];
                            var size = attrib.size;

                            for (var j = 0; j < size; j++) {
                                subAttrib.value[nVertex * size + j] = attrib.value[idx * size + j];
                            }
                        }
                        for (var j = 0; j < 4; j++) {
                            var jointIdx = geometry.attributes.joint.value[idx * 4 + j];
                            var offset = nVertex * 4 + j;
                            if (jointIdx >= 0) {
                                subGeo.attributes.joint.value[offset] = jointReverseMap[jointIdx];
                            }
                            else {
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
        var children = mesh.children();
        for (var i = 0; i < children.length; i++) {
            root.add(children[i]);
        }
        root.position.copy(mesh.position);
        root.rotation.copy(mesh.rotation);
        root.scale.copy(mesh.scale);

        if (inPlace) {
            if (mesh.getParent()) {
                var parent = mesh.getParent();
                parent.remove(mesh);
                parent.add(root);
            }
        }
        return root;
    }
};

export default meshUtil;

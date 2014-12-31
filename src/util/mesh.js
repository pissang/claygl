define(function(require) {
    
    'use strict';

    var Geometry = require('../Geometry');
    var DynamicGeometry = require('../DynamicGeometry');
    var StaticGeometry = require('../StaticGeometry');
    var Mesh = require('../Mesh');
    var Node = require('../Node');
    var Material = require('../Material');
    var Shader = require('../Shader');
    var BoundingBox = require('../math/BoundingBox');
    var glMatrix = require('../dep/glmatrix');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var arraySlice = Array.prototype.slice;

    /**
     * @namespace qtek.util.mesh
     */
    var meshUtil = {
        /**
         * Merge multiple meshes to one.
         * Note that these meshes must have the same material
         *
         * @param {Array.<qtek.Mesh>} meshes
         * @param {boolean} applyWorldTransform
         * @return qtek.Mesh
         * @memberOf qtek.util.mesh
         */
        merge: function(meshes, applyWorldTransform) {

            if (! meshes.length) {
                return;
            }

            var templateMesh = meshes[0];
            var templateGeo = templateMesh.geometry;
            var material = templateMesh.material;
            var isStatic = templateGeo instanceof StaticGeometry;

            var geometry = isStatic ? new StaticGeometry() : new DynamicGeometry();
            geometry.boundingBox = new BoundingBox();
            var faces = geometry.faces;

            var attributeNames = templateGeo.getEnabledAttributes();
            // TODO
            if (!isStatic) {
                attributeNames = Object.keys(attributeNames);
            }

            for (var i = 0; i < attributeNames.length; i++) {
                var name = attributeNames[i];
                var attr = templateGeo.attributes[name];
                // Extend custom attributes
                if (! geometry.attributes[name]) {
                    geometry.attributes[name] = attr.clone(false);
                }
            }

            var inverseTransposeMatrix = mat4.create();
            // Initialize the array data and merge bounding box
            if (isStatic) {
                var nVertex = 0;
                var nFace = 0;
                for (var k = 0; k < meshes.length; k++) {
                    var currentGeo = meshes[k].geometry;
                    if (currentGeo.boundingBox) {
                        currentGeo.boundingBox.applyTransform(applyWorldTransform ? meshes[k].worldTransform : meshes[k].localTransform);
                        geometry.boundingBox.union(currentGeo.boundingBox);
                    }
                    nVertex += currentGeo.getVertexNumber();
                    nFace += currentGeo.getFaceNumber();
                }
                for (var n = 0; n < attributeNames.length; n++) {
                    var name = attributeNames[n];
                    var attrib = geometry.attributes[name];
                    attrib.init(nVertex);
                }
                if (nVertex >= 0xffff) {
                    geometry.faces = new Uint32Array(nFace * 3);
                } else {
                    geometry.faces = new Uint16Array(nFace * 3);
                }
            }

            var vertexOffset = 0;
            var faceOffset = 0;
            var useFaces = templateGeo.isUseFace();
            
            for (var mm = 0; mm < meshes.length; mm++) {
                var mesh = meshes[mm];  
                var currentGeo = mesh.geometry;

                var nVertex = currentGeo.getVertexNumber();

                var matrix = applyWorldTransform ? mesh.worldTransform._array : mesh.localTransform._array;
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
                    if (isStatic) {
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
                        } else if (name === 'normal' || name === 'tangent') {
                            vec3.forEach(targetAttr.value, size, offset, count, vec3.transformMat4, inverseTransposeMatrix);
                        }
                    } else {
                        for (var i = 0; i < nVertex; i++) {
                            // Transform position, normal and tangent
                            if (name === 'position') {
                                var newValue = vec3.create();
                                vec3.transformMat4(newValue, currentAttr.value[i], matrix);
                                targetAttr.value.push(newValue);
                            }
                            else if (name === 'normal' || name === 'tangent') {
                                var newValue = vec3.create();
                                vec3.transformMat4(newValue, currentAttr.value[i], inverseTransposeMatrix);
                                targetAttr.value.push(newValue);
                            } else {
                                targetAttr.value.push(currentAttr.value[i]);
                            }
                        }
                    }
                }

                if (useFaces) {
                    var len = currentGeo.faces.length;
                    if (isStatic) {
                        for (var i = 0; i < len; i++) {
                            geometry.faces[i + faceOffset] = currentGeo.faces[i] + vertexOffset;
                        }
                        faceOffset += len;
                    } else {
                        for (var i = 0; i < len; i++) {
                            var newFace = [];
                            var face = currentGeo.faces[i];
                            newFace[0] = face[0] + vertexOffset;
                            newFace[1] = face[1] + vertexOffset;
                            newFace[2] = face[2] + vertexOffset;

                            faces.push(newFace);
                        }   
                    }
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
         * @param  {qtek.Mesh} mesh
         * @param  {number} maxJointNumber
         * @param  {boolean} inPlace
         * @return {qtek.Node}
         *
         * @memberOf qtek.util.mesh
         */
        splitByJoints: function(mesh, maxJointNumber, inPlace) {
            var geometry = mesh.geometry;
            var skeleton = mesh.skeleton;
            var material = mesh.material;
            var shader = material.shader;
            var joints = mesh.joints;
            if (!geometry || !skeleton || !joints.length) {
                return;
            }
            if (joints.length < maxJointNumber) {
                return mesh;
            }
            var isStatic = geometry instanceof StaticGeometry;

            var shaders = {};

            var faces = geometry.faces;
            
            var faceLen = geometry.getFaceNumber();
            var rest = faceLen;
            var isFaceAdded = [];
            var jointValues = geometry.attributes.joint.value;
            for (var i = 0; i < faceLen; i++) {
                isFaceAdded[i] = false;
            }
            var addedJointIdxPerFace = [];

            var buckets = [];

            var getJointByIndex = function(idx) {
                return joints[idx];
            };
            while(rest > 0) {
                var bucketFaces = [];
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
                        
                        var idx = isStatic ? faces[f * 3 + i] : faces[f][i];
                        
                        for (var j = 0; j < 4; j++) {
                            var jointIdx;
                            if (isStatic) {
                                jointIdx = jointValues[idx * 4 + j];
                            } else {
                                jointIdx = jointValues[idx][j];
                            }
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
                        for (var i = 0; i < addedNumber; i++) {
                            bucketJointReverseMap[addedJointIdxPerFace[i]] = -1;
                            bucketJoints.pop();
                            subJointNumber--;
                        }
                    } else {
                        if (isStatic) {
                            bucketFaces.push(faces.subarray(f * 3, (f + 1) * 3));
                        } else {
                            bucketFaces.push(faces[f]);
                        }
                        isFaceAdded[f] = true;
                        rest--;
                    }
                }
                buckets.push({
                    faces : bucketFaces,
                    joints : bucketJoints.map(getJointByIndex),
                    jointReverseMap : bucketJointReverseMap
                });
            }

            var root = new Node({
                name : mesh.name
            });
            var attribNames = geometry.getEnabledAttributes();            
            // TODO
            if (!isStatic) {
                attribNames = Object.keys(attribNames);
            }

            attribNames.splice(attribNames.indexOf('joint'), 1);
            // Map from old vertex index to new vertex index
            var newIndices = [];
            for (var b = 0; b < buckets.length; b++) {
                var bucket = buckets[b];
                var jointReverseMap = bucket.jointReverseMap;
                var subJointNumber = bucket.joints.length;
                var subShader = shaders[subJointNumber];
                if (!subShader) {
                    subShader = shader.clone();
                    subShader.define('vertex', 'JOINT_NUMBER', subJointNumber);
                    shaders[subJointNumber] = subShader;
                }
                var subMat = new Material({
                    name : [material.name, b].join('-'),
                    shader : subShader,
                    transparent : material.transparent,
                    depthTest : material.depthTest,
                    depthMask : material.depthMask,
                    blend : material.blend
                });
                for (var name in material.uniforms) {
                    var uniform = material.uniforms[name];
                    subMat.set(name, uniform.value);
                }
                var subGeo = isStatic ? new StaticGeometry() : new DynamicGeometry();
                
                var subMesh = new Mesh({
                    name : [mesh.name, i].join('-'),
                    material : subMat,
                    geometry : subGeo,
                    skeleton : skeleton,
                    joints : bucket.joints.slice()
                });
                var nVertex = 0;
                var nVertex2 = geometry.getVertexNumber();
                for (var i = 0; i < nVertex2; i++) {
                    newIndices[i] = -1;
                }
                // Count sub geo number
                for (var f = 0; f < bucket.faces.length; f++) {
                    var face = bucket.faces[f];
                    for (var i = 0; i < 3; i++) {
                        var idx = face[i];
                        if (newIndices[idx] === -1) {
                            newIndices[idx] = nVertex;
                            nVertex++;
                        }
                    }
                }
                if (isStatic) {
                    for (var a = 0; a < attribNames.length; a++) {
                        var attribName = attribNames[a];
                        var subAttrib = subGeo.attributes[attribName];
                        subAttrib.init(nVertex);
                    }
                    subGeo.attributes.joint.value = new Float32Array(nVertex * 4);

                    if (nVertex > 0xffff) {
                        subGeo.faces = new Uint32Array(bucket.faces.length * 3);
                    } else {
                        subGeo.faces = new Uint16Array(bucket.faces.length * 3);
                    }
                }

                var faceOffset = 0;
                nVertex = 0;
                for (var i = 0; i < nVertex2; i++) {
                    newIndices[i] = -1;
                }

                for (var f = 0; f < bucket.faces.length; f++) {
                    var newFace;
                    if (!isStatic) {
                        newFace = [];
                    }
                    var face = bucket.faces[f];
                    for (var i = 0; i < 3; i++) {
                        
                        var idx = face[i];

                        if (newIndices[idx] === -1) {
                            newIndices[idx] = nVertex;
                            for (var a = 0; a < attribNames.length; a++) {
                                var attribName = attribNames[a];
                                var attrib = geometry.attributes[attribName];
                                var subAttrib = subGeo.attributes[attribName];
                                var size = attrib.size;

                                if (isStatic) {
                                    for (var j = 0; j < size; j++) {
                                        subAttrib.value[nVertex * size + j] = attrib.value[idx * size + j];
                                    }
                                } else {
                                    if (attrib.size === 1) {
                                        subAttrib.value[nVertex] = attrib.value[idx];
                                    } else {
                                        subAttrib.value[nVertex] = arraySlice.call(attrib.value[idx]);
                                    }   
                                }
                            }
                            if (isStatic) {
                                for (var j = 0; j < 4; j++) {
                                    var jointIdx = geometry.attributes.joint.value[idx * 4 + j];
                                    var offset = nVertex * 4 + j;
                                    if (jointIdx >= 0) {
                                        subGeo.attributes.joint.value[offset] = jointReverseMap[jointIdx];
                                    } else {
                                        subGeo.attributes.joint.value[offset] = -1;
                                    }
                                }
                            } else {
                                var newJoints = subGeo.attributes.joint.value[nVertex] = [-1, -1, -1, -1];
                                // joints
                                for (var j = 0; j < 4; j++) {
                                    var jointIdx = geometry.attributes.joint.value[idx][j];
                                    if (jointIdx >= 0) {
                                        newJoints[j] = jointReverseMap[jointIdx];
                                    }
                                }
                            }
                            nVertex++;
                        }
                        if (isStatic) {
                            subGeo.faces[faceOffset++] = newIndices[idx];
                        } else {
                            newFace.push(newIndices[idx]);
                        }
                    }
                    if (!isStatic) {
                        subGeo.faces.push(newFace);
                    }
                }

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

    return meshUtil;
});
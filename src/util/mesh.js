/**
 *
 * @export{object} mesh
 */
define(function(require) {
    
    var Geometry = require("../Geometry");
    var DynamicGeometry = require("../DynamicGeometry");
    var StaticGeometry = require("../StaticGeometry");
    var Mesh = require("../Mesh");
    var Node = require("../Node");
    var Material = require("../Material");
    var Shader = require("../Shader");
    var glMatrix = require("glmatrix");
    var BoundingBox = require('../math/BoundingBox');
    var _ = require("_");
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var arraySlice = Array.prototype.slice;

    var meshUtil = {
        /**
         * Merge multiple meshes to one.
         * Note that these meshes must have the same material
         */
        merge : function(meshes, applyWorldTransform) {

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

            var attributeNames = Object.keys(templateGeo.getEnabledAttributes());

            for (var i = 0; i < attributeNames.length; i++) {
                var name = attributeNames[i];
                var attr = templateGeo.attributes[name];
                // Extend custom attributes
                if (! geometry.attributes[name]) {
                    geometry.attributes[name] = {
                        value : isStatic ? null : [],
                        type : attr.type
                    }
                }
            }

            var inverseTransposeMatrix = mat4.create();
            // Initialize the array data and merge bounding box
            if (isStatic) {
                var vertexCount = 0;
                var faceCount = 0;
                for (var k = 0; k < meshes.length; k++) {
                    var currentGeo = meshes[k].geometry;
                    if (currentGeo.boundingBox) {
                        currentGeo.boundingBox.applyTransform(applyWorldTransform ? meshes[k].worldTransform : meshes[k].localTransform);
                        geometry.boundingBox.union(currentGeo.boundingBox);
                    }
                    vertexCount += currentGeo.getVertexNumber();
                    faceCount += currentGeo.getFaceNumber();
                }
                for (var n = 0; n < attributeNames.length; n++) {
                    var name = attributeNames[n];
                    var attrib = geometry.attributes[name];
                    // TODO other type
                    attrib.value = new Float32Array(vertexCount * attrib.size);
                }
                // TODO Uint32Array
                geometry.faces = new Uint16Array(faceCount * 3);
            }

            var vertexOffset = 0;
            var faceOffset = 0;
            var useFaces = templateGeo.isUseFace();
            
            for (var mm = 0; mm < meshes.length; mm++) {
                var mesh = meshes[mm];  
                var currentGeo = mesh.geometry;

                var vertexCount = currentGeo.getVertexNumber();

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
                        for (var i = 0; i < vertexCount; i++) {
                            // Transform position, normal and tangent
                            if (name === "position") {
                                var newValue = vec3.create();
                                vec3.transformMat4(newValue, currentAttr.value[i], matrix);
                                targetAttr.value.push(newValue);
                            }
                            else if (name === "normal" || name === 'tangent') {
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

                vertexOffset += vertexCount;
            }

            return new Mesh({
                material : material,
                geometry : geometry
            });
        },

        splitByJoints : function(mesh, maxJointNumber, inPlace) {
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
            var shaders = {};

            var faces = geometry.faces;
            
            var meshNumber = Math.ceil(joints.length / maxJointNumber);
            var faceLen = geometry.faces.length;
            var rest = faceLen;
            var isFaceAdded = [];
            var jointValues = geometry.attributes.joint.value;
            for (var i = 0; i < faceLen; i++) {
                isFaceAdded[i] = false;
            }
            var addedJointIdxPerFace = [];

            var buckets = [];
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
                    var face = faces[f];

                    var canAddToBucket = true;
                    var addedNumber = 0;
                    for (var i = 0; i < 3; i++) {
                        var idx = face[i];
                        for (var j = 0; j < 4; j++) {
                            var jointIdx = jointValues[idx][j];
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
                        bucketFaces.push(face);
                        isFaceAdded[f] = true;
                        rest--;
                    }
                }
                buckets.push({
                    faces : bucketFaces,
                    joints : bucketJoints.map(function(idx){return joints[idx];}),
                    jointReverseMap : bucketJointReverseMap
                });
            }

            var root = new Node({
                name : mesh.name
            });
            var attribNames = Object.keys(geometry.getEnabledAttributes());
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
                var subGeo = new DynamicGeometry();
                var subMesh = new Mesh({
                    name : [mesh.name, i].join('-'),
                    material : subMat,
                    geometry : subGeo,
                    skeleton : skeleton,
                    joints : bucket.joints.slice()
                });
                var vertexNumber = 0;
                for (var i = 0; i < geometry.getVertexNumber(); i++) {
                    newIndices[i] = -1;
                }
                for (var f = 0; f < bucket.faces.length; f++) {
                    var face = bucket.faces[f];
                    var newFace = [];
                    for (var i = 0; i < 3; i++) {
                        var idx = face[i];
                        if (newIndices[idx] === -1) {
                            newIndices[idx] = vertexNumber;
                            for (var a = 0; a < attribNames.length; a++) {
                                var attribName = attribNames[a];
                                var attrib = geometry.attributes[attribName];
                                var subAttrib = subGeo.attributes[attribName];
                                if (attrib.size === 1) {
                                    subAttrib.value[vertexNumber] = attrib.value[idx];
                                } else {
                                    subAttrib.value[vertexNumber] = arraySlice.call(attrib.value[idx]);
                                }
                            }
                            var newJoints = subGeo.attributes.joint.value[vertexNumber] = [-1, -1, -1, -1];
                            // joints
                            for (var j = 0; j < 4; j++) {
                                var jointIdx = geometry.attributes.joint.value[idx][j];
                                if (jointIdx >= 0) {
                                    newJoints[j] = jointReverseMap[jointIdx];
                                }
                            }
                            vertexNumber++;
                        }
                        newFace.push(newIndices[idx]);
                    }
                    subGeo.faces.push(newFace);
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

            material.dispose();
            if (inPlace) {
                if (mesh.parent) {
                    var parent = mesh.parent;
                    parent.remove(mesh);
                    parent.add(root);
                }
            }
            return root;
        }
    }

    return meshUtil;
})
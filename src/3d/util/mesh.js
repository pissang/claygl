/**
 *
 * @export{object} mesh
 */
define(function(require) {
    
    var Geometry = require("../Geometry");
    var Mesh = require("../Mesh");
    var Node = require("../Node");
    var Material = require("../Material");
    var Shader = require("../Shader");
    var glMatrix = require("glmatrix");
    var _ = require("_");
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var arraySlice = Array.prototype.slice;

    var ret = {
        /**
         * Merge multiple meshes to one.
         * Note that these meshes must have the same material
         */
        merge : function(meshes, clone) {

            if (! meshes.length) {
                return;
            }
            var clone = typeof(clone) === "undefined" ? true : clone;

            var templateMesh = meshes[0];
            var templateGeo = templateMesh.geometry;
            var material = templateMesh.material;

            if (_.any(meshes, function(mesh) {
                return mesh.material !== material;  
            })) {
                console.warn("Material of meshes to merge is not the same, program will use the material of first mesh by default");
            }

            var geometry = new Geometry,
                faces = geometry.faces;

            for (var name in templateGeo.attributes) {
                var attr = templateGeo.attributes[name];
                // Extend custom attributes
                if (! geometry.attributes[name]) {
                    geometry.attributes[name] = {
                        value : [],
                        type : attr.type
                    }
                }
            }


            var faceOffset = 0;
            var useFaces = templateGeo.faces.length !== 0;
                
            for (var k = 0; k < meshes.length; k++) {
                var mesh = meshes[k];  
                var currentGeo = mesh.geometry;

                mesh.updateLocalTransform();
                var vertexCount = currentGeo.getVerticesNumber();

                for (var name in currentGeo.attributes) {

                    var currentAttr = currentGeo.attributes[name];
                    var targetAttr = geometry.attributes[name];
                    // Skip the unused attributes;
                    if (!currentAttr.value.length) {
                        continue;
                    }
                    for (var i = 0; i < vertexCount; i++) {

                        // Transform position, normal and tangent
                        if (name === "position") {
                            var newValue = cloneValue(currentAttr.value[i]);
                            vec3.transformMat4(newValue, newValue, mesh.localTransform._array);
                            targetAttr.value.push(newValue);   
                        }
                        else if (name === "normal") {
                            var newValue = cloneValue(currentAttr.value[i]);
                            targetAttr.value.push(newValue);
                        }
                        else if (name === "tangent") {
                            var newValue = cloneValue(currentAttr.value[i]);
                            targetAttr.value.push(newValue);
                        }else{
                            targetAttr.value.push(cloneValue(currentAttr.value[i]));
                        }

                    }
                }

                if (useFaces) {
                    var len = currentGeo.faces.length;
                    for (i =0; i < len; i++) {
                        var newFace = [];
                        var face = currentGeo.faces[i];
                        newFace[0] = face[0] + faceOffset;
                        newFace[1] = face[1] + faceOffset;
                        newFace[2] = face[2] + faceOffset;

                        faces.push(newFace);
                    }
                }

                faceOffset += vertexCount;
            }

            function cloneValue(val) {
                if (! clone) {
                    return val;
                }
                return val && Array.prototype.slice.call(val);
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
                var subGeo = new Geometry();
                var subMesh = new Mesh({
                    name : [mesh.name, i].join('-'),
                    material : subMat,
                    geometry : subGeo,
                    skeleton : skeleton,
                    joints : bucket.joints.slice()
                });
                var vertexNumber = 0;
                for (var i = 0; i < geometry.getVerticesNumber(); i++) {
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

    return ret;
})
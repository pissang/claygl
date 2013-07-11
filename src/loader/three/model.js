/**
 * Load three.js JSON Format model
 *
 * Format specification : https://github.com/mrdoob/three.js/wiki/JSON-Model-format-3.1
 * @export{class} Model
 */
define( function(require) {

    var Base = require('core/base');

    var request = require("core/request");
    var Shader = require("3d/shader");
    var Material = require("3d/material");
    var Geometry = require("3d/geometry");
    var Mesh = require("3d/mesh");
    var Node = require("3d/node");
    var Texture2D = require("3d/texture/texture2d");
    var TextureCube = require("3d/texture/texturecube");
    var shaderLibrary = require("3d/shader/library");
    var Skeleton = require("3d/skeleton");
    var Bone = require("3d/bone");
    var Vector3 = require("core/vector3");
    var Quaternion = require("core/quaternion");
    var _ = require("_");

    var glMatrix = require("glmatrix");
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;

    var Loader = Base.derive(function() {
        return {
            textureRootPath : "",

            textureNumber : 0
        };
    }, {
        load : function(url) {
            var self = this;

            this.textureNumber = 0;
            request.get({
                url : url,
                onprogress : function(percent, loaded, total) {
                    self.trigger("progress", percent, loaded, total);
                },
                onerror : function(e) {
                    self.trigger("error", e);
                },
                responseType : "text",
                onload : function(data) {
                    self.parse(JSON.parse(data))
                }
            })
        },
        parse : function(data) {
            
            var geometryList = this.parseGeometry(data);

            var dSkinIndices = data.skinIndices,
                dSkinWeights = data.skinWeights;
            var skinned = dSkinIndices && dSkinIndices.length
                        && dSkinWeights && dSkinWeights.length;

            if (skinned) {
                var skeleton = this.parseSkeleton(data);
                var boneNumber = skeleton.bones.length;
            }else{
                var boneNumber = 0;
            }

            if (skinned) {
                var skeleton = this.parseSkeleton(data);
                var boneNumber = skeleton.bones.length;
            }else{
                var boneNumber = 0;
            }

            var meshList = [];
            for (var i = 0; i < data.materials.length; i++) {
                var geometry = geometryList[i];
                if (geometry 
                    && geometry.faces.length 
                    && geometry.attributes.position.value.length) {

                    var material = this.parseMaterial(data.materials[i], boneNumber);
                    var mesh = new Mesh({
                        geometry : geometryList[i],
                        material : material
                    }) ;
                    if ( skinned) {
                        mesh.skeleton = skeleton;
                    }
                    meshList.push(mesh);
                }
            }
            
            this.trigger('load', meshList);
            return meshList;
        },

        parseGeometry : function(data) {

            var geometryList = [];
            var cursorList = [];
            
            for (var i = 0; i < data.materials.length; i++) {
                geometryList[i] = null;
                cursorList[i] = 0;
            }
            geometryList[0] = new Geometry;

            var faceMaterial = data.materials && data.materials.length > 1;

            var dFaces = data.faces,
                dVertices = data.vertices,
                dNormals = data.normals,
                dColors = data.colors,
                dSkinIndices = data.skinIndices,
                dSkinWeights = data.skinWeights,
                dUvs = data.uvs;

            var skinned = dSkinIndices && dSkinIndices.length
                        && dSkinWeights && dSkinWeights.length;

            var geometry = geometryList[0],
                attributes = geometry.attributes,
                positions = attributes.position.value,
                normals = attributes.normal.value,
                texcoords = [attributes.texcoord0.value,
                            attributes.texcoord1.value],
                colors = attributes.color.value,
                boneIndices = attributes.boneIndex.value,
                boneWeights = attributes.boneWeight.value,
                faces = geometry.faces;

            var nUvLayers = 0;
            if (dUvs[0] && dUvs[0].length) {
                nUvLayers++;
            }
            if (dUvs[1] && dUvs[1].length) {
                nUvLayers++;
            }

            var offset = 0;
            var len = dFaces.length;

            // Cache the reorganized index
            var newIndexMap = [];
            var geoIndexMap = [];
            for (var i = 0; i < dVertices.length; i++) {
                newIndexMap[i] = -1;
                geoIndexMap[i] = -1;
            }

            var currentGeometryIndex = 0;
            var isNew = [];
            function getNewIndex(oi, faceIndex) {
                if ( newIndexMap[oi] >= 0) {
                    // Switch to the geometry of existed index 
                    currentGeometryIndex = geoIndexMap[oi];
                    geometry = geometryList[currentGeometryIndex];
                    attributes = geometry.attributes;
                    positions = attributes.position.value;
                    normals = attributes.normal.value;
                    texcoords = [attributes.texcoord0.value,
                                attributes.texcoord1.value];
                    colors = attributes.color.value;
                    boneWeights = attributes.boneWeight.value;
                    boneIndices = attributes.boneIndex.value;

                    isNew[faceIndex] = false;
                    return newIndexMap[oi];
                }else{

                    positions.push([dVertices[oi*3], dVertices[oi*3+1], dVertices[oi*3+2]]);
                    //Skin data
                    if (skinned) {
                        boneWeights.push([dSkinWeights[oi*2], dSkinWeights[oi*2+1], 0]);
                        boneIndices.push([dSkinIndices[oi*2], dSkinIndices[oi*2+1], -1, -1]);
                    }

                    newIndexMap[oi] = cursorList[materialIndex];
                    geoIndexMap[oi] = materialIndex;

                    isNew[faceIndex] = true;
                    return cursorList[materialIndex]++;
                }
            }
            // Put the vertex data of one face here
            // Incase the program create amount of tmp arrays and cause
            // GC bottleneck
            var faceUvs = [];
            var faceNormals = [];
            var faceColors = [];
            for (var i =0; i < 4; i++) {
                faceUvs[i] = [0, 0];
                faceNormals[i] = [0, 0, 0];
                faceColors[i] = [0, 0, 0];
            }
            var materialIndex = 0;

            while (offset < len) {
                var type = dFaces[offset++];
                var isQuad = isBitSet(type, 0),
                    hasMaterial = isBitSet(type, 1),
                    hasFaceUv = isBitSet(type, 2),
                    hasFaceVertexUv = isBitSet(type, 3),
                    hasFaceNormal = isBitSet(type, 4),
                    hasFaceVertexNormal = isBitSet(type, 5),
                    hasFaceColor = isBitSet(type, 6),
                    hasFaceVertexColor = isBitSet(type, 7);

                var nVertices = isQuad ? 4 : 3;

                if (hasMaterial) {
                    materialIndex = dFaces[ offset+ (isQuad ? 4 : 3) ];
                    if ( ! geometryList[materialIndex] ) {
                        geometryList[materialIndex] = new Geometry;
                    }
                    geometry = geometryList[materialIndex];
                    attributes = geometry.attributes;
                    positions = attributes.position.value;
                    normals = attributes.normal.value;
                    texcoords = [attributes.texcoord0.value,
                                attributes.texcoord1.value];
                    colors = attributes.color.value;
                    boneWeights = attributes.boneWeight.value;
                    boneIndices = attributes.boneIndex.value;
                    faces = geometry.faces;
                }
                if (isQuad) {
                    // Split into two triangle faces, 1-2-4 and 2-3-4
                    var i1o = dFaces[offset++],
                        i2o = dFaces[offset++],
                        i3o = dFaces[offset++],
                        i4o = dFaces[offset++];
                    // Face1
                    var i1 = getNewIndex(i1o, 0),
                        i2 = getNewIndex(i2o, 1),
                        i3 = getNewIndex(i4o, 2),
                    // Face2
                        i4 = getNewIndex(i2o, 3),
                        i5 = getNewIndex(i3o, 4),
                        i6 = getNewIndex(i4o, 5);
                    faces.push([i1, i2, i3], [i4, i5, i6]);
                } else {
                    var i1 = dFaces[offset++],
                        i2 = dFaces[offset++],
                        i3 = dFaces[offset++];
                    i1 = getNewIndex(i1, 0);
                    i2 = getNewIndex(i2, 1);
                    i3 = getNewIndex(i3, 2);
                    faces.push([i1, i2, i3]);
                }
                if (hasMaterial) {
                    offset++;
                }
                if (hasFaceUv) {
                    for (var i = 0; i < nUvLayers; i++) {
                        var uvLayer = dUvs[i];
                        var uvIndex = faces[offset++];
                        var u = uvLayer[uvIndex*2];
                        var v = uvLayer[uvIndex*2+1];
                        if (isQuad) {
                            // Random write of array seems not slow
                            // http://jsperf.com/random-vs-sequence-array-set
                            isNew[0] && (texcoords[i][i1] = [u, v]);
                            isNew[1] && (texcoords[i][i2] = [u, v]);
                            isNew[2] && (texcoords[i][i3] = [u, v]);
                            isNew[3] && (texcoords[i][i4] = [u, v]);
                            isNew[4] && (texcoords[i][i5] = [u, v]);
                            isNew[5] && (texcoords[i][i6] = [u, v]);
                        } else {
                            isNew[0] && (texcoords[i][i1] = [u, v]);
                            isNew[1] && (texcoords[i][i2] = [u, v]);
                            isNew[2] && (texcoords[i][i3] = [u, v]);
                        }
                    }
                }
                if (hasFaceVertexUv) {
                    for (var i = 0; i < nUvLayers; i++) {
                        var uvLayer = dUvs[i];
                        for (var j = 0; j < nVertices; j++) {
                            var uvIndex = dFaces[offset++];
                            faceUvs[j][0] = uvLayer[uvIndex*2];
                            faceUvs[j][1] = uvLayer[uvIndex*2+1];
                        }
                        if (isQuad) {
                            // Use array slice to clone array is incredibly faster than 
                            // Construct from Float32Array
                            // http://jsperf.com/typedarray-v-s-array-clone/2
                            isNew[0] && (texcoords[i][i1] = faceUvs[0].slice());
                            isNew[1] && (texcoords[i][i2] = faceUvs[1].slice());
                            isNew[2] && (texcoords[i][i3] = faceUvs[3].slice());
                            isNew[3] && (texcoords[i][i4] = faceUvs[1].slice());
                            isNew[4] && (texcoords[i][i5] = faceUvs[2].slice());
                            isNew[5] && (texcoords[i][i6] = faceUvs[3].slice());
                        } else {
                            isNew[0] && (texcoords[i][i1] = faceUvs[0].slice());
                            isNew[1] && (texcoords[i][i2] = faceUvs[1].slice());
                            isNew[2] && (texcoords[i][i3] = faceUvs[2].slice());
                        }
                    }
                }
                if (hasFaceNormal) {
                    var normalIndex = dFaces[offset++]*3;
                    var x = dNormals[normalIndex++];
                    var y = dNormals[normalIndex++];
                    var z = dNormals[normalIndex];
                    if (isQuad) {
                        isNew[0] && (normals[i1] = [x, y, z]);
                        isNew[1] && (normals[i2] = [x, y, z]);
                        isNew[2] && (normals[i3] = [x, y, z]);
                        isNew[3] && (normals[i4] = [x, y, z]);
                        isNew[4] && (normals[i5] = [x, y, z]);
                        isNew[5] && (normals[i6] = [x, y, z]);
                    }else{
                        isNew[0] && (normals[i1] = [x, y, z]);
                        isNew[1] && (normals[i2] = [x, y, z]);
                        isNew[2] && (normals[i3] = [x, y, z]);
                    }
                }
                if (hasFaceVertexNormal) {
                    for (var i = 0; i < nVertices; i++) {
                        var normalIndex = dFaces[offset++]*3;
                        faceNormals[i][0] = dNormals[normalIndex++];
                        faceNormals[i][1] = dNormals[normalIndex++];
                        faceNormals[i][2] = dNormals[normalIndex];
                    }
                    if (isQuad) {
                        isNew[0] && (normals[i1] = faceNormals[0].slice());
                        isNew[1] && (normals[i2] = faceNormals[1].slice());
                        isNew[2] && (normals[i3] = faceNormals[3].slice());
                        isNew[3] && (normals[i4] = faceNormals[1].slice());
                        isNew[4] && (normals[i5] = faceNormals[2].slice());
                        isNew[5] && (normals[i6] = faceNormals[3].slice());
                    } else {
                        isNew[0] && (normals[i1] = faceNormals[0].slice());
                        isNew[1] && (normals[i2] = faceNormals[1].slice());
                        isNew[2] && (normals[i3] = faceNormals[2].slice());
                    }
                }
                if (hasFaceColor) {
                    var colorIndex = dFaces[offset++];
                    var color = hex2rgb(dColors[colorIndex]);
                    if (isQuad) {
                        // Does't clone the color here
                        isNew[0] && (colors[i1] = color);
                        isNew[1] && (colors[i2] = color);
                        isNew[2] && (colors[i3] = color);
                        isNew[3] && (colors[i4] = color);
                        isNew[4] && (colors[i5] = color);
                        isNew[5] && (colors[i6] = color);
                    } else {
                        isNew[0] && (colors[i1] = color);
                        isNew[1] && (colors[i2] = color);
                        isNew[2] && (colors[i3] = color);
                    }
                }
                if (hasFaceVertexColor) {
                    for (var i = 0; i < nVertices; i++) {
                        var colorIndex = dFaces[offset++];
                        faceColors[i] = hex2rgb(dColors[colorIndex]);
                    }
                    if (isQuad) {
                        isNew[0] && (colors[i1] = faceColors[0].slice());
                        isNew[1] && (colors[i2] = faceColors[1].slice());
                        isNew[2] && (colors[i3] = faceColors[3].slice());
                        isNew[3] && (colors[i4] = faceColors[1].slice());
                        isNew[4] && (colors[i5] = faceColors[2].slice());
                        isNew[5] && (colors[i6] = faceColors[3].slice());
                    } else {
                        isNew[0] && (colors[i1] = faceColors[0].slice());
                        isNew[1] && (colors[i2] = faceColors[1].slice());
                        isNew[2] && (colors[i3] = faceColors[2].slice());
                    }
                }
            }

            return geometryList;
        },

        parseSkeleton : function(data) {
            var bones = [];
            var dBones = data.bones;
            for ( var i = 0; i < dBones.length; i++) {
                var dBone = dBones[i];
                var bone = new Bone({
                    parentIndex : dBone.parent,
                    name : dBone.name,
                    position : new Vector3(dBone.pos[0], dBone.pos[1], dBone.pos[2]),
                    rotation : new Quaternion(dBone.rotq[0], dBone.rotq[1], dBone.rotq[2], dBone.rotq[3]),
                    scale : new Vector3(dBone.scl[0], dBone.scl[1], dBone.scl[2])
                });
                bones.push(bone);
            }

            var skeleton = new Skeleton({
                bones : bones
            });
            skeleton.update();

            if ( data.animation) {
                var dFrames = data.animation.hierarchy;

                // Parse Animations
                for (var i = 0; i < dFrames.length; i++) {
                    var channel = dFrames[i];
                    var bone = bones[i];
                    for (var j = 0; j < channel.keys.length; j++) {
                        var key = channel.keys[j];
                        bone.poses[j] = {};
                        var pose = bone.poses[j];
                        pose.time = parseFloat(key.time);
                        if (key.pos) {
                            pose.position = new Vector3(key.pos[0], key.pos[1], key.pos[2]);
                        }
                        if (key.rot) {
                            pose.rotation = new Quaternion(key.rot[0], key.rot[1], key.rot[2], key.rot[3]);
                        }
                        if (key.scl) {
                            pose.scale = new Vector3(key.scl[0], key.scl[1], key.scl[2]);
                        }
                    }
                }
            }

            return skeleton;
        },

        parseMaterial : function(mConfig, boneNumber) {
            var shaderName = "buildin.lambert";
            var shading = mConfig.shading && mConfig.shading.toLowerCase();
            if (shading === "phong" || shading === "lambert") {
                shaderName = "buildin." + shading;
            }
            var enabledTextures = [];
            if (mConfig.mapDiffuse) {
                enabledTextures.push("diffuseMap");
            }
            if (mConfig.mapNormal || mConfig.mapBump) {
                enabledTextures.push('normalMap');
            }
            if (boneNumber == 0) {
                var shader = shaderLibrary.get(shaderName, enabledTextures);
            } else {
                // Shader for skinned mesh
                var shader = new Shader({
                    vertex : Shader.source(shaderName+".vertex"),
                    fragment : Shader.source(shaderName+".fragment")
                })
                for (var i = 0; i < enabledTextures; i++) {
                    shader.enableTexture(enabledTextures[i]);
                }
                shader.vertexDefines["SKINNING"] = null;
                shader.vertexDefines["BONE_MATRICES_NUMBER"] = boneNumber;
            }

            var material = new Material({
                shader : shader
            });
            if (mConfig.colorDiffuse) {
                material.setUniform("color", mConfig.colorDiffuse );
            } else if (mConfig.DbgColor) {
                material.setUniform("color", hex2rgb(mConfig.DbgColor));
            }
            if (mConfig.colorSpecular) {
                material.setUniform("specular", mConfig.colorSpecular );
            }
            if (mConfig.transparent !== undefined && mConfig.transparent) {
                material.transparent = true;
            }
            if ( ! _.isUndefined(mConfig.depthTest)) {
                material.depthTest = mConfig.depthTest;
            }
            if ( ! _.isUndefined(mConfig.depthWrite)) {
                material.depthTest = mConfig.depthWrite;
            }
            
            if (mConfig.transparency && mConfig.transparency < 1) {
                material.setUniform("opacity", mConfig.transparency);
            }
            if (mConfig.specularCoef) {
                material.setUniform("shininess", mConfig.specularCoef);
            }

            // Textures
            if (mConfig.mapDiffuse) {
                material.setUniform("diffuseMap", this.loadTexture(mConfig.mapDiffuse, mConfig.mapDiffuseWrap) );
            }
            if (mConfig.mapBump) {
                material.setUniform("normalMap", this.loadTexture(mConfig.mapBump, mConfig.mapBumpWrap) );
            }
            if (mConfig.mapNormal) {
                material.setUniform("normalMap", this.loadTexture(mConfig.mapNormal, mConfig.mapBumpWrap) );
            }

            return material;
        },

        loadTexture : function(path, wrap) {
            var self = this;

            var img = new Image();
            var texture = new Texture2D();
            texture.image = img;

            this.textureNumber++;

            if (wrap && wrap.length) {
                texture.wrapS = wrap[0].toUpperCase();
                texture.wrapT = wrap[1].toUpperCase();
            }
            img.onload = function() {
                self.trigger("load:texture", texture);
                texture.dirty();
            }
            img.src = this.textureRootPath + "/" + path;

            return texture;
        }
    })


    function isBitSet(value, position) {
        return value & ( 1 << position );
    }


    function hex2rgb(hex) {
        var r = (hex >> 16) & 0xff,
            g = (hex >> 8) & 0xff,
            b = hex & 0xff;
        return [r/255, g/255, b/255];
    }

    function translateColor(color) {
        return [color[0]/255, color[1]/255, color[2]/255];
    }

    return Loader
} )
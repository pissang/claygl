/**
 * Load three.js JSON Format model
 *
 * Format specification https://github.com/mrdoob/three.js/wiki/JSON-Model-format-3.1
 */
define(function(require) {

    var Base = require('../core/Base');

    var request = require('../core/request');
    var util = require('../core/util');
    var Shader = require('../Shader');
    var Material = require('../Material');
    var DynamicGeometry = require('../DynamicGeometry');
    var Mesh = require('../Mesh');
    var Node = require('../Node');
    var Texture2D = require('../Texture2D');
    var TextureCube = require('../TextureCube');
    var shaderLibrary = require('../shader/library');
    var Skeleton = require('../Skeleton');
    var Joint = require('../Joint');
    var Vector3 = require('../math/Vector3');
    var Quaternion = require('../math/Quaternion');
    var glenum = require('../core/glenum');
    var SkinningClip = require('../animation/SkinningClip');

    var glMatrix = require('../dep/glmatrix');
    var vec3 = glMatrix.vec3;
    var quat = glMatrix.quat;

    /**
     * @constructor qtek.loader.ThreeModel
     * @extends qtek.core.Base
     */
    var Loader = Base.derive(
    /** @lends qtek.loader.ThreeModel# */
    {
        /**
         * @type {string}
         */
        rootPath: '',
        /**
         * @type {string}
         */
        textureRootPath: ''
    }, {
        /**
         * @param  {string} url
         */
        load: function(url) {
            var self = this;

            if (!this.rootPath) {
                this.rootPath = url.slice(0, url.lastIndexOf('/'));
            }

            request.get({
                url: url,
                onprogress: function(percent, loaded, total) {
                    self.trigger('progress', percent, loaded, total);
                },
                onerror: function(e) {
                    self.trigger('error', e);
                },
                responseType: 'text',
                onload: function(data) {
                    self.parse(JSON.parse(data));
                }
            });
        },

        /**
         * @param {Object} json
         * @return {Array.<qtek.Mesh>}
         */
        parse: function(data) {
            
            var geometryList = this._parseGeometry(data);

            var dSkinIndices = data.skinIndices;
            var dSkinWeights = data.skinWeights;
            var skinned = dSkinIndices && dSkinIndices.length
                && dSkinWeights && dSkinWeights.length;

            var jointNumber;
            var skeleton;
            if (skinned) {
                skeleton = this._parseSkeleton(data);
                jointNumber = skeleton.joints.length;
            } else {
                jointNumber = 0;
            }

            var meshList = [];
            for (var i = 0; i < data.materials.length; i++) {
                var geometry = geometryList[i];
                if (
                    geometry && geometry.faces.length && geometry.attributes.position.value.length
                ) {
                    geometry.updateBoundingBox();
                    var material = this._parseMaterial(data.materials[i], jointNumber);
                    var mesh = new Mesh({
                        geometry: geometryList[i],
                        material: material
                    }) ;
                    if (skinned) {
                        mesh.skeleton = skeleton;
                        for (var i = 0; i < skeleton.joints.length; i++) {
                            // Use all the joints of skeleton
                            mesh.joints[i] = i;
                        }
                    }
                    meshList.push(mesh);
                }
            }
            
            this.trigger('success', meshList);

            return meshList;
        },

        _parseGeometry: function(data) {

            var geometryList = [];
            var cursorList = [];
            
            for (var i = 0; i < data.materials.length; i++) {
                geometryList[i] = null;
                cursorList[i] = 0;
            }
            geometryList[0] = new DynamicGeometry();

            var dFaces = data.faces;
            var dVertices = data.vertices;
            var dNormals = data.normals;
            var dColors = data.colors;
            var dSkinIndices = data.skinIndices;
            var dSkinWeights = data.skinWeights;
            var dUvs = data.uvs;

            var skinned = dSkinIndices && dSkinIndices.length
                && dSkinWeights && dSkinWeights.length;

            var geometry = geometryList[0];
            var attributes = geometry.attributes;
            var positions = attributes.position.value;
            var normals = attributes.normal.value;
            var texcoords = [
                attributes.texcoord0.value,
                attributes.texcoord1.value
            ];
            var colors = attributes.color.value;
            var jointIndices = attributes.joint.value;
            var jointWeights = attributes.weight.value;
            var faces = geometry.faces;

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
                    jointWeights = attributes.weight.value;
                    jointIndices = attributes.joint.value;

                    isNew[faceIndex] = false;
                    return newIndexMap[oi];
                }else{

                    positions.push([dVertices[oi * 3], dVertices[oi * 3 + 1], dVertices[oi * 3 + 2]]);
                    //Skin data
                    if (skinned) {
                        jointWeights.push([dSkinWeights[oi * 2], dSkinWeights[oi * 2 + 1], 0]);
                        jointIndices.push([dSkinIndices[oi * 2], dSkinIndices[oi * 2 + 1], -1, -1]);
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
                var isQuad = isBitSet(type, 0);
                var hasMaterial = isBitSet(type, 1);
                var hasFaceUv = isBitSet(type, 2);
                var hasFaceVertexUv = isBitSet(type, 3);
                var hasFaceNormal = isBitSet(type, 4);
                var hasFaceVertexNormal = isBitSet(type, 5);
                var hasFaceColor = isBitSet(type, 6);
                var hasFaceVertexColor = isBitSet(type, 7);

                var nVertices = isQuad ? 4 : 3;

                if (hasMaterial) {
                    materialIndex = dFaces[offset+ (isQuad ? 4 : 3)];
                    if (!geometryList[materialIndex]) {
                        geometryList[materialIndex] = new DynamicGeometry();
                    }
                    geometry = geometryList[materialIndex];
                    attributes = geometry.attributes;
                    positions = attributes.position.value;
                    normals = attributes.normal.value;
                    texcoords = [
                        attributes.texcoord0.value,
                        attributes.texcoord1.value
                    ];
                    colors = attributes.color.value;
                    jointWeights = attributes.weight.value;
                    jointIndices = attributes.joint.value;
                    faces = geometry.faces;
                }
                var i1o, i2o, i3o, i4o;
                var i1, i2, i3, i4, i5, i6;
                if (isQuad) {
                    // Split into two triangle faces, 1-2-4 and 2-3-4
                    i1o = dFaces[offset++];
                    i2o = dFaces[offset++];
                    i3o = dFaces[offset++];
                    i4o = dFaces[offset++];
                    // Face1
                    i1 = getNewIndex(i1o, 0);
                    i2 = getNewIndex(i2o, 1);
                    i3 = getNewIndex(i4o, 2);
                    // Face2
                    i4 = getNewIndex(i2o, 3);
                    i5 = getNewIndex(i3o, 4);
                    i6 = getNewIndex(i4o, 5);
                    faces.push([i1, i2, i3], [i4, i5, i6]);
                } else {
                    i1 = dFaces[offset++];
                    i2 = dFaces[offset++];
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

        _parseSkeleton: function(data) {
            var joints = [];
            var dBones = data.bones;
            for ( var i = 0; i < dBones.length; i++) {
                var dBone = dBones[i];
                var joint = new Joint({
                    index: i,
                    parentIndex: dBone.parent,
                    name: dBone.name
                });
                joint.node = new Node({
                    name: dBone.name,
                    position: new Vector3(dBone.pos[0], dBone.pos[1], dBone.pos[2]),
                    rotation: new Quaternion(dBone.rotq[0], dBone.rotq[1], dBone.rotq[2], dBone.rotq[3]),
                    scale: new Vector3(dBone.scl[0], dBone.scl[1], dBone.scl[2])
                });
                joints.push(joint);
            }

            var skeleton = new Skeleton({
                joints: joints
            });
            skeleton.updateHierarchy();
            skeleton.updateJointMatrices();
            skeleton.update();

            if (data.animation) {
                var dFrames = data.animation.hierarchy;

                var jointClips = [];
                // Parse Animations
                for (var i = 0; i < dFrames.length; i++) {
                    var channel = dFrames[i];
                    var jointPose = jointClips[i] = {
                        keyFrames: []
                    };
                    jointPose.name = joints[i].name;
                    for (var j = 0; j < channel.keys.length; j++) {
                        var key = channel.keys[j];
                        jointPose.keyFrames[j] = {};
                        var kf = jointPose.keyFrames[j];
                        kf.time = parseFloat(key.time) * 1000;
                        if (key.pos) {
                            kf.position = vec3.fromValues(key.pos[0], key.pos[1], key.pos[2]);
                        }
                        if (key.rot) {
                            kf.rotation = quat.fromValues(key.rot[0], key.rot[1], key.rot[2], key.rot[3]);
                        }
                        if (key.scl) {
                            kf.scale = vec3.fromValues(key.scl[0], key.scl[1], key.scl[2]);
                        }
                    }
                }

                var skinningClip = new SkinningClip({
                    jointClips: jointClips
                });

                skeleton.addClip(skinningClip);
            }

            return skeleton;
        },

        _parseMaterial: function(mConfig, jointNumber) {
            var shaderName = 'buildin.lambert';
            var shading = mConfig.shading && mConfig.shading.toLowerCase();
            if (shading === 'phong' || shading === 'lambert') {
                shaderName = 'buildin.' + shading;
            }
            var enabledTextures = [];
            if (mConfig.mapDiffuse) {
                enabledTextures.push('diffuseMap');
            }
            if (mConfig.mapNormal || mConfig.mapBump) {
                enabledTextures.push('normalMap');
            }
            var shader;
            if (jointNumber === 0) {
                shader = shaderLibrary.get(shaderName, enabledTextures);
            } else {
                // Shader for skinned mesh
                shader = new Shader({
                    vertex: Shader.source(shaderName+'.vertex'),
                    fragment: Shader.source(shaderName+'.fragment')
                });
                for (var i = 0; i < enabledTextures; i++) {
                    shader.enableTexture(enabledTextures[i]);
                }
                shader.define('vertex', 'SKINNING');
                shader.define('vertex', 'JOINT_NUMBER', jointNumber);
            }

            var material = new Material({
                shader: shader
            });
            if (mConfig.colorDiffuse) {
                material.set('color', mConfig.colorDiffuse );
            } else if (mConfig.DbgColor) {
                material.set('color', hex2rgb(mConfig.DbgColor));
            }
            if (mConfig.colorSpecular) {
                material.set('specular', mConfig.colorSpecular );
            }
            if (mConfig.transparent !== undefined && mConfig.transparent) {
                material.transparent = true;
            }
            if (mConfig.depthTest !== undefined) {
                material.depthTest = mConfig.depthTest;
            }
            if (mConfig.depthWrite !== undefined) {
                material.depthMask = mConfig.depthWrite;
            }
            
            if (mConfig.transparency && mConfig.transparency < 1) {
                material.set('opacity', mConfig.transparency);
            }
            if (mConfig.specularCoef) {
                material.set('shininess', mConfig.specularCoef);
            }

            // Textures
            if (mConfig.mapDiffuse) {
                material.set('diffuseMap', this._loadTexture(mConfig.mapDiffuse, mConfig.mapDiffuseWrap) );
            }
            if (mConfig.mapBump) {
                material.set('normalMap', this._loadTexture(mConfig.mapBump, mConfig.mapBumpWrap) );
            }
            if (mConfig.mapNormal) {
                material.set('normalMap', this._loadTexture(mConfig.mapNormal, mConfig.mapBumpWrap) );
            }

            return material;
        },

        _loadTexture: function(path, wrap) {
            var img = new Image();
            var texture = new Texture2D();
            texture.image = img;

            if (wrap && wrap.length) {
                texture.wrapS = glenum[wrap[0].toUpperCase()];
                texture.wrapT = glenum[wrap[1].toUpperCase()];
            }
            img.onload = function() {
                texture.dirty();
            };
            var root = this.textureRootPath || this.rootPath;
            img.src = util.relative2absolute(path, root);

            return texture;
        }
    });


    function isBitSet(value, position) {
        return value & ( 1 << position );
    }


    function hex2rgb(hex) {
        var r = (hex >> 16) & 0xff;
        var g = (hex >> 8) & 0xff;
        var b = hex & 0xff;
        return [r / 255, g / 255, b / 255];
    }

    return Loader;
});
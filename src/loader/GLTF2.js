/**
 * glTF Loader
 * Specification https://github.com/KhronosGroup/glTF/blob/master/specification/README.md
 *
 * TODO Morph targets
 */
define(function (require) {

    'use strict';

    var Base = require('../core/Base');
    var request = require('../core/request');
    var util = require('../core/util');
    var vendor = require('../core/vendor');

    var Scene = require('../Scene');
    var Material = require('../Material');
    var StandardMaterial = require('../StandardMaterial');
    var Mesh = require('../Mesh');
    var Node = require('../Node');
    var Texture = require('../Texture');
    var Texture2D = require('../Texture2D');
    var shaderLibrary = require('../shader/library');
    var Skeleton = require('../Skeleton');
    var Joint = require('../Joint');
    var PerspectiveCamera = require('../camera/Perspective');
    var OrthographicCamera = require('../camera/Orthographic');
    var glenum = require('../core/glenum');

    var Vector3 = require('../math/Vector3');
    var Quaternion = require('../math/Quaternion');
    var BoundingBox = require('../math/BoundingBox');

    var SamplerClip = require('../animation/SamplerClip');

    var StaticGeometry = require('../StaticGeometry');

    // Import builtin shader
    require('../shader/builtin');

    var semanticAttributeMap = {
        'NORMAL': 'normal',
        'POSITION': 'position',
        'TEXCOORD_0': 'texcoord0',
        'TEXCOORD_1': 'texcoord1',
        'WEIGHTS_0': 'weight',
        'JOINTS_0': 'joint',
        'COLOR': 'color'
    };


    /**
     * @typedef {Object} qtek.loader.GLTF.IResult
     * @property {qtek.Scene} scene
     * @property {qtek.Node} rootNode
     * @property {Object.<string, qtek.Camera>} cameras
     * @property {Object.<string, qtek.Texture>} textures
     * @property {Object.<string, qtek.Material>} materials
     * @property {Object.<string, qtek.Skeleton>} skeletons
     * @property {Object.<string, qtek.Mesh>} meshes
     * @property {qtek.animation.SkinningClip} clip
     */

    /**
     * @constructor qtek.loader.GLTF
     * @extends qtek.core.Base
     */
    var GLTFLoader = Base.extend(
    /** @lends qtek.loader.GLTF# */
    {
        /**
         * @type {qtek.Node}
         */
        rootNode: null,
        /**
         * @type {string}
         */
        rootPath: null,

        /**
         * @type {string}
         */
        textureRootPath: null,

        /**
         * @type {string}
         */
        bufferRootPath: null,

        /**
         * @type {string}
         */
        shaderName: 'qtek.standard',

        /**
         * Cross origin setting
         */

        /**
         * @type {string}
         */
        useStandardMaterial: false,

        /**
         * @type {boolean}
         */
        includeCamera: true,

        /**
         * @type {boolean}
         */
        includeAnimation: true,
        /**
         * @type {boolean}
         */
        includeMesh: true,
        /**
         * @type {boolean}
         */
        includeTexture: true,

        /**
         * @type {string}
         */
        crossOrigin: '',

        shaderLibrary: null
    },
    function () {
        if (!this.shaderLibrary) {
            this.shaderLibrary = shaderLibrary.createLibrary();
        }
    },
    /** @lends qtek.loader.GLTF.prototype */
    {
        /**
         * @param  {string} url
         */
        load: function (url) {
            var self = this;

            if (this.rootPath == null) {
                this.rootPath = url.slice(0, url.lastIndexOf('/'));
            }

            request.get({
                url: url,
                onprogress: function (percent, loaded, total) {
                    self.trigger('progress', percent, loaded, total);
                },
                onerror: function (e) {
                    self.trigger('error', e);
                },
                responseType: 'text',
                onload: function (data) {
                    self.parse(JSON.parse(data));
                }
            });
        },

        /**
         * @param {Object} json
         * @return {qtek.loader.GLTF.IResult}
         */
        parse: function (json) {
            var self = this;

            var lib = {
                buffers: [],
                materials: [],
                textures: [],
                meshes: [],
                joints: [],
                skeletons: [],
                cameras: [],
                nodes: [],
                clips: []
            };
            // Mount on the root node if given
            var rootNode = this.rootNode || new Scene();
            
            var loading = 0;
            function checkLoad() {
                loading--;
                if (loading === 0) {
                    afterLoadBuffer();
                }
            }
            // Load buffers
            util.each(json.buffers, function (bufferInfo, idx) {
                loading++;
                var path = bufferInfo.uri;

                self._loadBuffer(path, function (buffer) {
                    lib.buffers[idx] = buffer;
                    checkLoad();
                }, checkLoad);
            });

            function getResult() {
                return {
                    scene: self.rootNode ? null : rootNode,
                    rootNode: self.rootNode ? rootNode : null,
                    cameras: lib.cameras,
                    textures: lib.textures,
                    materials: lib.materials,
                    skeletons: lib.skeletons,
                    meshes: lib.meshes,
                    clips: lib.clips
                };
            }

            function afterLoadBuffer() {
                if (self.includeMesh) {
                    if (self.includeTexture) {
                        self._parseTextures(json, lib);
                    }
                    self._parseMaterials(json, lib);
                    self._parseMeshes(json, lib);
                }
                self._parseNodes(json, lib);

                // Only support one scene.
                var sceneInfo = json.scenes[json.scene];
                for (var i = 0; i < sceneInfo.nodes.length; i++) {
                    var node = lib.nodes[sceneInfo.nodes[i]];
                    node.update();
                    rootNode.add(node);
                }

                if (self.includeMesh) {
                    self._parseSkins(json, lib);
                }
                
                self.trigger('success', getResult());
            }

            return getResult();
        },

        _loadBuffer: function (path, onsuccess, onerror) {
            var rootPath = this.bufferRootPath;
            if (rootPath == null) {
                rootPath = this.rootPath;
            }
            if (rootPath) {
                path = rootPath + '/' + path;
            }
            request.get({
                url: path,
                responseType: 'arraybuffer',
                onload: function (buffer) {
                    onsuccess && onsuccess(buffer);
                },
                onerror: function (buffer) {
                    onerror && onerror(buffer);
                }
            });
        },

        // https://github.com/KhronosGroup/glTF/issues/100
        // https://github.com/KhronosGroup/glTF/issues/193
        _parseSkins: function (json, lib) {

            // Create skeletons and joints
            var haveInvBindMatrices = false;
            util.each(json.skins, function (skinInfo, idx) {
                var skeleton = new Skeleton({
                    name: skinInfo.name
                });
                for (var i = 0; i < skinInfo.joints.length; i++) {
                    var nodeIdx = skinInfo.joints[i];
                    var node = lib.nodes[nodeIdx];
                    var joint = new Joint({
                        name: node.name,
                        node: node,
                        index: skeleton.joints.length
                    });
                    skeleton.joints.push(joint);
                }
                lib.skeletons[name].relativeRootNode = lib.nodes[skinInfo.skeleton] || this.rootNode;
                if (skinInfo.inverseBindMatrices) {
                    haveInvBindMatrices = true;
                    var IBMInfo = skinInfo.inverseBindMatrices;
                    var bufferViewName = IBMInfo.bufferView;
                    var bufferViewInfo = json.bufferViews[bufferViewName];
                    var buffer = lib.buffers[bufferViewInfo.buffer];

                    var offset = (IBMInfo.byteOffset || 0) + (bufferViewInfo.byteOffset || 0);
                    var size = IBMInfo.count * 16;

                    var array = new vendor.Float32Array(buffer, offset, size);

                    skeleton.setJointMatricesArray(array);
                }
                else {
                    skeleton.updateJointMatrices();
                }
                lib.skeletons[idx] = skeleton;
            }, this);

            var shaderLib = this.shaderLibrary;
            var shaderName = this.shaderName;
            function enableSkinningForMesh(mesh, skeleton, jointIndices) {
                mesh.skeleton = skeleton;
                mesh.joints = jointIndices;
                // Make sure meshs with different joints not have same material.
                var originalShader = mesh.material.shader;
                var material = mesh.material.clone();
                mesh.material = material;
                if (material instanceof StandardMaterial) {
                    material.jointCount = jointIndices.length;
                }
                else {
                    material.shader = shaderLib.get(
                        shaderName, {
                            textures: originalShader.getEnabledTextures(),
                            vertexDefines: {
                                SKINNING: null,
                                JOINT_COUNT: jointIndices.length
                            }
                        }
                    );
                }
            }

            function getJointIndex(joint) {
                return joint.index;
            }

            util.each(json.nodes, function (nodeInfo) {
                if (nodeInfo.skin != null) {
                    var skinIdx = nodeInfo.skin;
                    var skeleton = lib.skeletons[skinIdx];

                    var node = lib.nodes[name];
                    var jointIndices = skeleton.joints.map(getJointIndex);
                    if (node instanceof Mesh) {
                        enableSkinningForMesh(node, skeleton, jointIndices);
                    }
                    else {
                        // Mesh have multiple primitives
                        var children = node.children();
                        for (var i = 0; i < children.length; i++) {
                            enableSkinningForMesh(children[i], skeleton, jointIndices);
                        }
                    }
                }
            }, this);
        },

        _parseTextures: function (json, lib) {
            var rootPath = this.textureRootPath;
            if (rootPath == null) {
                rootPath = this.rootPath;
            }
            util.each(json.textures, function (textureInfo, idx){
                // samplers is optional
                var samplerInfo = (json.samplers && json.samplers[textureInfo.sampler]) || {};
                var parameters = {};
                ['wrapS', 'wrapT', 'magFilter', 'minFilter'].forEach(function (name) {
                    var value = samplerInfo[name];
                    if (value != null) {
                        parameters[name] = value;
                    }
                });
                util.defaults(parameters, {
                    wrapS: Texture.REPEAT,
                    wrapT: Texture.REPEAT,
                    // PENDING
                    // https://github.com/KhronosGroup/glTF/issues/674
                    flipY: false
                });

                var target = textureInfo.target || glenum.TEXTURE_2D;
                // var format = textureInfo.format;
                // if (format != null) {
                //     parameters.format = format;
                // }

                if (target === glenum.TEXTURE_2D) {
                    var texture = new Texture2D(parameters);
                    var imageInfo = json.images[textureInfo.source];
                    texture.load(util.relative2absolute(imageInfo.uri, rootPath), this.crossOrigin);
                    lib.textures[idx] = texture;
                }
            }, this);
        },

        _KHRCommonMaterialToStandard: function (materialInfo, lib) {
            var uniforms = {};
            var commonMaterialInfo = materialInfo.extensions['KHR_materials_common'];
            uniforms = commonMaterialInfo.values;
            for (var symbol in uniforms) {
                var value = uniforms[symbol];
                if (typeof(value) === 'string') {
                    uniforms[symbol] = lib.textures[value] || null;
                }
            }
            var enabledTextures = [];
            if (uniforms['diffuse'] instanceof Texture2D) {
                enabledTextures.push('diffuseMap');
            }
            if (materialInfo.normalTexture) {
                enabledTextures.push('normalMap');
            }
            if (uniforms['emission'] instanceof Texture2D) {
                enabledTextures.push('emissiveMap');
            }
            var material;
            var isStandardMaterial = this.useStandardMaterial;
            if (isStandardMaterial) {
                material = new StandardMaterial({
                    name: materialInfo.name,
                    doubleSided: materialInfo.doubleSided
                });
            }
            else {
                var fragmentDefines = {};
                if (materialInfo.doubleSided) {
                    fragmentDefines.DOUBLE_SIDED = null;
                }
                material = new Material({
                    name: materialInfo.name,
                    shader: this.shaderLibrary.get(this.shaderName, {
                        fragmentDefines: fragmentDefines,
                        textures: enabledTextures
                    })
                });
            }

            if (materialInfo.transparent) {
                material.depthMask = false;
                material.depthTest = true;
                material.transparent = true;
            }

            var diffuseProp = uniforms['diffuse'];
            if (diffuseProp) {
                // Color
                if (diffuseProp instanceof Array) {
                    diffuseProp = diffuseProp.slice(0, 3);
                    isStandardMaterial ? (material.color = diffuseProp)
                        : material.set('color', diffuseProp);
                }
                else { // Texture
                    isStandardMaterial ? (material.diffuseMap = diffuseProp)
                        : material.set('diffuseMap', diffuseProp);
                }
            }
            var emissionProp = uniforms['emission'];
            if (emissionProp != null) {
                // Color
                if (emissionProp instanceof Array) {
                    emissionProp = emissionProp.slice(0, 3);
                    isStandardMaterial ? (material.emission = emissionProp)
                        : material.set('emission', emissionProp);
                }
                else { // Texture
                    isStandardMaterial ? (material.emissiveMap = emissionProp)
                        : material.set('emissiveMap', emissionProp);
                }
            }
            if (materialInfo.normalTexture != null) {
                // TODO texCoord
                var normalTextureIndex = materialInfo.normalTexture.index;
                if (isStandardMaterial) {
                    material.normalMap = lib.textures[normalTextureIndex];
                }
                else {
                    material.set('normalMap', lib.textures[normalTextureIndex]);
                }
            }
            if (uniforms['shininess'] != null) {
                var glossiness = Math.log(uniforms['shininess']) / Math.log(8192);
                // Uniform glossiness
                material.set('glossiness', glossiness);
                material.set('roughness', 1 - glossiness);
            }
            else {
                material.set('glossiness', 0.5);
                material.set('roughness', 0.5);
            }
            if (uniforms['specular'] != null) {
                material.set('specularColor', uniforms['specular'].slice(0, 3));
            }
            if (uniforms['transparency'] != null) {
                material.set('alpha', uniforms['transparency']);
            }

            return material;
        },

        _pbrToStandard: function (materialInfo, lib) {
            var alphaTest = materialInfo.alphaMode === 'MASK';
            var metallicRoughnessMatInfo = materialInfo.pbrMetallicRoughness;

            var isStandardMaterial = this.useStandardMaterial;
            var material;
            var diffuseMap, roughnessMap, metalnessMap, normalMap, emissiveMap;
            var enabledTextures = [];
                // TODO texCoord
            if (metallicRoughnessMatInfo.baseColorTexture) {
                diffuseMap = lib.textures[metallicRoughnessMatInfo.baseColorTexture.index];
                enabledTextures.push('diffuseMap');
            }
            if (metallicRoughnessMatInfo.metallicRoughnessTexture) {
                roughnessMap = lib.textures[metallicRoughnessMatInfo.metallicRoughnessTexture.index];
                enabledTextures.push('metalnessMap', 'roughnessMap');
            }
            if (materialInfo.normalTexture) {
                normalMap = lib.textures[materialInfo.normalTexture.index];
                enabledTextures.push('normalMap');
            }
            if (materialInfo.emissiveTexture) {
                emissiveMap = lib.textures[materialInfo.emissiveTexture.index];
                enabledTextures.push('emissiveMap');
            }

            var commonProperties = {
                diffuseMap: diffuseMap || null,
                roughnessMap: roughnessMap || null,
                metalnessMap: metalnessMap || null,
                normalMap: normalMap || null,
                emissiveMap: emissiveMap || null,
                color: metallicRoughnessMatInfo.baseColorFactor || [1, 1, 1],
                metalness: metallicRoughnessMatInfo.metallicFactor || 0,
                roughness: metallicRoughnessMatInfo.roughnessFactor || 0,
                emission: materialInfo.emissiveFactor || [0, 0, 0]
            }
            if (commonProperties.roughnessMap) {
                // PENDING
                if (metallicRoughnessMatInfo.metallicFactor == null) {
                    commonProperties.metalness = 0.5;
                }
                if (metallicRoughnessMatInfo.roughnessFactor == null) {
                    commonProperties.roughness = 0.5;
                }
            }
            if (isStandardMaterial) {
                material = new StandardMaterial(util.extend({
                    name: materialInfo.name,
                    alphaTest: alphaTest,
                    doubleSided: materialInfo.doubleSided,
                    // G channel
                    roughnessChannel: 1,
                    // B Channel
                    metalnessChannel: 2
                }, commonProperties));
            }
            else {
                var fragmentDefines = {
                    ROUGHNESS_CHANNEL: 1,
                    METALNESS_CHANNEL: 2,
                    USE_ROUGHNESS: null,
                    USE_METALNESS: null
                };
                if (alphaTest) {
                    fragmentDefines.ALPHA_TEST = null;
                }
                if (materialInfo.doubleSided) {
                    fragmentDefines.DOUBLE_SIDED = null;
                }
                material = new Material({
                    name: materialInfo.name,
                    shader: this.shaderLibrary.get(this.shaderName, {
                        fragmentDefines: fragmentDefines,
                        textures: enabledTextures
                    })
                });
                material.set(commonProperties);
            }

            if (materialInfo.alphaMode === 'BLEND') {
                material.depthMask = false;
                material.depthTest = true;
                material.transparent = true;
            }

            return material;
        },

        _parseMaterials: function (json, lib) {
            util.each(json.materials, function (materialInfo, idx) {
                if (materialInfo.extensions && materialInfo.extensions['KHR_materials_common']) {
                    lib.materials[idx] = this._KHRCommonMaterialToStandard(materialInfo, lib);
                }
                else if (materialInfo.pbrMetallicRoughness) {
                    lib.materials[idx] = this._pbrToStandard(materialInfo, lib);
                }
                // TODO
            }, this);
        },

        _parseMeshes: function (json, lib) {
            var self = this;

            util.each(json.meshes, function (meshInfo, idx) {
                lib.meshes[idx] = [];
                // Geometry
                for (var pp = 0; pp < meshInfo.primitives.length; pp++) {
                    var primitiveInfo = meshInfo.primitives[pp];
                    var geometry = new StaticGeometry({
                        boundingBox: new BoundingBox()
                    });
                    // Parse attributes
                    var semantics = Object.keys(primitiveInfo.attributes);
                    for (var ss = 0; ss < semantics.length; ss++) {
                        var semantic = semantics[ss];
                        var accessorIdx = primitiveInfo.attributes[semantic];
                        var attributeInfo = json.accessors[accessorIdx];
                        var attributeName = semanticAttributeMap[semantic];
                        if (!attributeName) {
                            continue;
                        }
                        var componentType = attributeInfo.componentType;
                        var attributeType = attributeInfo.type;
                        ArrayCtor = ({
                            5120: vendor.Int8Array,
                            5121: vendor.Uint8Array,
                            5122: vendor.Int16Array,
                            5123: vendor.Uint16Array,
                            5126: vendor.Float32Array
                        })[componentType] || vendor.Float32Array;

                        size = ({
                            SCALAR: 1,
                            VEC2: 2,
                            VEC3: 3,
                            VEC4: 4,
                            MAT2: 4,
                            MAT3: 9,
                            MAT4: 16
                        })[attributeType];

                        var bufferViewInfo = json.bufferViews[attributeInfo.bufferView];
                        var buffer = lib.buffers[bufferViewInfo.buffer];
                        // byteoffset is optional
                        var byteOffset = (bufferViewInfo.byteOffset || 0) + (attributeInfo.byteOffset || 0);

                        var size;
                        var ArrayCtor;
                        var attributeArray = new ArrayCtor(buffer, byteOffset, attributeInfo.count * size);
                        if (semantic === 'WEIGHTS_0' && size === 4) {
                            // Weight data in QTEK has only 3 component, the last component can be evaluated since it is normalized
                            var weightArray = new ArrayCtor(attributeInfo.count * 3);
                            for (var i = 0; i < attributeInfo.count; i++) {
                                weightArray[i * 3] = attributeArray[i * 4];
                                weightArray[i * 3 + 1] = attributeArray[i * 4 + 1];
                                weightArray[i * 3 + 2] = attributeArray[i * 4 + 2];
                            }
                            geometry.attributes[attributeName].value = weightArray;
                        }
                        else {
                            geometry.attributes[attributeName].value = attributeArray;
                        }
                        if (semantic === 'POSITION') {
                            // Bounding Box
                            var min = attributeInfo.min;
                            var max = attributeInfo.max;
                            if (min) {
                                geometry.boundingBox.min.set(min[0], min[1], min[2]);
                            }
                            if (max) {
                                geometry.boundingBox.max.set(max[0], max[1], max[2]);
                            }
                        }
                    }

                    // Parse indices
                    var indicesInfo = json.accessors[primitiveInfo.indices];

                    var bufferViewInfo = json.bufferViews[indicesInfo.bufferView];
                    var buffer = lib.buffers[bufferViewInfo.buffer];
                    var byteOffset = (bufferViewInfo.byteOffset || 0) + (indicesInfo.byteOffset || 0);

                    var IndicesCtor = indicesInfo.componentType === 0x1405 ? vendor.Uint32Array : vendor.Uint16Array;
                    geometry.indices = new IndicesCtor(buffer, byteOffset, indicesInfo.count);

                    var material = lib.materials[primitiveInfo.material];
                    // Use default material
                    if (!material) {
                        material = new Material({
                            shader: this.shaderLibrary.get(self.shaderName)
                        });
                    }
                    var mesh = new Mesh({
                        geometry: geometry,
                        material: material,
                        mode: [Mesh.POINTS, Mesh.LINES, Mesh.LINE_LOOP, Mesh.LINE_STRIP, Mesh.TRIANGLES, Mesh.TRIANGLE_STRIP, Mesh.TRIANGLE_FAN][primitiveInfo.mode] || Mesh.TRIANGLES
                    });
                    if (material.shader.isTextureEnabled('normalMap')) {
                        if (!mesh.geometry.attributes.tangent.value) {
                            mesh.geometry.generateTangents();
                        }
                    }

                    if (meshInfo.name) {
                        if (meshInfo.primitives.length > 1) {
                            mesh.name = [meshInfo.name, pp].join('-');
                        }
                        else {
                            mesh.name = meshInfo.name;
                        }
                    }

                    lib.meshes[idx].push(mesh);
                }
            }, this);
        },

        _instanceCamera: function (json, nodeInfo) {
            var cameraInfo = json.cameras[nodeInfo.camera];

            if (cameraInfo.type === 'perspective') {
                var perspectiveInfo = cameraInfo.perspective || {};
                return new PerspectiveCamera({
                    name: nodeInfo.name,
                    aspect: perspectiveInfo.aspectRatio,
                    fov: perspectiveInfo.yfov,
                    far: perspectiveInfo.zfar,
                    near: perspectiveInfo.znear
                });
            }
            else {
                var orthographicInfo = cameraInfo.orthographic || {};
                return new OrthographicCamera({
                    name: nodeInfo.name,
                    top: orthographicInfo.ymag,
                    right: orthographicInfo.xmag,
                    left: -orthographicInfo.xmag,
                    bottom: -orthographicInfo.ymag,
                    near: orthographicInfo.znear,
                    far: orthographicInfo.zfar
                });
            }
        },

        _parseNodes: function (json, lib) {

            function instanceMesh(mesh) {
                return new Mesh({
                    name: mesh.name,
                    geometry: mesh.geometry,
                    material: mesh.material,
                    mode: mesh.mode
                });
            }

            util.each(json.nodes, function (nodeInfo, idx) {
                var node;
                if (nodeInfo.camera != null && this.includeCamera) {
                    this._instanceCamera(nodeInfo.camera);
                    lib.cameras.push(node);
                }
                else if (nodeInfo.mesh != null && this.includeMesh) {
                    var primitives = lib.meshes[nodeInfo.mesh];
                    if (primitives) {
                        if (primitives.length === 1) {
                            // Replace the node with mesh directly
                            node = instanceMesh(primitives[0]);
                            node.setName(nodeInfo.name);
                        }
                        else {
                            node = new Node();
                            node.setName(nodeInfo.name);
                            for (var j = 0; j < primitives.length; j++) {
                                node.add(instanceMesh(primitives[j]));
                            }
                        }
                    }
                }
                else {
                    node = new Node();
                    node.setName(nodeInfo.name);
                }
                if (nodeInfo.matrix) {
                    node.localTransform.setArray(nodeInfo.matrix);
                    node.decomposeLocalTransform();
                }
                else {
                    if (nodeInfo.translation) {
                        node.position.setArray(nodeInfo.translation);
                    }
                    if (nodeInfo.rotation) {
                        node.rotation.setArray(nodeInfo.rotation);
                    }
                    if (nodeInfo.scale) {
                        node.scale.setArray(nodeInfo.scale);
                    }
                }

                lib.nodes[idx] = node;
            }, this);

            // Build hierarchy
            util.each(json.nodes, function (nodeInfo) {
                var node = lib.nodes[name];
                if (nodeInfo.children) {
                    for (var i = 0; i < nodeInfo.children.length; i++) {
                        var childIdx = nodeInfo.children[i];
                        var child = lib.nodes[childIdx];
                        node.add(child);
                    }
                }
            });
         },

        _parseAnimations: function (json, lib) {
            function getAccessorData(accessorIdx) {
                var accessorInfo = json.accessors[accessorIdx];

                var bufferViewInfo = json.bufferViews[accessorInfo.bufferView];
                var buffer = lib.buffers[bufferViewInfo.buffer];
                var byteOffset = (bufferViewInfo.byteOffset || 0) + (accessorInfo.byteOffset || 0);
                switch(accessorInfo.type) {
                    case 0x8B50:     // FLOAT_VEC2
                        var size = 2;
                        break;
                    case 0x8B51:     // FLOAT_VEC3
                        var size = 3;
                        break;
                    case 0x8B52:     // FLOAT_VEC4
                        var size = 4;
                        break;
                    case 0x1406:     // FLOAT
                        var size = 1;
                        break;
                }
                return new vendor.Float32Array(buffer, byteOffset, size * accessorInfo.count);
            }

            function checkChannelPath(channelInfo) {
                if (channelInfo.path === 'weights') {
                    console.warn('GLTFLoader not support morph targets yet.');
                    return false;
                }
                return true;
            }

            function getChannelHash(channelInfo, animationInfo) {
                return channelInfo.target.node + '_' + animationInfo.samplers[channelInfo.sampler].input;
            }


            util.each(json.animations, function (animationInfo, idx) {
                var channels = animationInfo.channels.filter(checkChannelPath);

                if (!channels.length) {
                    return;
                }

                var clips = {};
                for (var i = 0; i < channels.length; i++) {
                    var channelInfo = channels[i];
                    var channelHash = getChannelHash(channelInfo, animationInfo);

                    var targetNode = lib.nodes[channelInfo.target.node];
                    var clip = clips[channelHash];
                    if (!clip) {
                        clip = clips[channelHash] = new SamplerClip({
                            target: targetNode,
                            name: targetNode ? targetNode.name : '',
                            targetNodeIndex: channelInfo.target.node
                        });
                        clip.channels.time = getAccessorData(channelInfo.input);
                        // TODO May have same buffer data ?
                        for (var i = 0; i < clip.channels.time.length; i++) {
                            clip.channels.time[i] *= 1000;
                        }
                    }

                    var samplerInfo = animationInfo.samplers[channelInfo.sampler];
                    
                    var interpolation = samplerInfo.interpolation || 'LINEAR';
                    if (interpolation !== 'LINEAR') {
                        console.warn('GLTFLoader only support LINEAR interpolation.');
                    }

                    clip.channels[channelInfo.path] = getAccessorData(samplerInfo.output);
                }

                for (var key in clips) {
                    lib.clips.push(clips[key]);
                }
            }, this);

            return lib.clips;
        }
    });

    return GLTFLoader;
});
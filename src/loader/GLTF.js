/**
 * glTF Loader
 * Specification https://github.com/KhronosGroup/glTF/blob/master/specification/README.md
 *
 * TODO https://github.com/KhronosGroup/glTF/issues/298
 */
define(function(require) {

    'use strict';

    var Base = require('../core/Base');
    var request = require('../core/request');
    var util = require('../core/util');
    var vendor = require('../core/vendor');

    var Scene = require('../Scene');
    var Shader = require('../Shader');
    var Material = require('../Material');
    var Mesh = require('../Mesh');
    var Node = require('../Node');
    var Texture = require('../Texture');
    var Texture2D = require('../Texture2D');
    var TextureCube = require('../TextureCube');
    var shaderLibrary = require('../shader/library');
    var Skeleton = require('../Skeleton');
    var Joint = require('../Joint');
    var PerspectiveCamera = require('../camera/Perspective');
    var OrthographicCamera = require('../camera/Orthographic');
    var PointLight = require('../light/Point');
    var SpotLight = require('../light/Spot');
    var DirectionalLight = require('../light/Directional');
    var glenum = require('../core/glenum');

    var Vector3 = require('../math/Vector3');
    var Quaternion = require('../math/Quaternion');
    var BoundingBox = require('../math/BoundingBox');

    var SamplerClip = require('../animation/SamplerClip');
    var SkinningClip = require('../animation/SkinningClip');

    var StaticGeometry = require('../StaticGeometry');

    var glMatrix = require('../dep/glmatrix');
    var quat = glMatrix.quat;

    // Import buildin shader
    require('../shader/buildin');

    var semanticAttributeMap = {
        'NORMAL': 'normal',
        'POSITION': 'position',
        'TEXCOORD_0': 'texcoord0',
        'WEIGHT': 'weight',
        'JOINT': 'joint',
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
    var GLTFLoader = Base.derive(
    /** @lends qtek.loader.GLTF# */
    {
        /**
         * @type {qtek.Node}
         */
        rootNode: null,
        /**
         * @type {string}
         */
        rootPath: '',

        /**
         * @type {string}
         */
        textureRootPath: '',

        /**
         * @type {string}
         */
        bufferRootPath: '',

        /**
         * @type {string}
         */
        shaderName: 'buildin.standard',

        /**
         * @type {boolean}
         */
        includeCamera: true,

        /**
         * @type {boolean}
         */
        includeLight: true,

        /**
         * @type {boolean}
         */
        includeAnimation: true,
        /**
         * @type {boolean}
         */
        includeMesh: true
    },

    /** @lends qtek.loader.GLTF.prototype */
    {
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
         * @return {qtek.loader.GLTF.IResult}
         */
        parse: function(json) {
            var self = this;
            var loading = 0;

            var lib = {
                buffers: {},
                materials: {},
                textures: {},
                meshes: {},
                joints: {},
                skeletons: {},
                cameras: {},
                nodes: {}
            };
            // Mount on the root node if given
            var rootNode = this.rootNode || new Scene();
            // Load buffers
            util.each(json.buffers, function(bufferInfo, name) {
                loading++;
                self._loadBuffer(bufferInfo.path, function(buffer) {
                    lib.buffers[name] = buffer;
                    loading--;
                    if (loading === 0) {
                        afterLoadBuffer();
                    }
                }, function() {
                    loading--;
                    if (loading === 0) {
                        afterLoadBuffer();
                    }
                });
            });

            function afterLoadBuffer() {
                if (self.includeMesh) {
                    self._parseTextures(json, lib);
                    self._parseMaterials(json, lib);
                    self._parseMeshes(json, lib);
                }
                self._parseNodes(json, lib);

                var sceneInfo = json.scenes[json.scene];
                for (var i = 0; i < sceneInfo.nodes.length; i++) {
                    var node = lib.nodes[sceneInfo.nodes[i]];
                    node.update();
                    rootNode.add(node);
                }

                if (self.includeMesh) {
                    self._parseSkins(json, lib);
                }

                if (self.includeAnimation) {
                    var clip = self._parseAnimations(json, lib);
                    if (clip) {
                        for (var name in lib.skeletons) {
                            lib.skeletons[name].addClip(clip);
                        }
                    }   
                }

                self.trigger('success', {
                    scene: self.rootNode ? null : rootNode,
                    rootNode: self.rootNode ? rootNode : null,
                    cameras: lib.cameras,
                    textures: lib.textures,
                    materials: lib.materials,
                    skeletons: lib.skeletons,
                    meshes: lib.meshes,
                    clip: clip
                });
            }

            return {
                scene: self.rootNode ? null : rootNode,
                rootNode: self.rootNode ? rootNode : null,
                cameras: lib.cameras,
                textures: lib.textures,
                materials: lib.materials,
                skeletons: lib.skeletons,
                meshes: lib.meshes,
                clip: null
            };
        },

        _loadBuffer: function(path, onsuccess, onerror) {
            var root = this.bufferRootPath || this.rootPath;
            if (root) {
                path = root + '/' + path;
            }
            request.get({
                url: path,
                responseType: 'arraybuffer',
                onload: function(buffer) {
                    onsuccess && onsuccess(buffer);
                },
                onerror: function(buffer) {
                    onerror && onerror(buffer);
                }
            });
        },

        // https://github.com/KhronosGroup/glTF/issues/100
        // https://github.com/KhronosGroup/glTF/issues/193
        _parseSkins: function(json, lib) {

            // Create skeletons and joints
            var haveInvBindMatrices = false;
            for (var name in json.skins) {
                var skinInfo = json.skins[name];
                var skeleton = new Skeleton({
                    name: name
                });
                for (var i = 0; i < skinInfo.joints.length; i++) {
                    var jointId = skinInfo.joints[i];
                    var joint = new Joint({
                        name: jointId,
                        index: skeleton.joints.length
                    });
                    skeleton.joints.push(joint);
                }
                if (skinInfo.inverseBindMatrices) {
                    haveInvBindMatrices = true;
                    var IBMInfo = skinInfo.inverseBindMatrices;
                    var bufferViewName = IBMInfo.bufferView;
                    var bufferViewInfo = json.bufferViews[bufferViewName];
                    var buffer = lib.buffers[bufferViewInfo.buffer];

                    var offset = IBMInfo.byteOffset + bufferViewInfo.byteOffset;
                    var size = IBMInfo.count * 16;

                    var array = new vendor.Float32Array(buffer, offset, size);

                    skeleton._invBindPoseMatricesArray = array;
                    skeleton._skinMatricesArray = new vendor.Float32Array(array.length);
                }
                lib.skeletons[name] = skeleton;
            }

            var bindNodeToJoint = function(jointsMap, nodeName, parentIndex, rootNode) {
                var node = lib.nodes[nodeName];
                var nodeInfo = json.nodes[nodeName];
                var joint = jointsMap[nodeInfo.jointId];
                if (joint) {
                    // throw new Error('Joint bind to ' + nodeInfo.name + ' doesn\'t exist in skin');
                    joint.node = node;
                    joint.parentIndex = parentIndex;
                    joint.rootNode = rootNode;
                    parentIndex = joint.index;
                }
                else {
                    // Some root node may be a simple transform joint, without deformation data.
                    // Which is, no vertex is attached to the joint
                    // PENDING
                    joint = new Joint({
                        node: node,
                        rootNode: rootNode,
                        parentIndex: parentIndex
                    });
                }

                for (var i = 0; i < nodeInfo.children.length; i++) {
                    bindNodeToJoint(jointsMap, nodeInfo.children[i], parentIndex, rootNode);
                }

                return joint;
            };

            var getJointIndex = function(joint) {
                return joint.index;
            };

            var instanceSkins = {};

            for (var name in json.nodes) {

                var nodeInfo = json.nodes[name];

                if (nodeInfo.instanceSkin) {
                    var skinName = nodeInfo.instanceSkin.skin;
                    var skeleton = lib.skeletons[skinName];
                    instanceSkins[skinName] = skeleton;

                    var node = lib.nodes[name];
                    var jointIndices = skeleton.joints.map(getJointIndex);
                    if (node instanceof Mesh) {
                        node.skeleton = skeleton;
                        node.joints = jointIndices;
                        var material = node.material;
                        material.shader = material.shader.clone();
                        material.shader.define('vertex', 'SKINNING');
                        material.shader.define('vertex', 'JOINT_NUMBER', jointIndices.length);
                    } else {
                        // Mesh have multiple primitives
                        for (var i = 0; i < node._children.length; i++) {
                            var child = node._children[i];
                            if (child.skeleton) {
                                child.skeleton = skeleton;
                                child.joints = jointIndices;
                                var material = child.material;
                                material.shader = material.shader.clone();
                                material.shader.define('vertex', 'SKINNING');
                                material.shader.define('vertex', 'JOINT_NUMBER', jointIndices.length);
                            }
                        }
                    }

                    var jointsMap = {};
                    for (var i = 0; i < skeleton.joints.length; i++) {
                        var joint = skeleton.joints[i];
                        jointsMap[joint.name] = joint;
                    }
                    // Build up hierarchy from root nodes
                    var rootNodes = nodeInfo.instanceSkin.skeletons;
                    for (i = 0; i < rootNodes.length; i++) {
                        var rootNode = lib.nodes[rootNodes[i]];
                        var rootJoint = bindNodeToJoint(jointsMap, rootNodes[i], -1, rootNode);
                        // Root joint may not in the skeleton
                        if (rootJoint) {
                            skeleton.roots.push(rootJoint);
                        }
                    }
                }
            }

            for (var name in instanceSkins) {
                var skeleton = instanceSkins[name];
                if (haveInvBindMatrices) {
                    skeleton.updateMatricesSubArrays();
                } else {
                    skeleton.updateJointMatrices();
                }
                skeleton.update();
            }
        },     

        _parseTextures: function(json, lib) {
            var root = this.textureRootPath || this.rootPath;
            util.each(json.textures, function(textureInfo, name){
                var samplerInfo = json.samplers[textureInfo.sampler];
                var parameters = {};
                ['wrapS', 'wrapT', 'magFilter', 'minFilter']
                .forEach(function(name) {
                    var value = samplerInfo[name];
                    if (value !== undefined) {
                        if (typeof(value) === 'string') {
                            // DEPRECATED, sampler parameter now use gl enum instead of string
                            value = glenum[value];
                        }
                        parameters[name] = value;   
                    }
                });

                var target = textureInfo.target;
                var format = textureInfo.format;
                if (typeof(target) === 'string') {
                    // DEPRECATED
                    target = glenum[target];
                    format = glenum[format];
                }
                parameters.format = format;

                if (target === glenum.TEXTURE_2D) {
                    var texture = new Texture2D(parameters);
                    var imageInfo = json.images[textureInfo.source];
                    texture.load(util.relative2absolute(imageInfo.path, root));
                    lib.textures[name] = texture;
                } else if(target === glenum.TEXTURE_CUBE_MAP) {
                    // TODO
                }
            }, this);
        },

        // Only phong material is support yet
        // TODO support custom material
        _parseMaterials: function(json, lib) {
            var techniques = {};
            // Parse techniques
            for (var name in json.techniques) {
                var techniqueInfo = json.techniques[name];
                // Default phong shader
                // var shader = new Shader({
                //     vertex: Shader.source('buildin.phong.vertex'),
                //     fragment: Shader.source('buildin.phong.fragment')
                // });
                techniques[name] = {
                    // shader: shader,
                    pass: techniqueInfo.passes[techniqueInfo.pass]
                };
            }
            for (var name in json.materials) {
                var materialInfo = json.materials[name];

                var instanceTechniqueInfo = materialInfo.instanceTechnique;
                var technique = techniques[instanceTechniqueInfo.technique];
                var pass = technique.pass;
                var uniforms = {};

                uniforms = instanceTechniqueInfo.values;
                for (var symbol in uniforms) {
                    var value = uniforms[symbol];
                    // TODO: texture judgement should be more robust
                    if (typeof(value) === 'string' && lib.textures[value]) {
                        uniforms[symbol] = lib.textures[value];
                    }
                }
                var enabledTextures = [];
                if (uniforms['diffuse'] instanceof Texture2D) {
                    enabledTextures.push('diffuseMap');
                }
                if (uniforms['normalMap'] instanceof Texture2D) {
                    enabledTextures.push('normalMap');
                }
                var material = new Material({
                    name: materialInfo.name,
                    shader: shaderLibrary.get(this.shaderName, enabledTextures)
                });
                if (pass.states.depthMask !== undefined) {
                    material.depthMask = pass.states.depthMask;
                }
                if (pass.states.depthTestEnable !== undefined) {
                    material.depthTest = pass.states.depthTestEnable;
                }
                material.cullFace = pass.states.cullFaceEnable || false;
                if (pass.states.blendEnable) {
                    material.transparent = true;
                    // TODO blend Func and blend Equation
                }

                if (uniforms['diffuse']) {
                    // Color
                    if (uniforms['diffuse'] instanceof Array) {
                        material.set('color', uniforms['diffuse'].slice(0, 3));
                    } else { // Texture
                        material.set('diffuseMap', uniforms['diffuse']);
                    }
                }
                if (uniforms['normalMap'] !== undefined) {
                    material.set('normalMap', uniforms['normalMap']);
                }
                if (uniforms['emission'] !== undefined) {
                    material.set('emission', uniforms['emission'].slice(0, 3));
                }
                if (uniforms['shininess'] !== undefined) {
                    material.set('glossiness', Math.log(uniforms['shininess']) / Math.log(8192));
                    material.set('shininess', uniforms['shininess']);
                } else {
                    material.set('glossiness', 0.5);
                    material.set('shininess', 0.5);
                }
                if (uniforms['specular'] !== undefined) {
                    material.set('specularColor', uniforms['specular'].slice(0, 3));
                }
                if (uniforms['transparency'] !== undefined) {
                    material.set('alpha', uniforms['transparency']);
                }

                lib.materials[name] = material;
            }
        },

        _parseMeshes: function(json, lib) {
            var self = this;

            var meshKeys = Object.keys(json.meshes);
            for (var nn = 0; nn < meshKeys.length; nn++) {
                var name = meshKeys[nn];
                var meshInfo = json.meshes[name];

                lib.meshes[name] = [];
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
                        var accessorName = primitiveInfo.attributes[semantic];
                        var attributeInfo = json.accessors[accessorName];
                        var attributeName = semanticAttributeMap[semantic];
                        if (!attributeName) {
                            continue;
                        }
                        var attributeType = attributeInfo.type;
                        var bufferViewInfo = json.bufferViews[attributeInfo.bufferView];
                        var buffer = lib.buffers[bufferViewInfo.buffer];
                        var byteOffset = bufferViewInfo.byteOffset + attributeInfo.byteOffset;

                        var size;
                        var ArrayCtor;
                        var type;
                        switch(attributeType) {
                            case 0x8B50:     // FLOAT_VEC2
                                size = 2;
                                type = 'float';
                                ArrayCtor = vendor.Float32Array;
                                break;
                            case 0x8B51:     // FLOAT_VEC3
                                size = 3;
                                type = 'float';
                                ArrayCtor = vendor.Float32Array;
                                break;
                            case 0x8B52:     // FLOAT_VEC4
                                size = 4;
                                type = 'float';
                                ArrayCtor = vendor.Float32Array;
                                break;
                            case 0x1406:     // FLOAT
                                size = 1;
                                type = 'float';
                                ArrayCtor = vendor.Float32Array;
                                break;
                            default:
                                console.warn('Attribute type '+attributeInfo.type+' not support yet');
                                break;
                        }
                        var attributeArray = new ArrayCtor(buffer, byteOffset, attributeInfo.count * size);
                        if (semantic === 'WEIGHT' && size === 4) {
                            // Weight data in QTEK has only 3 component, the last component can be evaluated since it is normalized
                            var weightArray = new ArrayCtor(attributeInfo.count * 3);
                            for (var i = 0; i < attributeInfo.count; i++) {
                                weightArray[i * 3] = attributeArray[i * 4];
                                weightArray[i * 3 + 1] = attributeArray[i * 4 + 1];
                                weightArray[i * 3 + 2] = attributeArray[i * 4 + 2];
                            }
                            geometry.attributes[attributeName].value = weightArray;
                        } else {
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
                    var byteOffset = bufferViewInfo.byteOffset + indicesInfo.byteOffset;

                    // index uint
                    if (indicesInfo.type === 0x1405) { // UNSIGNED_INT
                        geometry.faces = new vendor.Uint32Array(buffer, byteOffset, indicesInfo.count);
                    }
                    else { // UNSIGNED_SHORT, 0x1403
                        geometry.faces = new vendor.Uint16Array(buffer, byteOffset, indicesInfo.count);
                    }

                    var material = lib.materials[primitiveInfo.material];
                    //Collada export from blender may not have default material
                    if (!material) {
                        material = new Material({
                            shader: shaderLibrary.get(self.shaderName)
                        });
                    }
                    var mesh = new Mesh({
                        geometry: geometry,
                        material: material
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
                            // PENDING name or meshInfo.name ?
                            mesh.name = meshInfo.name;
                        }
                    }

                    lib.meshes[name].push(mesh);
                }
            }
        },

        _parseNodes: function(json, lib) {

            for (var name in json.nodes) {
                var nodeInfo = json.nodes[name];
                var node;
                if (nodeInfo.camera && this.includeCamera) {
                    var cameraInfo = json.cameras[nodeInfo.camera];

                    if (cameraInfo.projection === 'perspective') {
                        node = new PerspectiveCamera({
                            name: nodeInfo.name,
                            aspect: cameraInfo.aspect_ratio,
                            fov: cameraInfo.xfov,
                            far: cameraInfo.zfar,
                            near: cameraInfo.znear
                        });
                    } else {
                        // TODO
                        node = new OrthographicCamera();
                        console.warn('TODO:Orthographic camera');
                    }
                    node.setName(nodeInfo.name);
                    lib.cameras[nodeInfo.name] = node;
                }
                else if (nodeInfo.lights && this.includeLight) {
                    var lights = [];
                    for (var i = 0; i < nodeInfo.lights.length; i++) {
                        var lightInfo = json.lights[nodeInfo.lights[i]];
                        var light = this._parseLight(lightInfo);
                        if (light) {
                            lights.push(light);
                        }
                    }
                    if (lights.length == 1) {
                        // Replace the node with light
                        node = lights[0];
                        node.setName(nodeInfo.name);
                    } else {
                        node = new Node();
                        node.setName(nodeInfo.name);
                        for (var i = 0; i < lights.length; i++) {
                            node.add(lights[i]);
                        }
                    }
                }
                else if ((nodeInfo.meshes || nodeInfo.instanceSkin) && this.includeMesh) {
                    // TODO one node have multiple meshes ?
                    var meshKey;
                    if (nodeInfo.meshes) {
                        meshKey = nodeInfo.meshes[0];
                    } else {
                        meshKey = nodeInfo.instanceSkin.sources[0];
                    }
                    if (meshKey) {
                        var primitives = lib.meshes[meshKey];
                        if (primitives) {
                            if (primitives.length === 1) {
                                // Replace the node with mesh directly
                                node = primitives[0];
                                node.setName(nodeInfo.name);
                            } else {
                                node = new Node();
                                node.setName(nodeInfo.name);
                                for (var j = 0; j < primitives.length; j++) {                            
                                    if (nodeInfo.instanceSkin) {
                                        primitives[j].skeleton = nodeInfo.instanceSkin.skin;
                                    }
                                    node.add(primitives[j]);
                                }   
                            }
                        }
                    }
                } else {
                    node = new Node();
                    node.setName(nodeInfo.name);
                }
                if (nodeInfo.matrix) {
                    for (var i = 0; i < 16; i++) {
                        node.localTransform._array[i] = nodeInfo.matrix[i];
                    }
                    node.decomposeLocalTransform();
                } else {
                    if (nodeInfo.translation) {
                        node.position.setArray(nodeInfo.translation);
                    }
                    if (nodeInfo.rotation) {
                        // glTF use axis angle in rotation
                        // https://github.com/KhronosGroup/glTF/issues/144
                        quat.setAxisAngle(node.rotation._array, nodeInfo.rotation.slice(0, 3), nodeInfo.rotation[3]);
                        node.rotation._dirty = true;
                    }
                    if (nodeInfo.scale) {
                        node.scale.setArray(nodeInfo.scale);
                    }
                }

                lib.nodes[name] = node;
            }

            // Build hierarchy
            for (var name in json.nodes) {
                var nodeInfo = json.nodes[name];
                var node = lib.nodes[name];
                if (nodeInfo.children) {
                    for (var i = 0; i < nodeInfo.children.length; i++) {
                        var childName = nodeInfo.children[i];
                        var child = lib.nodes[childName];
                        node.add(child);
                    }
                }
            }
         },

        _parseLight: function(lightInfo) {
            // TODO Light parameters
            switch(lightInfo.type) {
                case 'point':
                    var light = new PointLight({
                        name: lightInfo.id,
                        color: lightInfo.point.color,
                    });
                    break;
                case 'spot':
                    var light = new SpotLight({
                        name: lightInfo.id,
                        color: lightInfo.spot.color
                    });
                    break;
                case 'directional':
                    var light = new DirectionalLight({
                        name: lightInfo.id,
                        color: lightInfo.directional.color
                    });
                    break;
                default:
                    console.warn('Light ' + lightInfo.type + ' not support yet');
            }

            return light;
        },

        _parseAnimations: function(json, lib) {
            // TODO Only support nodes animation now
            var clip = new SkinningClip();
            // Default loop the skinning animation
            clip.setLoop(true);
            var haveAnimation = false;

            var jointClips = {};

            var quatTmp = quat.create();

            for (var animName in json.animations) {
                haveAnimation = true;
                var animationInfo = json.animations[animName];
                var parameters = {};

                for (var paramName in animationInfo.parameters) {
                    var accessorName = animationInfo.parameters[paramName];
                    var accessorInfo = json.accessors[accessorName];

                    var bufferViewInfo = json.bufferViews[accessorInfo.bufferView];
                    var buffer = lib.buffers[bufferViewInfo.buffer];
                    var byteOffset = bufferViewInfo.byteOffset + accessorInfo.byteOffset;
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
                    parameters[paramName] = new vendor.Float32Array(buffer, byteOffset, size * accessorInfo.count);
                }

                if (!parameters.TIME || !animationInfo.channels.length) {
                    continue;
                }

                // Use the first channels target
                var targetId = animationInfo.channels[0].target.id;
                var targetNode = lib.nodes[targetId];

                // glTF use axis angle in rotation, convert to quaternion
                // https://github.com/KhronosGroup/glTF/issues/144
                var rotationArr = parameters.rotation;
                if (rotationArr) {
                    for (var i = 0; i < parameters.TIME.length; i++) {
                        parameters.TIME[i] *= 1000;
                        var offset = i * 4;
                        if (rotationArr) {
                            quatTmp[0] = rotationArr[offset];
                            quatTmp[1] = rotationArr[offset + 1];
                            quatTmp[2] = rotationArr[offset + 2];
                            quat.setAxisAngle(quatTmp, quatTmp, rotationArr[offset + 3]);
                            parameters.rotation[offset] = quatTmp[0];
                            parameters.rotation[offset + 1] = quatTmp[1];
                            parameters.rotation[offset + 2] = quatTmp[2];
                            parameters.rotation[offset + 3] = quatTmp[3];
                        }
                    }
                }

                // TODO
                // if (jointClips[targetId]) {
                //     continue;
                // }
                jointClips[targetId] = new SamplerClip({
                    name: targetNode.name
                });
                var jointClip = jointClips[targetId];
                jointClip.channels.time = parameters.TIME;
                jointClip.channels.rotation = parameters.rotation || null;
                jointClip.channels.position = parameters.translation || null;
                jointClip.channels.scale = parameters.scale || null;
                jointClip.life = parameters.TIME[parameters.TIME.length - 1];
            }

            for (var targetId in jointClips) {
                clip.addJointClip(jointClips[targetId]);
            }

            if (haveAnimation) {
                return clip;
            } else {
                return null;
            }
        }
    });

    return GLTFLoader;
});
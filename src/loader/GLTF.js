/**
 * glTF Loader
 * Specification : https://github.com/KhronosGroup/glTF/blob/master/specification/README.md
 */
define(function(require) {

    'use strict';

    var Base = require('../core/Base');
    var request = require("../core/request");
    var util = require('../core/util');

    var Scene = require('../Scene');
    var Shader = require("../Shader");
    var Material = require("../Material");
    var Mesh = require("../Mesh");
    var Node = require("../Node");
    var Texture = require('../Texture');
    var Texture2D = require("../texture/Texture2D");
    var TextureCube = require("../texture/TextureCube");
    var shaderLibrary = require("../shader/library");
    var Skeleton = require("../Skeleton");
    var Joint = require("../Joint");
    var PerspectiveCamera = require("../camera/Perspective");
    var OrthographicCamera = require("../camera/Orthographic");
    var PointLight = require("../light/Point");
    var SpotLight = require("../light/Spot");
    var DirectionalLight = require("../light/Directional");
    var glenum = require("../core/glenum");

    var Vector3 = require("../math/Vector3");
    var Quaternion = require("../math/Quaternion");
    var BoundingBox = require('../math/BoundingBox');

    var TransformClip = require("../animation/TransformClip");
    var SkinningClip = require("../animation/SkinningClip");
    
    var _ = require("_");

    var StaticGeometry = require("../StaticGeometry");

    var glMatrix = require("glmatrix");
    var vec4 = glMatrix.vec4;
    var vec3 = glMatrix.vec3;
    var quat = glMatrix.quat;

    var semanticAttributeMap = {
        'NORMAL' : 'normal',
        'POSITION' : 'position',
        'TEXCOORD_0' : 'texcoord0',
        'WEIGHT' : 'weight',
        'JOINT' : 'joint',
        'COLOR' : 'color'
    }

    var Loader = Base.derive(function() {
        return {
            rootPath : "",
            textureRootPath : "",
            bufferRootPath : "",

            shaderName : 'buildin.phong'
        };
    }, {
        
        load : function(url) {
            var self = this;

            if (!this.rootPath) {
                this.rootPath = url.slice(0, url.lastIndexOf("/"));
            }

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
                    self.parse(JSON.parse(data));
                }
            });
        },

        parse : function(json) {
            var self = this;
            var loading = 0;

            var lib = {
                buffers : {},
                materials : {},
                textures : {},
                meshes : {},
                joints : {},
                skeletons : {},
                cameras : {},
                nodes : {}
            };
            // Build scene
            var scene = new Scene();
            // Load buffers
            _.each(json.buffers, function(bufferInfo, name) {
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
                self._parseTextures(json, lib);
                self._parseMaterials(json, lib);
                self._parseMeshes(json, lib);
                self._parseNodes(json, lib);

                var sceneInfo = json.scenes[json.scene];
                for (var i = 0; i < sceneInfo.nodes.length; i++) {
                    if (lib.joints[sceneInfo.nodes[i]]) {
                        // Skip joint node
                        continue;
                    }
                    var node = lib.nodes[sceneInfo.nodes[i]];
                    node.update();
                    scene.add(node);
                }

                var isOldVersion = false;
                for (var name in json.skins) {
                    if (json.skins[name].roots) {
                        isOldVersion = true;
                        break;
                    }
                }
                if (isOldVersion) {
                    self._parseSkins(json, lib);
                } else {
                    self._parseSkins2(json, lib);
                }

                self.trigger("success", {
                    scene : scene,
                    cameras : lib.cameras,
                    textures : lib.textures,
                    materials : lib.materials,
                    skeletons : lib.skeletons
                });
            }

            return {
                scene : scene,
                cameras : lib.cameras,
                textures : lib.textures,
                materials : lib.materials,
                skeletons : lib.skeletons
            }
        },

        _loadBuffer : function(path, onsuccess, onerror) {
            var root = this.bufferRootPath || this.rootPath;
            if (root) {
                path = root + "/" + path;
            }
            request.get({
                url : path,
                responseType : "arraybuffer",
                onload : function(buffer) {
                    onsuccess && onsuccess(buffer);
                },
                onerror : function(buffer) {
                    onerror && onerror(buffer);
                }
            });
        },

        // https://github.com/KhronosGroup/glTF/issues/100
        // https://github.com/KhronosGroup/glTF/issues/193
        _parseSkins2 : function(json, lib) {
            var self = this;

            // Create skeletons and joints
            for (var name in json.skins) {
                var skinInfo = json.skins[name];
                var skeleton = new Skeleton({
                    name : name
                });
                for (var i = 0; i < skinInfo.joints.length; i++) {
                    var jointId = skinInfo.joints[i];
                    var joint = new Joint({
                        name : jointId,
                        index : skeleton.joints.length
                    });
                    skeleton.joints.push(joint);
                }
                lib.skeletons[name] = skeleton;
            }

            var bindNodeToJoint = function(jointsMap, nodeName, parentIndex) {
                var node = lib.nodes[nodeName];
                var nodeInfo = json.nodes[nodeName];
                var joint = jointsMap[nodeInfo.jointId];
                // TODO 
                // collada2gltf may have jointId in node but corresponding skin doesn't have this jointId
                // maybe because the joint has no weight on the skinned mesh, so converter removed it for optimization
                // Skip it ??
                // wired
                if (joint) {
                    // throw new Error('Joint bind to ' + nodeInfo.name + ' doesn\'t exist in skin');
                    joint.node = node;
                    joint.parentIndex = parentIndex;

                    parentIndex = joint.index;
                }

                for (var i = 0; i < nodeInfo.children.length; i++) {
                    bindNodeToJoint(jointsMap, nodeInfo.children[i], parentIndex);
                }

                return joint;
            }

            for (var name in json.nodes) {

                var nodeInfo = json.nodes[name];

                if (nodeInfo.instanceSkin) {
                    var skinName = nodeInfo.instanceSkin.skin;
                    var skeleton = lib.skeletons[skinName];

                    var node = lib.nodes[name];
                    var jointIndices = skeleton.joints.map(function(joint) {
                        return joint.index;
                    });
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
                        var rootJoint = bindNodeToJoint(jointsMap, rootNodes[i], -1);
                        skeleton.roots.push(rootJoint);
                    }
                }
            }

            for (var name in lib.skeletons) {
                var skeleton = lib.skeletons[name];
                skeleton.updateJointMatrices();
                skeleton.update();
            }
        },     

        // DEPRECATED
        _parseSkins : function(json, lib) {
            var self = this;

            var createJoint = function(nodeName, parentIndex, skeleton) {
                var nodeInfo = json.nodes[nodeName];
                nodeInfo._isJoint = true;
                // Cast node to joint
                var joint = new Joint();
                joint.name = nodeName;
                var node = lib.nodes[nodeName];
                joint.node = node;
                joint.index = skeleton.joints.length;
                if (parentIndex !== undefined) {
                    joint.parentIndex = parentIndex;
                }
                
                skeleton.joints.push(joint);
                lib.joints[nodeName] = joint;
                
                for (var i = 0; i < nodeInfo.children.length; i++) {
                    var child = createJoint(nodeInfo.children[i], joint.index, skeleton);
                }
                return joint;
            }

            for (var name in json.skins) {
                var skinInfo = json.skins[name];
                var skeleton = new Skeleton({
                    name : name
                });
                for (var i = 0; i < skinInfo.roots.length; i++) {
                    var rootJointName = skinInfo.roots[i];
                    var rootJoint = createJoint(rootJointName, undefined, skeleton);
                    if (rootJoint) {
                        skeleton.roots.push(rootJoint);
                    }
                }
                if (skeleton.joints.length) {
                    lib.skeletons[name] = skeleton;
                    skeleton.updateJointMatrices();
                    skeleton.update();
                }
            }

            for (var name in lib.meshes) {
                var meshList = lib.meshes[name];
                for (var i = 0; i < meshList.length; i++) {
                    var mesh = meshList[i];
                    if (mesh.skeleton) {
                        var material = mesh.material;
                        mesh.skeleton = lib.skeletons[mesh.skeleton];
                        if (mesh.skeleton) {
                            for (var j = 0; j < mesh.skeleton.joints.length; j++) {
                                mesh.joints.push(j);
                            }
                            material.shader = material.shader.clone();
                            material.shader.define('vertex', 'SKINNING');
                            material.shader.define('vertex', 'JOINT_NUMBER', mesh.joints.length);
                        } 
                    }
                }
            }
        },

        _parseTextures : function(json, lib) {
            var root = this.textureRootPath || this.rootPath;
            _.each(json.textures, function(textureInfo, name){
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
        // TODO : support custom material
        _parseMaterials : function(json, lib) {
            var self = this;
            var techniques = {};
            // Parse techniques
            for (var name in json.techniques) {
                var techniqueInfo = json.techniques[name];
                // Default phong shader
                // var shader = new Shader({
                //     vertex : Shader.source("buildin.phong.vertex"),
                //     fragment : Shader.source("buildin.phong.fragment")
                // });
                techniques[name] = {
                    // shader : shader,
                    pass : techniqueInfo.passes[techniqueInfo.pass]
                }
            }
            for (var name in json.materials) {
                var materialInfo = json.materials[name];

                var instanceTechniqueInfo = materialInfo.instanceTechnique;
                var technique = techniques[instanceTechniqueInfo.technique];
                var pass = technique.pass;
                var uniforms = {};
                // DEPRECATED
                // https://github.com/KhronosGroup/glTF/issues/108
                // https://github.com/KhronosGroup/glTF/issues/110
                if (instanceTechniqueInfo.values instanceof Array) {
                    instanceTechniqueInfo.values.forEach(function(item){
                        uniforms[item.parameter] = item.value;
                    });
                } else {
                    uniforms = instanceTechniqueInfo.values;
                }
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
                    name : materialInfo.name,
                    shader : shaderLibrary.get(this.shaderName, enabledTextures)
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
                        material.set("color", uniforms['diffuse'].slice(0, 3));
                    } else { // Texture
                        material.set("diffuseMap", uniforms["diffuse"]);
                    }
                }
                if (uniforms['normalMap'] !== undefined) {
                    material.set("normalMap", uniforms["normalMap"]);
                }
                if (uniforms['emission'] !== undefined) {
                    material.set('emission', uniforms['emission'].slice(0, 3));
                }
                if (uniforms['shininess'] !== undefined) {
                    material.set("shininess", uniforms["shininess"]);
                } else {
                    material.set("shininess", 0);
                }
                if (uniforms["specular"] !== undefined) {
                    material.set("specular", uniforms["specular"].slice(0, 3));
                }
                if (uniforms["transparency"] !== undefined) {
                    material.set("alpha", uniforms["transparency"]);
                }

                lib.materials[name] = material;
            }
        },

        _parseMeshes : function(json, lib) {
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
                        boundingBox : new BoundingBox()
                    });
                    // Parse indices
                    if (json.indices) {
                        // DEPRECATED
                        // https://github.com/KhronosGroup/glTF/issues/161
                        var indicesInfo = json.indices[primitiveInfo.indices];
                    } else {
                        var indicesInfo = json.accessors[primitiveInfo.indices];
                    }
                    var bufferViewInfo = json.bufferViews[indicesInfo.bufferView];
                    var buffer = lib.buffers[bufferViewInfo.buffer];
                    var byteOffset = bufferViewInfo.byteOffset + indicesInfo.byteOffset;

                    geometry.faces = new Uint16Array(buffer, byteOffset, indicesInfo.count);

                    // DEPRECATED
                    // https://github.com/KhronosGroup/glTF/issues/162
                    if (primitiveInfo.semantics) {
                        primitiveInfo.attributes = primitiveInfo.semantics
                    }
                    // Parse attributes
                    var semantics = Object.keys(primitiveInfo.attributes);
                    for (var ss = 0; ss < semantics.length; ss++) {
                        var semantic = semantics[ss];
                        var accessorName = primitiveInfo.attributes[semantic];
                        if (json.attributes) {
                            // DEPRECATED
                            // https://github.com/KhronosGroup/glTF/issues/161
                            var attributeInfo = json.attributes[accessorName];
                        } else {
                            var attributeInfo = json.accessors[accessorName];
                        }
                        var attributeName = semanticAttributeMap[semantic];
                        if (!attributeName) {
                            continue;
                        }
                        var attributeType = attributeInfo.type;
                        var bufferViewInfo = json.bufferViews[attributeInfo.bufferView];
                        var buffer = lib.buffers[bufferViewInfo.buffer];
                        var byteOffset = bufferViewInfo.byteOffset + attributeInfo.byteOffset;

                        if (typeof(attributeType) === 'string') {
                            // DEPRECATED
                            attributeType = glenum[attributeType];
                        }
                        switch(attributeType) {
                            case 0x8B50:     // FLOAT_VEC2
                                var size = 2;
                                var type = 'float';
                                var arrayConstructor = Float32Array;
                                break;
                            case 0x8B51:     // FLOAT_VEC3
                                var size = 3;
                                var type = 'float';
                                var arrayConstructor = Float32Array;
                                break;
                            case 0x8B52:     // FLOAT_VEC4
                                var size = 4;
                                var type = 'float';
                                var arrayConstructor = Float32Array;
                                break;
                            case 0x1406:     // FLOAT
                                var size = 1;
                                var type = 'float';
                                var arrayConstructor = Float32Array;
                                break;
                            default:
                                console.warn("Attribute type "+attributeInfo.type+" not support yet");
                                break;
                        }
                        var attributeArray = new arrayConstructor(buffer, byteOffset, attributeInfo.count * size);
                        geometry.attributes[attributeName].value = attributeArray;
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

                    var material = lib.materials[primitiveInfo.material];
                    var mesh = new Mesh({
                        geometry : geometry,
                        material : material
                    });
                    if (material.shader.isTextureEnabled('normalMap')) {
                        if (!mesh.geometry.attributes.tangent.value) {
                            mesh.geometry.generateTangents();
                        }
                    }

                    // DEPRECATED
                    var skinName = primitiveInfo.skin;
                    if (skinName) {
                        mesh.skeleton = skinName;
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

        _parseNodes : function(json, lib) {

            for (var name in json.nodes) {
                var nodeInfo = json.nodes[name];
                var node;
                if (nodeInfo.camera) {
                    var cameraInfo = json.cameras[nodeInfo.camera];

                    if (cameraInfo.projection === "perspective") {
                        node = new PerspectiveCamera({
                            name : nodeInfo.name,
                            aspect : cameraInfo.aspect_ratio,
                            fov : cameraInfo.xfov,
                            far : cameraInfo.zfar,
                            near : cameraInfo.znear
                        });
                    } else {
                        // TODO
                        node = new OrthographicCamera();
                        console.warn("TODO:Orthographic camera")
                    }
                    lib.cameras[nodeInfo.name] = node;
                } else {
                    node = new Node({
                        name : nodeInfo.name
                    });
                }
                if (nodeInfo.lights) {
                    for (var i = 0; i < nodeInfo.lights.length; i++) {
                        var lightInfo = json.lights[nodeInfo.lights[i]];
                        var light = this._parseLight(lightInfo);
                        if (light) {
                            node.add(light);
                        }
                    }
                }
                if (nodeInfo.meshes || nodeInfo.instanceSkin) {
                    // TODO one node have multiple meshes ?
                    if (nodeInfo.meshes) {
                        var meshKey = nodeInfo.meshes[0];
                    } else {
                        var meshKey = nodeInfo.instanceSkin.sources[0];
                    }
                    if (meshKey) {
                        var primitives = lib.meshes[meshKey];
                        if (primitives) {
                            if (primitives.length === 1) {
                                // Replace the node with mesh directly
                                node = primitives[0];
                                node.name = nodeInfo.name;
                            } else {
                                for (var j = 0; j < primitives.length; j++) {                            
                                    if (nodeInfo.instanceSkin) {
                                        primitives[j].skeleton = nodeInfo.instanceSkin.skin;
                                    }
                                    node.add(primitives[j]);
                                }   
                            }
                        }
                    }
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

        _parseLight : function(lightInfo) {
            // TODO : Light parameters
            switch(lightInfo.type) {
                case "point":
                    var light = new PointLight({
                        name : lightInfo.id,
                        color : lightInfo.point.color,
                    });
                    break;
                case "spot":
                    var light = new SpotLight({
                        name : lightInfo.id,
                        color : lightInfo.spot.color
                    });
                    break;
                case "directional":
                    var light = new DirectionalLight({
                        name : lightInfo.id,
                        color : lightInfo.directional.color
                    });
                    break;
                default:
                    console.warn("Light " + lightInfo.type + " not support yet");
            }

            return light;
        },

        _parseAnimations : function(json, lib) {
            for (var name in json.animations) {
                var animationInfo = json.animations[name];

            }
        }
    });

    return Loader;
});
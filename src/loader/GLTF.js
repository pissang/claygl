/**
 * glTF Loader
 * Specification : https://github.com/KhronosGroup/glTF/blob/master/specification/README.md
 */
define(function(require) {

    var Base = require('core/Base');

    var request = require("core/request");
    var Scene = require('3d/Scene');
    var Shader = require("3d/Shader");
    var Material = require("3d/Material");
    var Mesh = require("3d/Mesh");
    var Node = require("3d/Node");
    var Texture = require('3d/Texture');
    var Texture2D = require("3d/texture/Texture2D");
    var TextureCube = require("3d/texture/TextureCube");
    var shaderLibrary = require("3d/shader/library");
    var Skeleton = require("3d/Skeleton");
    var Joint = require("3d/Joint");
    var PerspectiveCamera = require("3d/camera/Perspective");
    var OrthographicCamera = require("3d/camera/Orthographic");
    var PointLight = require("3d/light/Point");
    var SpotLight = require("3d/light/Spot");
    var DirectionalLight = require("3d/light/Directional");
    var glenum = require("3d/glenum");

    var Vector3 = require("core/Vector3");
    var Quaternion = require("core/Quaternion");
    
    var _ = require("_");

    var InstantGeometry = require("./InstantGeometry");

    var glMatrix = require("glmatrix");
    var vec4 = glMatrix.vec4;
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;

    var semanticAttributeMap = {
        'NORMAL' : 'normal',
        'POSITION' : 'position',
        'TEXCOORD_0' : 'texcoord0',
        'WEIGHT' : 'weight',
        'JOINT' : 'joint'
    }

    var Loader = Base.derive(function() {
        return {
            rootPath : "",
            textureRootPath : "",
            bufferRootPath : ""
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
                skins : {},
                skeleton : null,
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
                self._parseSkins(json, lib);
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
                    scene.add(node);
                }

                self.trigger("success", {
                    scene : scene,
                    cameras : lib.cameras,
                    skeleton : lib.skeleton
                });
            }

            return {
                scene : scene,
                cameras : lib.cameras,
                skeleton : lib.skeleton
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

         _parseSkins : function(json, lib) {
            var self = this;
            // Build skeleton
            var skeleton = new Skeleton();
            var rootJoints = {};

            var createJoint = function(nodeName, parentIndex) {
                // Have been created
                if (lib.joints[nodeName]) {
                    return;
                }
                var nodeInfo = json.nodes[nodeName];
                nodeInfo._isJoint = true;
                // Cast node to joint
                var joint = new Joint();
                joint.name = nodeName;
                if (nodeInfo.matrix) {
                    for (var i = 0; i < 16; i++) {
                        joint.localTransform._array[i] = nodeInfo.matrix[i];
                    }
                    joint.decomposeLocalTransform();
                }

                joint.index = skeleton.joints.length;
                if (parentIndex !== undefined) {
                    joint.parentIndex = parentIndex;
                }
                
                skeleton.joints.push(joint);
                lib.joints[nodeName] = joint;
                
                for (var i = 0; i < nodeInfo.children.length; i++) {
                    var child = createJoint(nodeInfo.children[i], joint.index);
                    if (child) {
                        joint.add(child);
                    }
                }
                return joint;
            }

            for (var name in json.skins) {
                var skinInfo = json.skins[name]
                for (var i = 0; i < skinInfo.roots.length; i++) {
                    var rootJointName = skinInfo.roots[i];
                    var rootJoint = createJoint(rootJointName);
                    if (rootJoint) {
                        skeleton.roots.push(rootJoint);
                    }
                }
            }

            for (var name in json.skins) {
                var skinInfo = json.skins[name];
                var jointIndices = [];
                for (var i = 0; i < skinInfo.joints.length; i++) {
                    var joint = lib.joints[skinInfo.joints[i]];
                    jointIndices.push(joint.index);
                }
                lib.skins[name] = {
                    joints : jointIndices
                }
            }
            skeleton.updateJointMatrices();
            skeleton.update();
            lib.skeleton = skeleton;
        },

        _parseTextures : function(json, lib) {
            _.each(json.textures, function(textureInfo, name){
                var samplerInfo = json.samplers[textureInfo.sampler];
                var parameters = {
                    format : glenum[textureInfo.format || 'RGBA'],
                    wrapS : glenum[samplerInfo.wrapS || 'REPEAT'],
                    wrapT : glenum[samplerInfo.wrapT || 'REPEAT'],
                    magFilter : glenum[samplerInfo.magFilter || 'LINEAR'],
                    minFilter : glenum[samplerInfo.minFilter || 'LINEAR_MIPMAP_LINEAR'],
                }

                if (textureInfo.target === "TEXTURE_2D") {
                    var texture = new Texture2D(parameters);
                    var imageInfo = json.images[textureInfo.source];
                    texture.image = this._loadImage(imageInfo.path, function() {
                        texture.dirty();
                    });
                    lib.textures[name] = texture;
                } else if(textureInfo.target === "TEXTURE_CUBE_MAP") {
                    // TODO
                }
            }, this);
        },

        _loadImage : function(path, onsuccess) {
            var root = this.textureRootPath || this.rootPath;
            if (root) {
                path = root + "/" + path;
            }
            var img = new Image();
            img.onload = function() {
                onsuccess && onsuccess(img);
                img.onload = null;
            }
            img.src = path;
            return img;
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
                instanceTechniqueInfo.values.forEach(function(item){
                    if (typeof(item.value) === "string" &&
                        lib.textures[item.value]) {
                        var value = lib.textures[item.value]
                    } else {
                        var value = item.value;
                    }
                    uniforms[item.parameter] = value;
                });
                var enabledTextures = [];
                if (uniforms['diffuse'] instanceof Texture2D) {
                    enabledTextures.push('diffuseMap');
                }
                if (uniforms['normalMap'] instanceof Texture2D) {
                    enabledTextures.push('normalMap');
                }
                var material = new Material({
                    name : materialInfo.name,
                    shader : shaderLibrary.get('buildin.phong', enabledTextures)
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

            for (var name in json.meshes) {
                var meshInfo = json.meshes[name];

                lib.meshes[name] = [];
                // Geometry
                for (var i = 0; i < meshInfo.primitives.length; i++) {
                    var geometry = new InstantGeometry();
                    var chunk = {
                        attributes : {},
                        indices : null
                    };
                    var primitiveInfo = meshInfo.primitives[i];
                    // Parse indices
                    var indicesInfo = json.indices[primitiveInfo.indices];
                    var bufferViewInfo = json.bufferViews[indicesInfo.bufferView];
                    var buffer = lib.buffers[bufferViewInfo.buffer];
                    var byteOffset = bufferViewInfo.byteOffset + indicesInfo.byteOffset;

                    var byteLength = indicesInfo.count * 2; //two byte each index
                    chunk.indices = new Uint16Array(buffer.slice(byteOffset, byteOffset+byteLength));

                    // Parse attributes
                    for (var semantic in primitiveInfo.semantics) {
                        var attributeInfo = json.attributes[primitiveInfo.semantics[semantic]];
                        var attributeName = semanticAttributeMap[semantic];
                        var bufferViewInfo = json.bufferViews[attributeInfo.bufferView];
                        var buffer = lib.buffers[bufferViewInfo.buffer];
                        var byteOffset = bufferViewInfo.byteOffset + attributeInfo.byteOffset;
                        var byteLength = attributeInfo.count * attributeInfo.byteStride;
                        // TODO : Support more types
                        switch(attributeInfo.type) {
                            case "FLOAT_VEC2":
                                var size = 2;
                                var type = 'float';
                                var arrayConstructor = Float32Array;
                                break;
                            case "FLOAT_VEC3":
                                var size = 3;
                                var type = 'float';
                                var arrayConstructor = Float32Array;
                                break;
                            case "FLOAT_VEC4":
                                var size = 4;
                                var type = 'float';
                                var arrayConstructor = Float32Array;
                                break;
                            case "FLOAT":
                                var size = 1;
                                var type = 'float';
                                var arrayConstructor = Float32Array;
                                break;
                            default:
                                console.warn("Attribute type "+attributeInfo.type+" not support yet");
                                break;
                        }
                        chunk.attributes[attributeName] = {
                            type : type,
                            size : size,
                            semantic : semantic,
                            array : new arrayConstructor(buffer.slice(byteOffset, byteOffset+byteLength))
                        };
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
                    geometry.addChunk(chunk);

                    var material = lib.materials[primitiveInfo.material];
                    var mesh = new Mesh({
                        geometry : geometry.convertToGeometry(),
                        material : material
                    });
                    if (material.shader.isTextureEnabled('normalMap')) {
                        if (!mesh.geometry.attributes.tangent.value.length) {
                            mesh.geometry.generateTangents();
                        }
                    }

                    var skinName = primitiveInfo.skin;
                    if (skinName) {
                        mesh.joints = lib.skins[skinName].joints;
                        mesh.skeleton = lib.skeleton;
                        material.shader = material.shader.clone();
                        material.shader.define('vertex', 'SKINNING');
                        material.shader.define('vertex', 'JOINT_NUMBER', mesh.joints.length);
                    }
                    if (meshInfo.name) {
                        if (meshInfo.primitives.length > 1) {
                            mesh.name = [name, i].join('-');
                        }
                        else {
                            mesh.name = name;
                        }
                    }

                    lib.meshes[name].push(mesh);
                }
            }
        },

        _parseNodes : function(json, lib) {
            for (var name in json.nodes) {
                var nodeInfo = json.nodes[name];
                if (nodeInfo._isJoint) {
                    // Skip joint node
                    continue;
                }
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
                if (nodeInfo.meshes) {
                    for (var i = 0; i < nodeInfo.meshes.length; i++) {
                        var primitives = lib.meshes[nodeInfo.meshes[i]];
                        if (primitives) {
                            for (var j = 0; j < primitives.length; j++) {                            
                                node.add(primitives[j]);
                            }
                        }
                    }
                }
                if (nodeInfo.matrix) {
                    for (var i = 0; i < 16; i++) {
                        node.localTransform._array[i] = nodeInfo.matrix[i];
                    }
                    node.decomposeLocalTransform();
                }

                lib.nodes[name] = node;
            }

            // Build hierarchy
            for (var name in json.nodes) {
                var nodeInfo = json.nodes[name];
                if (nodeInfo._isJoint) {
                    // Skip joint node
                    continue;
                }
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
    });

    return Loader;
});
/**
 * glTF Loader
 * Specification : https://github.com/KhronosGroup/glTF/blob/master/specification/README.md
 * @export{class} GLTF
 */
define(function(require) {

    var Base = require('core/base');

    var request = require("core/request");
    var Scene = require('3d/scene');
    var Shader = require("3d/shader");
    var Material = require("3d/material");
    var Mesh = require("3d/mesh");
    var Node = require("3d/node");
    var Texture2D = require("3d/texture/texture2d");
    var TextureCube = require("3d/texture/texturecube");
    var shaderLibrary = require("3d/shader/library");
    var Skeleton = require("3d/skeleton");
    var Joint = require("3d/joint");
    var PerspectiveCamera = require("3d/camera/perspective");
    var OrthographicCamera = require("3d/camera/orthographic");
    var PointLight = require("3d/light/point");
    var SpotLight = require("3d/light/spot");
    var DirectionalLight = require("3d/light/directional");

    var Vector3 = require("core/vector3");
    var Quaternion = require("core/quaternion");
    
    var _ = require("_");

    var InstantGeometry = require("./instantgeometry");

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
            bufferRootPath : "",

            _buffers : {},
            _materials : {},
            _textures : {},
            _meshes : {},

            _joints : {},
            _skins : {},
            _skeleton : null,

            _cameras : {},
            _nodes : {}
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
                    self.parse(JSON.parse(data), function(scene, cameras, skeleton) {
                        self.trigger("load", scene, cameras, skeleton);
                    });
                }
            })
        },
        parse : function(json, callback) {
            var buffers = {};
            var self = this;
            var loading = 0;
            // Load buffers
            _.each(json.buffers, function(bufferInfo, name) {
                loading++;
                self._loadBuffer(bufferInfo.path, function(buffer) {
                    buffers[name] = buffer;
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

            this._buffers = buffers;

            function afterLoadBuffer() {
                self._parseSkins(json);
                self._parseTextures(json);
                self._parseMaterials(json);
                self._parseMeshes(json);
                self._parseNodes(json);

                // Build scene
                var scene = new Scene();
                var sceneInfo = json.scenes[json.scene];
                for (var i = 0; i < sceneInfo.nodes.length; i++) {
                    if (self._joints[sceneInfo.nodes[i]]) {
                        // Skip joint node
                        continue;
                    }
                    var node = self._nodes[sceneInfo.nodes[i]];
                    scene.add(node);
                }

                callback && callback(scene, self._cameras, self._skeleton);
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

         _parseSkins : function(json) {
            var self = this;
            // Build skeleton
            var skeleton = new Skeleton();
            var rootJoints = {};

            var createJoint = function(nodeName, parentIndex) {
                // Have been created
                if (self._joints[nodeName]) {
                    return;
                }
                var nodeInfo = json.nodes[nodeName];
                nodeInfo._isJoint = true;
                // Cast node to joint
                var joint = new Joint();
                if (nodeInfo.matrix) {
                    for (var i = 0; i < 16; i++) {
                        joint.matrix._array[i] = nodeInfo.matrix[i];
                    }
                    joint.decomposeMatrix();
                }

                joint.index = skeleton.joints.length;
                joint.parentIndex = parentIndex;

                skeleton.joints.push(joint);
                self._joints[nodeName] = joint;
                
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
                    var joint = self._joints[skinInfo.joints[i]];
                    jointIndices.push(joint.index);
                }
                this._skins[name] = {
                    joints : jointIndices
                }
            }
            skeleton.updateJointMatrices();
            skeleton.update();
            this._skeleton = skeleton;
        },

        _parseTextures : function(json) {
            var textures = {};
            _.each(json.textures, function(textureInfo, name){
                var samplerInfo = json.samplers[textureInfo.sampler];
                var parameters = {
                    format : textureInfo.format    
                }
                _.extend(parameters, samplerInfo);

                if (textureInfo.target === "TEXTURE_2D") {
                    var texture = new Texture2D(parameters);
                    var imageInfo = json.images[textureInfo.source];
                    texture.image = this._loadImage(imageInfo.path, function() {
                        texture.dirty();
                    });
                    textures[name] = texture;
                } else if(textureInfo.target === "TEXTURE_CUBE_MAP") {
                    // TODO
                }
            }, this);
            this._textures = textures;
            return textures;
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
        _parseMaterials : function(json) {
            var self = this;
            var materials = {};
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
                        self._textures[item.value]) {
                        var value = self._textures[item.value]
                    } else {
                        var value = item.value;
                    }
                    uniforms[item.parameter] = value;
                });
                var material = new Material({
                    name : materialInfo.name,
                    // shader : technique.shader
                    // Techniques of glTF is not classified well
                    // So here use a shader per material
                    shader : new Shader({
                        vertex : Shader.source("buildin.phong.vertex"),
                        fragment : Shader.source("buildin.phong.fragment")
                    })
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
                        material.shader.enableTexture("diffuseMap");
                        material.set("diffuseMap", uniforms["diffuse"]);
                    }
                }
                if (uniforms['emission']) {
                    var diffuseColor = material.get('color');
                    vec4.add(diffuseColor, diffuseColor, uniforms['emission']);
                }
                if (uniforms['shininess']) {
                    material.set("shininess", uniforms["shininess"]);
                }
                if (uniforms["specular"]) {
                    material.set("specular", uniforms["specular"].slice(0, 3));
                }
                if (uniforms["transparency"]) {
                    material.set("alpha", uniforms["transparency"]);
                }

                materials[name] = material;
            }

            this._materials = materials;
            return materials;
        },

        _parseMeshes : function(json) {
            var meshes = {};
            var self = this;

            for (var name in json.meshes) {
                var meshInfo = json.meshes[name];

                // Geometry
                var geometry = new InstantGeometry();
                for (var i = 0; i < meshInfo.primitives.length; i++) {
                    var chunk = {
                        attributes : {},
                        indices : null
                    };
                    var primitiveInfo = meshInfo.primitives[i];
                    // Parse indices
                    var indicesInfo = json.indices[primitiveInfo.indices];
                    var bufferViewInfo = json.bufferViews[indicesInfo.bufferView];
                    var buffer = this._buffers[bufferViewInfo.buffer];
                    var byteOffset = bufferViewInfo.byteOffset + indicesInfo.byteOffset;

                    var byteLength = indicesInfo.count * 2; //two byte each index
                    chunk.indices = new Uint16Array(buffer.slice(byteOffset, byteOffset+byteLength));

                    // Parse attributes
                    for (var semantic in primitiveInfo.semantics) {
                        var attributeInfo = json.attributes[primitiveInfo.semantics[semantic]];
                        var attributeName = semanticAttributeMap[semantic];
                        var bufferViewInfo = json.bufferViews[attributeInfo.bufferView];
                        var buffer = this._buffers[bufferViewInfo.buffer];
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
                    }
                    geometry.addChunk(chunk);
                }

                // Material
                // All primitives have the same material and skin
                // TODO;
                var material = this._materials[meshInfo.primitives[0].material];
                var mesh = new Mesh({
                    geometry : geometry,
                    material : material
                });
                if (meshInfo.name) {
                    mesh.name = meshInfo.name;
                }
                var skinName = meshInfo.primitives[0].skin
                if (skinName) {
                    mesh.joints = this._skins[skinName].joints;
                    mesh.skeleton = this._skeleton;
                    material.shader = material.shader.clone();
                    material.shader.define('vertex', 'SKINNING');
                    material.shader.define('vertex', 'JOINT_NUMBER', mesh.joints.length);
                }

                meshes[name] = mesh;
            }
            this._meshes = meshes;
            return meshes;
        },

        _parseNodes : function(json) {
            var nodes = {};

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
                    this._cameras[nodeInfo.name] = node;
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
                        var mesh = this._meshes[nodeInfo.meshes[i]];
                        if (mesh) {
                            node.add(mesh);
                        }
                    }
                }
                if (nodeInfo.matrix) {
                    for (var i = 0; i < 16; i++) {
                        node.matrix._array[i] = nodeInfo.matrix[i];
                    }
                    node.decomposeMatrix();
                }

                nodes[name] = node;
            }

            // Build hierarchy
            for (var name in json.nodes) {
                var nodeInfo = json.nodes[name];
                if (nodeInfo._isJoint) {
                    // Skip joint node
                    continue;
                }
                var node = nodes[name];
                if (nodeInfo.children) {
                    for (var i = 0; i < nodeInfo.children.length; i++) {
                        var childName = nodeInfo.children[i];
                        var child = nodes[childName];
                        node.add(child);
                    }
                }
            }

            this._nodes = nodes;
            return nodes;
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
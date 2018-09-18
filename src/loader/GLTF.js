/**
 * glTF Loader
 * Specification https://github.com/KhronosGroup/glTF/blob/master/specification/README.md
 *
 * TODO Morph targets
 */
import Base from '../core/Base';
import util from '../core/util';
import vendor from '../core/vendor';

import Scene from '../Scene';
import Material from '../Material';
import StandardMaterial from '../StandardMaterial';
import Mesh from '../Mesh';
import Node from '../Node';
import Texture from '../Texture';
import Texture2D from '../Texture2D';
import shaderLibrary from '../shader/library';
import Skeleton from '../Skeleton';
import Joint from '../Joint';
import PerspectiveCamera from '../camera/Perspective';
import OrthographicCamera from '../camera/Orthographic';
import glenum from '../core/glenum';

import BoundingBox from '../math/BoundingBox';

import TrackClip from '../animation/TrackClip';
import SamplerTrack from '../animation/SamplerTrack';

import Geometry from '../Geometry';

// Import builtin shader
import '../shader/builtin';
import Shader from '../Shader';

var semanticAttributeMap = {
    'NORMAL': 'normal',
    'POSITION': 'position',
    'TEXCOORD_0': 'texcoord0',
    'TEXCOORD_1': 'texcoord1',
    'WEIGHTS_0': 'weight',
    'JOINTS_0': 'joint',
    'COLOR_0': 'color'
};

var ARRAY_CTOR_MAP = {
    5120: vendor.Int8Array,
    5121: vendor.Uint8Array,
    5122: vendor.Int16Array,
    5123: vendor.Uint16Array,
    5125: vendor.Uint32Array,
    5126: vendor.Float32Array
};
var SIZE_MAP = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
};

function getAccessorData(json, lib, accessorIdx, isIndices) {
    var accessorInfo = json.accessors[accessorIdx];

    var buffer = lib.bufferViews[accessorInfo.bufferView];
    var byteOffset = accessorInfo.byteOffset || 0;
    var ArrayCtor = ARRAY_CTOR_MAP[accessorInfo.componentType] || vendor.Float32Array;

    var size = SIZE_MAP[accessorInfo.type];
    if (size == null && isIndices) {
        size = 1;
    }
    var arr = new ArrayCtor(buffer, byteOffset, size * accessorInfo.count);

    var quantizeExtension = accessorInfo.extensions && accessorInfo.extensions['WEB3D_quantized_attributes'];
    if (quantizeExtension) {
        var decodedArr = new vendor.Float32Array(size * accessorInfo.count);
        var decodeMatrix = quantizeExtension.decodeMatrix;
        var decodeOffset;
        var decodeScale;
        var decodeOffset = new Array(size);
        var decodeScale = new Array(size);
        for (var k = 0; k < size; k++) {
            decodeOffset[k] = decodeMatrix[size * (size + 1) + k];
            decodeScale[k] = decodeMatrix[k * (size + 1) + k];
        }
        for (var i = 0; i < accessorInfo.count; i++) {
            for (var k = 0; k < size; k++) {
                decodedArr[i * size + k] = arr[i * size + k] * decodeScale[k] + decodeOffset[k];
            }
        }

        arr = decodedArr;
    }
    return arr;
}

function base64ToBinary(input, charStart) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var lookup = new Uint8Array(130);
    for (var i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }
    // Ignore
    var len = input.length - charStart;
    if (input.charAt(len - 1) === '=') { len--; }
    if (input.charAt(len - 1) === '=') { len--; }

    var uarray = new Uint8Array((len / 4) * 3);

    for (var i = 0, j = charStart; i < uarray.length;) {
        var c1 = lookup[input.charCodeAt(j++)];
        var c2 = lookup[input.charCodeAt(j++)];
        var c3 = lookup[input.charCodeAt(j++)];
        var c4 = lookup[input.charCodeAt(j++)];

        uarray[i++] = (c1 << 2) | (c2 >> 4);
        uarray[i++] = ((c2 & 15) << 4) | (c3 >> 2);
        uarray[i++] = ((c3 & 3) << 6) | c4;
    }

    return uarray.buffer;
}


/**
 * @typedef {Object} clay.loader.GLTF.Result
 * @property {Object} json
 * @property {clay.Scene} scene
 * @property {clay.Node} rootNode
 * @property {clay.Camera[]} cameras
 * @property {clay.Texture[]} textures
 * @property {clay.Material[]} materials
 * @property {clay.Skeleton[]} skeletons
 * @property {clay.Mesh[]} meshes
 * @property {clay.animation.TrackClip[]} clips
 * @property {clay.Node[]} nodes
 */

/**
 * @constructor clay.loader.GLTF
 * @extends clay.core.Base
 */
var GLTFLoader = Base.extend(/** @lends clay.loader.GLTF# */ {
    /**
     *
     * @type {clay.Node}
     */
    rootNode: null,
    /**
     * Root path for uri parsing.
     * @type {string}
     */
    rootPath: null,

    /**
     * Root path for texture uri parsing. Defaultly use the rootPath
     * @type {string}
     */
    textureRootPath: null,

    /**
     * Root path for buffer uri parsing. Defaultly use the rootPath
     * @type {string}
     */
    bufferRootPath: null,

    /**
     * Shader used when creating the materials.
     * @type {string|clay.Shader}
     * @default 'clay.standard'
     */
    shader: 'clay.standard',

    /**
     * If use {@link clay.StandardMaterial}
     * @type {string}
     */
    useStandardMaterial: false,

    /**
     * If loading the cameras.
     * @type {boolean}
     */
    includeCamera: true,

    /**
     * If loading the animations.
     * @type {boolean}
     */
    includeAnimation: true,
    /**
     * If loading the meshes
     * @type {boolean}
     */
    includeMesh: true,
    /**
     * If loading the textures.
     * @type {boolean}
     */
    includeTexture: true,

    /**
     * @type {string}
     */
    crossOrigin: '',
    /**
     * @type {boolean}
     * @see https://github.com/KhronosGroup/glTF/issues/674
     */
    textureFlipY: false,

    /**
     * If convert texture to power-of-two
     * @type {boolean}
     */
    textureConvertToPOT: false,

    shaderLibrary: null
},
function () {
    if (!this.shaderLibrary) {
        this.shaderLibrary = shaderLibrary.createLibrary();
    }
},
/** @lends clay.loader.GLTF.prototype */
{
    /**
     * @param {string} url
     */
    load: function (url) {
        var self = this;
        var isBinary = url.endsWith('.glb');

        if (this.rootPath == null) {
            this.rootPath = url.slice(0, url.lastIndexOf('/'));
        }

        vendor.request.get({
            url: url,
            onprogress: function (percent, loaded, total) {
                self.trigger('progress', percent, loaded, total);
            },
            onerror: function (e) {
                self.trigger('error', e);
            },
            responseType: isBinary ? 'arraybuffer' : 'text',
            onload: function (data) {
                if (isBinary) {
                    self.parseBinary(data);
                }
                else {
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    self.parse(data);
                }
            }
        });
    },

    /**
     * Parse glTF binary
     * @param {ArrayBuffer} buffer
     * @return {clay.loader.GLTF.Result}
     */
    parseBinary: function (buffer) {
        var header = new Uint32Array(buffer, 0, 4);
        if (header[0] !== 0x46546C67) {
            this.trigger('error', 'Invalid glTF binary format: Invalid header');
            return;
        }
        if (header[0] < 2) {
            this.trigger('error', 'Only glTF2.0 is supported.');
            return;
        }

        var dataView = new DataView(buffer, 12);

        var json;
        var buffers = [];
        // Read chunks
        for (var i = 0; i < dataView.byteLength;) {
            var chunkLength = dataView.getUint32(i, true);
            i += 4;
            var chunkType = dataView.getUint32(i, true);
            i += 4;

            // json
            if (chunkType === 0x4E4F534A) {
                var arr = new Uint8Array(buffer, i + 12, chunkLength);
                // TODO, for the browser not support TextDecoder.
                var decoder = new TextDecoder();
                var str = decoder.decode(arr);
                try {
                    json = JSON.parse(str);
                }
                catch (e) {
                    this.trigger('error', 'JSON Parse error:' + e.toString());
                    return;
                }
            }
            else if (chunkType === 0x004E4942) {
                buffers.push(buffer.slice(i + 12, i + 12 + chunkLength));
            }

            i += chunkLength;
        }
        if (!json) {
            this.trigger('error', 'Invalid glTF binary format: Can\'t find JSON.');
            return;
        }

        return this.parse(json, buffers);
    },

    /**
     * @param {Object} json
     * @param {ArrayBuffer[]} [buffer]
     * @return {clay.loader.GLTF.Result}
     */
    parse: function (json, buffers) {
        var self = this;

        var lib = {
            json: json,
            buffers: [],
            bufferViews: [],
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
        // If already load buffers
        if (buffers) {
            lib.buffers = buffers.slice();
            afterLoadBuffer(true);
        }
        else {
            // Load buffers
            util.each(json.buffers, function (bufferInfo, idx) {
                loading++;
                var path = bufferInfo.uri;

                self._loadBuffers(path, function (buffer) {
                    lib.buffers[idx] = buffer;
                    checkLoad();
                }, checkLoad);
            });
        }

        function getResult() {
            return {
                json: json,
                scene: self.rootNode ? null : rootNode,
                rootNode: self.rootNode ? rootNode : null,
                cameras: lib.cameras,
                textures: lib.textures,
                materials: lib.materials,
                skeletons: lib.skeletons,
                meshes: lib.instancedMeshes,
                clips: lib.clips,
                nodes: lib.nodes
            };
        }

        function afterLoadBuffer(immediately) {
            // Buffer not load complete.
            if (lib.buffers.length !== json.buffers.length) {
                setTimeout(function () {
                    self.trigger('error', 'Buffer not load complete.');
                });
                return;
            }

            json.bufferViews.forEach(function (bufferViewInfo, idx) {
                // PENDING Performance
                lib.bufferViews[idx] = lib.buffers[bufferViewInfo.buffer]
                    .slice(bufferViewInfo.byteOffset || 0, (bufferViewInfo.byteOffset || 0) + (bufferViewInfo.byteLength || 0));
            });
            lib.buffers = null;
            if (self.includeMesh) {
                if (self.includeTexture) {
                    self._parseTextures(json, lib);
                }
                self._parseMaterials(json, lib);
                self._parseMeshes(json, lib);
            }
            self._parseNodes(json, lib);

            // Only support one scene.
            if (json.scenes) {
                var sceneInfo = json.scenes[json.scene || 0]; // Default use the first scene.
                if (sceneInfo) {
                    for (var i = 0; i < sceneInfo.nodes.length; i++) {
                        var node = lib.nodes[sceneInfo.nodes[i]];
                        node.update();
                        rootNode.add(node);
                    }
                }
            }

            if (self.includeMesh) {
                self._parseSkins(json, lib);
            }

            if (self.includeAnimation) {
                self._parseAnimations(json, lib);
            }
            if (immediately) {
                setTimeout(function () {
                    self.trigger('success', getResult());
                });
            }
            else {
                self.trigger('success', getResult());
            }
        }

        return getResult();
    },

    /**
     * Binary file path resolver. User can override it
     * @param {string} path
     */
    resolveBufferPath: function (path) {
        if (path && path.match(/^data:(.*?)base64,/)) {
            return path;
        }

        var rootPath = this.bufferRootPath;
        if (rootPath == null) {
            rootPath = this.rootPath;
        }
        return util.relative2absolute(path, rootPath);
    },

    /**
     * Texture file path resolver. User can override it
     * @param {string} path
     */
    resolveTexturePath: function (path) {
        if (path && path.match(/^data:(.*?)base64,/)) {
            return path;
        }

        var rootPath = this.textureRootPath;
        if (rootPath == null) {
            rootPath = this.rootPath;
        }
        return util.relative2absolute(path, rootPath);
    },

    /**
     * Buffer loader
     * @param {string}
     * @param {Function} onsuccess
     * @param {Function} onerror
     */
    loadBuffer: function (path, onsuccess, onerror) {
        vendor.request.get({
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

    _getShader: function () {
        if (typeof this.shader === 'string') {
            return this.shaderLibrary.get(this.shader);
        }
        else if (this.shader instanceof Shader) {
            return this.shader;
        }
    },

    _loadBuffers: function (path, onsuccess, onerror) {
        var base64Prefix = 'data:application/octet-stream;base64,';
        var strStart = path.substr(0, base64Prefix.length);
        if (strStart === base64Prefix) {
            onsuccess(
                base64ToBinary(path, base64Prefix.length)
            );
        }
        else {
            this.loadBuffer(
                this.resolveBufferPath(path),
                onsuccess,
                onerror
            );
        }
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
            skeleton.relativeRootNode = lib.nodes[skinInfo.skeleton] || this.rootNode;
            if (skinInfo.inverseBindMatrices) {
                haveInvBindMatrices = true;
                var IBMInfo = json.accessors[skinInfo.inverseBindMatrices];
                var buffer = lib.bufferViews[IBMInfo.bufferView];

                var offset = IBMInfo.byteOffset || 0;
                var size = IBMInfo.count * 16;

                var array = new vendor.Float32Array(buffer, offset, size);

                skeleton.setJointMatricesArray(array);
            }
            else {
                skeleton.updateJointMatrices();
            }
            lib.skeletons[idx] = skeleton;
        }, this);

        function enableSkinningForMesh(mesh, skeleton, jointIndices) {
            mesh.skeleton = skeleton;
            mesh.joints = jointIndices;

            if (!skeleton.boundingBox) {
                skeleton.updateJointsBoundingBoxes(mesh.geometry);
            }
        }

        function getJointIndex(joint) {
            return joint.index;
        }

        util.each(json.nodes, function (nodeInfo, nodeIdx) {
            if (nodeInfo.skin != null) {
                var skinIdx = nodeInfo.skin;
                var skeleton = lib.skeletons[skinIdx];

                var node = lib.nodes[nodeIdx];
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
                flipY: this.textureFlipY,
                convertToPOT: this.textureConvertToPOT
            });

            var target = textureInfo.target || glenum.TEXTURE_2D;
            var format = textureInfo.format;
            if (format != null) {
                parameters.format = format;
            }

            if (target === glenum.TEXTURE_2D) {
                var texture = new Texture2D(parameters);
                var imageInfo = json.images[textureInfo.source];
                var uri;
                if (imageInfo.uri) {
                    uri = this.resolveTexturePath(imageInfo.uri);
                }
                else if (imageInfo.bufferView != null) {
                    uri = URL.createObjectURL(new Blob([lib.bufferViews[imageInfo.bufferView]], {
                        type: imageInfo.mimeType
                    }));
                }
                if (uri) {
                    texture.load(uri, this.crossOrigin);
                    lib.textures[idx] = texture;
                }
            }
        }, this);
    },

    _KHRCommonMaterialToStandard: function (materialInfo, lib) {
        var uniforms = {};
        var commonMaterialInfo = materialInfo.extensions['KHR_materials_common'];
        uniforms = commonMaterialInfo.values || {};

        if (typeof uniforms.diffuse === 'number') {
            uniforms.diffuse = lib.textures[uniforms.diffuse] || null;
        }
        if (typeof uniforms.emission === 'number') {
            uniforms.emission = lib.textures[uniforms.emission] || null;
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
            material = new Material({
                name: materialInfo.name,
                shader: this._getShader()
            });

            material.define('fragment', 'USE_ROUGHNESS');
            material.define('fragment', 'USE_METALNESS');

            if (materialInfo.doubleSided) {
                material.define('fragment', 'DOUBLE_SIDED');
            }
        }

        if (uniforms.transparent) {
            material.depthMask = false;
            material.depthTest = true;
            material.transparent = true;
        }

        var diffuseProp = uniforms['diffuse'];
        if (diffuseProp) {
            // Color
            if (Array.isArray(diffuseProp)) {
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
            if (Array.isArray(emissionProp)) {
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
                material.normalMap = lib.textures[normalTextureIndex] || null;
            }
            else {
                material.set('normalMap', lib.textures[normalTextureIndex] || null);
            }
        }
        if (uniforms['shininess'] != null) {
            var glossiness = Math.log(uniforms['shininess']) / Math.log(8192);
            // Uniform glossiness
            material.set('glossiness', glossiness);
            material.set('roughness', 1 - glossiness);
        }
        else {
            material.set('glossiness', 0.3);
            material.set('roughness', 0.3);
        }
        if (uniforms['specular'] != null) {
            material.set('specularColor', uniforms['specular'].slice(0, 3));
        }
        if (uniforms['transparency'] != null) {
            material.set('alpha', uniforms['transparency']);
        }

        return material;
    },

    _pbrMetallicRoughnessToStandard: function (materialInfo, metallicRoughnessMatInfo, lib) {
        var alphaTest = materialInfo.alphaMode === 'MASK';

        var isStandardMaterial = this.useStandardMaterial;
        var material;
        var diffuseMap, roughnessMap, metalnessMap, normalMap, emissiveMap, occlusionMap;
        var enabledTextures = [];

        /**
         * The scalar multiplier applied to each normal vector of the normal texture.
         *
         * @type {number}
         *
         * XXX This value is ignored if `materialInfo.normalTexture` is not specified.
         */
        var normalScale = 1.0;

        // TODO texCoord
        if (metallicRoughnessMatInfo.baseColorTexture) {
            diffuseMap = lib.textures[metallicRoughnessMatInfo.baseColorTexture.index] || null;
            diffuseMap && enabledTextures.push('diffuseMap');
        }
        if (metallicRoughnessMatInfo.metallicRoughnessTexture) {
            roughnessMap = metalnessMap = lib.textures[metallicRoughnessMatInfo.metallicRoughnessTexture.index] || null;
            roughnessMap && enabledTextures.push('metalnessMap', 'roughnessMap');
        }
        if (materialInfo.normalTexture) {

            normalMap = lib.textures[materialInfo.normalTexture.index] || null;
            normalMap && enabledTextures.push('normalMap');

            if (typeof materialInfo.normalTexture.scale === 'number') {
                normalScale = materialInfo.normalTexture.scale;
            }

        }
        if (materialInfo.emissiveTexture) {
            emissiveMap = lib.textures[materialInfo.emissiveTexture.index] || null;
            emissiveMap && enabledTextures.push('emissiveMap');
        }
        if (materialInfo.occlusionTexture) {
            occlusionMap = lib.textures[materialInfo.occlusionTexture.index] || null;
            occlusionMap && enabledTextures.push('occlusionMap');
        }
        var baseColor = metallicRoughnessMatInfo.baseColorFactor || [1, 1, 1, 1];

        var commonProperties = {
            diffuseMap: diffuseMap || null,
            roughnessMap: roughnessMap || null,
            metalnessMap: metalnessMap || null,
            normalMap: normalMap || null,
            occlusionMap: occlusionMap || null,
            emissiveMap: emissiveMap || null,
            color: baseColor.slice(0, 3),
            alpha: baseColor[3],
            metalness: metallicRoughnessMatInfo.metallicFactor || 0,
            roughness: metallicRoughnessMatInfo.roughnessFactor || 0,
            emission: materialInfo.emissiveFactor || [0, 0, 0],
            emissionIntensity: 1,
            alphaCutoff: materialInfo.alphaCutoff || 0,
            normalScale: normalScale
        };
        if (commonProperties.roughnessMap) {
            // In glTF metallicFactor will do multiply, which is different from StandardMaterial.
            // So simply ignore it
            commonProperties.metalness = 0.5;
            commonProperties.roughness = 0.5;
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

            material = new Material({
                name: materialInfo.name,
                shader: this._getShader()
            });

            material.define('fragment', 'USE_ROUGHNESS');
            material.define('fragment', 'USE_METALNESS');
            material.define('fragment', 'ROUGHNESS_CHANNEL', 1);
            material.define('fragment', 'METALNESS_CHANNEL', 2);

            material.define('fragment', 'DIFFUSEMAP_ALPHA_ALPHA');

            if (alphaTest) {
                material.define('fragment', 'ALPHA_TEST');
            }
            if (materialInfo.doubleSided) {
                material.define('fragment', 'DOUBLE_SIDED');
            }

            material.set(commonProperties);
        }

        if (materialInfo.alphaMode === 'BLEND') {
            material.depthMask = false;
            material.depthTest = true;
            material.transparent = true;
        }

        return material;
    },

    _pbrSpecularGlossinessToStandard: function (materialInfo, specularGlossinessMatInfo, lib) {
        var alphaTest = materialInfo.alphaMode === 'MASK';

        if (this.useStandardMaterial) {
            console.error('StandardMaterial doesn\'t support specular glossiness workflow yet');
        }

        var material;
        var diffuseMap, glossinessMap, specularMap, normalMap, emissiveMap, occlusionMap;
        var enabledTextures = [];
        // TODO texCoord
        if (specularGlossinessMatInfo.diffuseTexture) {
            diffuseMap = lib.textures[specularGlossinessMatInfo.diffuseTexture.index] || null;
            diffuseMap && enabledTextures.push('diffuseMap');
        }
        if (specularGlossinessMatInfo.specularGlossinessTexture) {
            glossinessMap = specularMap = lib.textures[specularGlossinessMatInfo.specularGlossinessTexture.index] || null;
            glossinessMap && enabledTextures.push('specularMap', 'glossinessMap');
        }
        if (materialInfo.normalTexture) {
            normalMap = lib.textures[materialInfo.normalTexture.index] || null;
            normalMap && enabledTextures.push('normalMap');
        }
        if (materialInfo.emissiveTexture) {
            emissiveMap = lib.textures[materialInfo.emissiveTexture.index] || null;
            emissiveMap && enabledTextures.push('emissiveMap');
        }
        if (materialInfo.occlusionTexture) {
            occlusionMap = lib.textures[materialInfo.occlusionTexture.index] || null;
            occlusionMap && enabledTextures.push('occlusionMap');
        }
        var diffuseColor = specularGlossinessMatInfo.diffuseFactor || [1, 1, 1, 1];

        var commonProperties = {
            diffuseMap: diffuseMap || null,
            glossinessMap: glossinessMap || null,
            specularMap: specularMap || null,
            normalMap: normalMap || null,
            emissiveMap: emissiveMap || null,
            occlusionMap: occlusionMap || null,
            color: diffuseColor.slice(0, 3),
            alpha: diffuseColor[3],
            specularColor: specularGlossinessMatInfo.specularFactor || [1, 1, 1],
            glossiness: specularGlossinessMatInfo.glossinessFactor || 0,
            emission: materialInfo.emissiveFactor || [0, 0, 0],
            emissionIntensity: 1,
            alphaCutoff: materialInfo.alphaCutoff == null ? 0.9 : materialInfo.alphaCutoff
        };
        if (commonProperties.glossinessMap) {
            // Ignore specularFactor
            commonProperties.glossiness = 0.5;
        }
        if (commonProperties.specularMap) {
            // Ignore specularFactor
            commonProperties.specularColor = [1, 1, 1];
        }

        material = new Material({
            name: materialInfo.name,
            shader: this._getShader()
        });

        material.define('fragment', 'GLOSSINESS_CHANNEL', 3);
        material.define('fragment', 'DIFFUSEMAP_ALPHA_ALPHA');

        if (alphaTest) {
            material.define('fragment', 'ALPHA_TEST');
        }
        if (materialInfo.doubleSided) {
            material.define('fragment', 'DOUBLE_SIDED');
        }

        material.set(commonProperties);

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
            else if (materialInfo.extensions && materialInfo.extensions['KHR_materials_pbrSpecularGlossiness']) {
                lib.materials[idx] = this._pbrSpecularGlossinessToStandard(materialInfo, materialInfo.extensions['KHR_materials_pbrSpecularGlossiness'], lib);
            }
            else {
                lib.materials[idx] = this._pbrMetallicRoughnessToStandard(materialInfo, materialInfo.pbrMetallicRoughness || {}, lib);
            }
        }, this);
    },

    _parseMeshes: function (json, lib) {
        var self = this;

        util.each(json.meshes, function (meshInfo, idx) {
            lib.meshes[idx] = [];
            // Geometry
            for (var pp = 0; pp < meshInfo.primitives.length; pp++) {
                var primitiveInfo = meshInfo.primitives[pp];
                var geometry = new Geometry({
                    dynamic: false,
                    // PENDIGN
                    name: meshInfo.name,
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
                    var size = SIZE_MAP[attributeInfo.type];
                    var attributeArray = getAccessorData(json, lib, accessorIdx);
                    // WebGL attribute buffer not support uint32.
                    // Direct use Float32Array may also have issue.
                    if (attributeArray instanceof vendor.Uint32Array) {
                        attributeArray = new Float32Array(attributeArray);
                    }
                    if (semantic === 'WEIGHTS_0' && size === 4) {
                        // Weight data in QTEK has only 3 component, the last component can be evaluated since it is normalized
                        var weightArray = new attributeArray.constructor(attributeInfo.count * 3);
                        for (var i = 0; i < attributeInfo.count; i++) {
                            var i4 = i * 4, i3 = i * 3;
                            var w1 = attributeArray[i4], w2 = attributeArray[i4 + 1], w3 = attributeArray[i4 + 2], w4 = attributeArray[i4 + 3];
                            var wSum = w1 + w2 + w3 + w4;
                            weightArray[i3] = w1 / wSum;
                            weightArray[i3 + 1] = w2 / wSum;
                            weightArray[i3 + 2] = w3 / wSum;
                        }
                        geometry.attributes[attributeName].value = weightArray;
                    }
                    else if (semantic === 'COLOR_0' && size === 3) {
                        var colorArray = new attributeArray.constructor(attributeInfo.count * 4);
                        for (var i = 0; i < attributeInfo.count; i++) {
                            var i4 = i * 4, i3 = i * 3;
                            colorArray[i4] = attributeArray[i3];
                            colorArray[i4 + 1] = attributeArray[i3 + 1];
                            colorArray[i4 + 2] = attributeArray[i3 + 2];
                            colorArray[i4 + 3] = 1;
                        }
                        geometry.attributes[attributeName].value = colorArray;
                    }
                    else {
                        geometry.attributes[attributeName].value = attributeArray;
                    }

                    var attributeType = 'float';
                    if (attributeArray instanceof vendor.Uint16Array) {
                        attributeType = 'ushort';
                    }
                    else if (attributeArray instanceof vendor.Int16Array) {
                        attributeType = 'short';
                    }
                    else if (attributeArray instanceof vendor.Uint8Array) {
                        attributeType = 'ubyte';
                    }
                    else if (attributeArray instanceof vendor.Int8Array) {
                        attributeType = 'byte';
                    }
                    geometry.attributes[attributeName].type = attributeType;

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
                if (primitiveInfo.indices != null) {
                    geometry.indices = getAccessorData(json, lib, primitiveInfo.indices, true);
                    if (geometry.vertexCount <= 0xffff && geometry.indices instanceof vendor.Uint32Array) {
                        geometry.indices = new vendor.Uint16Array(geometry.indices);
                    }
                    if(geometry.indices instanceof vendor.Uint8Array) {
                        geometry.indices = new vendor.Uint16Array(geometry.indices);
                    }
                }

                var material = lib.materials[primitiveInfo.material];
                var materialInfo = (json.materials || [])[primitiveInfo.material];
                // Use default material
                if (!material) {
                    material = new Material({
                        shader: self._getShader()
                    });
                }
                var mesh = new Mesh({
                    geometry: geometry,
                    material: material,
                    mode: [Mesh.POINTS, Mesh.LINES, Mesh.LINE_LOOP, Mesh.LINE_STRIP, Mesh.TRIANGLES, Mesh.TRIANGLE_STRIP, Mesh.TRIANGLE_FAN][primitiveInfo.mode] || Mesh.TRIANGLES,
                    ignoreGBuffer: material.transparent
                });
                if (materialInfo != null) {
                    mesh.culling = !materialInfo.doubleSided;
                }
                if (!mesh.geometry.attributes.normal.value) {
                    mesh.geometry.generateVertexNormals();
                }
                if (((material instanceof StandardMaterial) && material.normalMap)
                    || (material.isTextureEnabled('normalMap'))
                ) {
                    if (!mesh.geometry.attributes.tangent.value) {
                        mesh.geometry.generateTangents();
                    }
                }
                if (mesh.geometry.attributes.color.value) {
                    mesh.material.define('VERTEX_COLOR');
                }

                mesh.name = GLTFLoader.generateMeshName(json.meshes, idx, pp);

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
                fov: perspectiveInfo.yfov / Math.PI * 180,
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
                culling: mesh.culling,
                mode: mesh.mode
            });
        }

        lib.instancedMeshes = [];

        util.each(json.nodes, function (nodeInfo, idx) {
            var node;
            if (nodeInfo.camera != null && this.includeCamera) {
                node = this._instanceCamera(json, nodeInfo);
                lib.cameras.push(node);
            }
            else if (nodeInfo.mesh != null && this.includeMesh) {
                var primitives = lib.meshes[nodeInfo.mesh];
                if (primitives) {
                    if (primitives.length === 1) {
                        // Replace the node with mesh directly
                        node = instanceMesh(primitives[0]);
                        node.setName(nodeInfo.name);
                        lib.instancedMeshes.push(node);
                    }
                    else {
                        node = new Node();
                        node.setName(nodeInfo.name);
                        for (var j = 0; j < primitives.length; j++) {
                            var newMesh = instanceMesh(primitives[j]);
                            node.add(newMesh);
                            lib.instancedMeshes.push(newMesh);
                        }
                    }
                }
            }
            else {
                node = new Node();
                // PENDING Dulplicate name.
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
        util.each(json.nodes, function (nodeInfo, idx) {
            var node = lib.nodes[idx];
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

        var timeAccessorMultiplied = {};
        util.each(json.animations, function (animationInfo, idx) {
            var channels = animationInfo.channels.filter(checkChannelPath);

            if (!channels.length) {
                return;
            }
            var tracks = {};
            for (var i = 0; i < channels.length; i++) {
                var channelInfo = channels[i];
                var channelHash = getChannelHash(channelInfo, animationInfo);

                var targetNode = lib.nodes[channelInfo.target.node];
                var track = tracks[channelHash];
                var samplerInfo = animationInfo.samplers[channelInfo.sampler];

                if (!track) {
                    track = tracks[channelHash] = new SamplerTrack({
                        name: targetNode ? targetNode.name : '',
                        target: targetNode
                    });
                    track.targetNodeIndex = channelInfo.target.node;
                    track.channels.time = getAccessorData(json, lib, samplerInfo.input);
                    var frameLen = track.channels.time.length;
                    if (!timeAccessorMultiplied[samplerInfo.input]) {
                        for (var k = 0; k < frameLen; k++) {
                            track.channels.time[k] *= 1000;
                        }
                        timeAccessorMultiplied[samplerInfo.input] = true;
                    }
                }

                var interpolation = samplerInfo.interpolation || 'LINEAR';
                if (interpolation !== 'LINEAR') {
                    console.warn('GLTFLoader only support LINEAR interpolation.');
                }

                var path = channelInfo.target.path;
                if (path === 'translation') {
                    path = 'position';
                }

                track.channels[path] = getAccessorData(json, lib, samplerInfo.output);
            }
            var tracksList = [];
            for (var hash in tracks) {
                tracksList.push(tracks[hash]);
            }
            var clip = new TrackClip({
                name: animationInfo.name,
                loop: true,
                tracks: tracksList
            });
            lib.clips.push(clip);
        }, this);


        // PENDING
        var maxLife = lib.clips.reduce(function (maxTime, clip) {
            return Math.max(maxTime, clip.life);
        }, 0);
        lib.clips.forEach(function (clip) {
            clip.life = maxLife;
        });

        return lib.clips;
    }
});

GLTFLoader.generateMeshName = function (meshes, idx, primitiveIdx) {
    var meshInfo = meshes[idx];
    var meshName = meshInfo.name || ('mesh_' + idx);
    return primitiveIdx === 0 ? meshName : (meshName + '$' + primitiveIdx);
};

export default GLTFLoader;

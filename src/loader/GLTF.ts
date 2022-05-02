/**
 * glTF Loader
 * Specification https://github.com/KhronosGroup/glTF/blob/master/specification/README.md
 *
 * TODO Morph targets
 * TODO glTF type definitions
 */
import * as util from '../core/util';
import vendor from '../core/vendor';

import Scene from '../Scene';
import Material from '../Material';
import StandardMaterial, { StandardMaterialOpts } from '../StandardMaterial';
import Mesh from '../Mesh';
import ClayNode from '../Node';
import Texture, { TextureOpts } from '../Texture';
import Texture2D from '../Texture2D';
import Skeleton from '../Skeleton';
import Joint from '../Joint';
import PerspectiveCamera from '../camera/Perspective';
import OrthographicCamera from '../camera/Orthographic';
import * as glenum from '../core/glenum';

import BoundingBox from '../math/BoundingBox';

import TrackAnimator from '../animation/TrackAnimator';
import SamplerTrack from '../animation/SamplerTrack';

import Geometry from '../Geometry';

// Import builtin shader
import Shader from '../Shader';
import StandardShader from '../shader/StandardShader';
import type Camera from '../Camera';

type GLTFFormat = any;
type GLTFNode = any;
type GLTFSkin = any;
type GLTFTexture = any;
type GLTFMaterial = any;
type GLTFMesh = any;
type GLTFChannel = any;
type GLTFAnimation = any;
type GLTFBuffer = any;
type GLTFBufferView = any;

interface ParsedLib {
  json: GLTFFormat;
  buffers: ArrayBuffer[];
  bufferViews: ArrayBuffer[];

  rootNode?: ClayNode;
  cameras: Camera[];
  nodes: ClayNode[];
  textures: Texture2D[];
  materials: Material[];
  meshes: Mesh[][];
  joints: Joint[];
  skeletons: Skeleton[];
  animators: TrackAnimator[];

  instancedMeshes: Mesh[];
}

export type GLTFLoadResult = Pick<
  ParsedLib,
  'json' | 'rootNode' | 'cameras' | 'textures' | 'materials' | 'skeletons' | 'animators' | 'nodes'
> & {
  scene?: Scene;
  meshes: Mesh[];
};

const semanticAttributeMap = {
  NORMAL: 'normal',
  POSITION: 'position',
  TEXCOORD_0: 'texcoord0',
  TEXCOORD_1: 'texcoord1',
  WEIGHTS_0: 'weight',
  JOINTS_0: 'joint',
  COLOR_0: 'color'
};

const ARRAY_CTOR_MAP = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
} as const;
const SIZE_MAP = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
};

type AccessorDataViews =
  | Int8Array
  | Uint8Array
  | Uint16Array
  | Uint16Array
  | Uint32Array
  | Float32Array;

function getAccessorData(
  json: GLTFFormat,
  lib: ParsedLib,
  accessorIdx: number,
  isIndices?: boolean
): AccessorDataViews {
  const accessorInfo = json.accessors[accessorIdx];

  const buffer = lib.bufferViews[accessorInfo.bufferView];
  const byteOffset = accessorInfo.byteOffset || 0;
  const ArrayCtor = (ARRAY_CTOR_MAP as any)[accessorInfo.componentType] || Float32Array;

  let size = (SIZE_MAP as any)[accessorInfo.type];
  if (size == null && isIndices) {
    size = 1;
  }
  let arr = new ArrayCtor(buffer, byteOffset, size * accessorInfo.count);

  const quantizeExtension =
    accessorInfo.extensions && accessorInfo.extensions.WEB3D_quantized_attributes;
  if (quantizeExtension) {
    const decodedArr = new Float32Array(size * accessorInfo.count);
    const decodeMatrix = quantizeExtension.decodeMatrix;
    const decodeOffset = [];
    const decodeScale = [];
    for (let k = 0; k < size; k++) {
      decodeOffset[k] = decodeMatrix[size * (size + 1) + k];
      decodeScale[k] = decodeMatrix[k * (size + 1) + k];
    }
    for (let i = 0; i < accessorInfo.count; i++) {
      for (let k = 0; k < size; k++) {
        decodedArr[i * size + k] = arr[i * size + k] * decodeScale[k] + decodeOffset[k];
      }
    }

    arr = decodedArr;
  }
  return arr;
}

function base64ToBinary(input: string, charStart: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(130);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  // Ignore
  let len = input.length - charStart;
  if (input.charAt(len - 1) === '=') {
    len--;
  }
  if (input.charAt(len - 1) === '=') {
    len--;
  }

  const uarray = new Uint8Array((len / 4) * 3);

  for (let i = 0, j = charStart; i < uarray.length; ) {
    const c1 = lookup[input.charCodeAt(j++)];
    const c2 = lookup[input.charCodeAt(j++)];
    const c3 = lookup[input.charCodeAt(j++)];
    const c4 = lookup[input.charCodeAt(j++)];

    uarray[i++] = (c1 << 2) | (c2 >> 4);
    uarray[i++] = ((c2 & 15) << 4) | (c3 >> 2);
    uarray[i++] = ((c3 & 3) << 6) | c4;
  }

  return uarray.buffer;
}

interface GLTFLoadOpts {
  rootNode?: ClayNode;

  /**
   * Root path for uri parsing.
   */
  rootPath?: string;

  /**
   * Root path for texture uri parsing. Defaultly use the rootPath
   * @type {string}
   */
  textureRootPath?: string;

  /**
   * Root path for buffer uri parsing. Defaultly use the rootPath
   */
  bufferRootPath?: string;

  /**
   * Shader used when creating the materials.
   */
  shader?: Shader;

  /**
   * If use {@link clay.StandardMaterial}
   */
  useStandardMaterial?: boolean;

  /**
   * If loading the cameras.
   */
  includeCamera?: boolean;

  /**
   * If loading the animations.
   * @type {boolean}
   */
  includeAnimation?: boolean;
  /**
   * If loading the meshes
   */
  includeMesh?: boolean;
  /**
   * If loading the textures.
   */
  includeTexture?: boolean;

  /**
   * @type {string}
   */
  crossOrigin: string;
  /**
   * @see https://github.com/KhronosGroup/glTF/issues/674
   */
  textureFlipY: boolean;

  /**
   * If convert texture to power-of-two
   */
  textureConvertToPOT: boolean;

  onload?: (res: GLTFLoadResult) => void;
  onerror?: (err: any) => void;
  onprogress?: (percent: number, loaded: number, total: number) => void;
}

export function load(
  url: string,
  opts?: Omit<GLTFLoadOpts, 'onload' | 'onerror'>
): Promise<GLTFLoadResult> {
  return new Promise((resolve, reject) => {
    doLoadGLTF(
      url,
      Object.assign({}, opts, {
        onload(res: GLTFLoadResult) {
          resolve(res);
        },
        onerror(err: any) {
          reject(err);
        }
      })
    );
  });
}

function doLoadGLTF(url: string, opts?: GLTFLoadOpts) {
  opts = Object.assign(
    {
      useStandardMaterial: false,

      shader: new StandardShader(),
      includeCamera: true,

      includeAnimation: true,
      includeMesh: true,
      includeTexture: true,

      rootPath: url.slice(0, url.lastIndexOf('/')),

      crossOrigin: '',
      textureFlipY: false,

      textureConvertToPOT: false
    },
    opts
  );

  const isBinary = url.endsWith('.glb');
  const onprogress = opts!.onprogress;
  const onerror = opts!.onerror;

  vendor.request.get({
    url: url,
    onprogress(percent, loaded, total) {
      onprogress && onprogress(percent, loaded, total);
    },
    onerror(e) {
      onerror && onerror(e);
    },
    responseType: isBinary ? 'arraybuffer' : 'text',
    onload(data: ArrayBuffer) {
      if (isBinary) {
        parseBinary(data, opts!);
      } else {
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        parse(data as any, undefined, opts!);
      }
    }
  });
}

/**
 * Parse glTF binary
 * @param {ArrayBuffer} buffer
 * @return {clay.loader.GLTF.Result}
 */
export function parseBinary(buffer: ArrayBuffer, opts: GLTFLoadOpts) {
  const header = new Uint32Array(buffer, 0, 4);
  const onerror = opts.onerror;
  if (header[0] !== 0x46546c67) {
    onerror && onerror('Invalid glTF binary format: Invalid header');
    return;
  }
  if (header[0] < 2) {
    onerror && onerror('Only glTF2.0 is supported.');
    return;
  }

  const dataView = new DataView(buffer, 12);

  let json;
  const buffers = [];
  // Read chunks
  for (let i = 0; i < dataView.byteLength; ) {
    const chunkLength = dataView.getUint32(i, true);
    i += 4;
    const chunkType = dataView.getUint32(i, true);
    i += 4;

    // json
    if (chunkType === 0x4e4f534a) {
      const arr = new Uint8Array(buffer, i + 12, chunkLength);
      // TODO, for the browser not support TextDecoder.
      const decoder = new TextDecoder();
      const str = decoder.decode(arr);
      try {
        json = JSON.parse(str);
      } catch (e) {
        onerror && onerror('JSON Parse error:' + e);
        return;
      }
    } else if (chunkType === 0x004e4942) {
      buffers.push(buffer.slice(i + 12, i + 12 + chunkLength));
    }

    i += chunkLength;
  }
  if (!json) {
    onerror && onerror("Invalid glTF binary format: Can't find JSON.");
    return;
  }

  return parse(json, buffers, opts);
}

/**
 * @param {Object} json
 * @param {ArrayBuffer[]} [buffer]
 * @return {clay.loader.GLTF.Result}
 */
export function parse(json: GLTFFormat, buffers: ArrayBuffer[] | undefined, opts: GLTFLoadOpts) {
  const lib: ParsedLib = {
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
    animators: [],
    instancedMeshes: []
  };
  // Mount on the root node if given
  const rootNode = opts.rootNode || new Scene();

  let loading = 0;
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
  } else {
    // Load buffers
    (json.buffers || []).forEach((bufferInfo: GLTFBuffer, idx: number) => {
      loading++;
      const path = bufferInfo.uri;

      loadBuffers(
        path,
        function (buffer) {
          lib.buffers[idx] = buffer;
          checkLoad();
        },
        checkLoad,
        opts
      );
    });
  }

  function getResult(): GLTFLoadResult {
    return {
      json: json,
      scene: opts.rootNode ? undefined : (rootNode as Scene),
      rootNode: opts.rootNode ? rootNode : undefined,
      cameras: lib.cameras,
      textures: lib.textures,
      materials: lib.materials,
      skeletons: lib.skeletons,
      meshes: lib.instancedMeshes,
      animators: lib.animators,
      nodes: lib.nodes
    };
  }

  function afterLoadBuffer(immediately?: boolean) {
    // Buffer not load complete.
    if (lib.buffers.length !== json.buffers.length) {
      setTimeout(function () {
        opts.onerror && opts.onerror('Buffer not load complete.');
      });
      return;
    }

    (json.bufferViews || []).forEach((bufferViewInfo: GLTFBufferView, idx: number) => {
      // PENDING Performance
      lib.bufferViews[idx] = lib.buffers[bufferViewInfo.buffer].slice(
        bufferViewInfo.byteOffset || 0,
        (bufferViewInfo.byteOffset || 0) + (bufferViewInfo.byteLength || 0)
      );
    });
    // @ts-ignore
    lib.buffers = undefined;
    if (opts.includeMesh) {
      if (opts.includeTexture) {
        parseTextures(json, lib, opts);
      }
      parseMaterials(json, lib, opts);
      parseMeshes(json, lib, opts);
    }
    parseNodes(json, lib, opts);

    // Only support one scene.
    if (json.scenes) {
      const sceneInfo = json.scenes[json.scene || 0]; // Default use the first scene.
      if (sceneInfo) {
        for (let i = 0; i < sceneInfo.nodes.length; i++) {
          const node = lib.nodes[sceneInfo.nodes[i]];
          node.update();
          rootNode.add(node);
        }
      }
    }

    if (opts.includeMesh) {
      parseSkins(json, lib, opts);
    }

    if (opts.includeAnimation) {
      parseAnimations(json, lib, opts);
    }
    if (immediately) {
      setTimeout(function () {
        opts.onload && opts.onload(getResult());
      });
    } else {
      opts.onload && opts.onload(getResult());
    }
  }

  return getResult();
}

/**
 * Binary file path resolver. User can override it
 * @param {string} path
 */
function resolveBufferPath(path: string, opts: GLTFLoadOpts) {
  if (path && path.match(/^data:(.*?)base64,/)) {
    return path;
  }

  return util.relative2absolute(path, opts.bufferRootPath || opts.rootPath!);
}

/**
 * Texture file path resolver. User can override it
 * @param {string} path
 */
function resolveTexturePath(path: string, opts: GLTFLoadOpts) {
  if (path && path.match(/^data:(.*?)base64,/)) {
    return path;
  }

  return util.relative2absolute(path, opts.textureRootPath || opts.rootPath || '');
}

function loadBuffers(
  path: string,
  onsuccess: (buffer: ArrayBuffer) => void,
  onerror: (err: any) => void,
  opts: GLTFLoadOpts
) {
  const base64Prefix = 'data:application/octet-stream;base64,';
  const strStart = path.substr(0, base64Prefix.length);
  if (strStart === base64Prefix) {
    onsuccess(base64ToBinary(path, base64Prefix.length));
  } else {
    vendor.request.get({
      url: resolveBufferPath(path, opts),
      responseType: 'arraybuffer',
      onload(buffer) {
        onsuccess && onsuccess(buffer);
      },
      onerror(err) {
        onerror && onerror(err);
      }
    });
  }
}

// https://github.com/KhronosGroup/glTF/issues/100
// https://github.com/KhronosGroup/glTF/issues/193
function parseSkins(json: GLTFFormat, lib: ParsedLib, opts: GLTFLoadOpts) {
  // Create skeletons and joints
  (json.skins || []).forEach((skinInfo: GLTFSkin, idx: number) => {
    const skeleton = new Skeleton(skinInfo.name);
    for (let i = 0; i < skinInfo.joints.length; i++) {
      const nodeIdx = skinInfo.joints[i];
      const node = lib.nodes[nodeIdx];
      const joint = new Joint(node.name, skeleton.joints.length, node);
      skeleton.joints.push(joint);
    }
    skeleton.relativeRootNode = lib.nodes[skinInfo.skeleton] || opts.rootNode;
    if (skinInfo.inverseBindMatrices) {
      const IBMInfo = json.accessors[skinInfo.inverseBindMatrices];
      const buffer = lib.bufferViews[IBMInfo.bufferView];

      const offset = IBMInfo.byteOffset || 0;
      const size = IBMInfo.count * 16;

      const array = new Float32Array(buffer, offset, size);

      skeleton.setJointMatricesArray(array);
    } else {
      skeleton.updateJointMatrices();
    }
    lib.skeletons[idx] = skeleton;
  });

  function enableSkinningForMesh(mesh: Mesh, skeleton: Skeleton, jointIndices: number[]) {
    mesh.skeleton = skeleton;
    mesh.joints = jointIndices;

    if (!skeleton.boundingBox) {
      skeleton.updateJointsBoundingBoxes(mesh.geometry);
    }
  }

  function getJointIndex(joint: Joint) {
    return joint.index;
  }

  (json.nodes || []).forEach((nodeInfo: GLTFNode, nodeIdx: number) => {
    if (nodeInfo.skin != null) {
      const skinIdx = nodeInfo.skin;
      const skeleton = lib.skeletons[skinIdx];

      const node = lib.nodes[nodeIdx];
      const jointIndices = skeleton.joints.map(getJointIndex);
      if (node instanceof Mesh) {
        enableSkinningForMesh(node, skeleton, jointIndices);
      } else {
        // Mesh have multiple primitives
        const children = node.childrenRef();
        for (let i = 0; i < children.length; i++) {
          enableSkinningForMesh(children[i] as Mesh, skeleton, jointIndices);
        }
      }
    }
  });
}

function parseTextures(json: GLTFFormat, lib: ParsedLib, opts: GLTFLoadOpts) {
  (json.textures || []).forEach((textureInfo: GLTFTexture, idx: number) => {
    // samplers is optional
    const samplerInfo = (json.samplers && json.samplers[textureInfo.sampler]) || {};
    const parameters: Partial<TextureOpts> = {};
    (['wrapS', 'wrapT', 'magFilter', 'minFilter'] as const).forEach(function (name) {
      const value = samplerInfo[name];
      if (value != null) {
        parameters[name] = value;
      }
    });
    util.defaults(parameters, {
      wrapS: Texture.REPEAT,
      wrapT: Texture.REPEAT,
      flipY: opts.textureFlipY,
      convertToPOT: opts.textureConvertToPOT
    });

    const target = textureInfo.target || glenum.TEXTURE_2D;
    const format = textureInfo.format;
    if (format != null) {
      parameters.format = format;
    }

    if (target === glenum.TEXTURE_2D) {
      const texture = new Texture2D(parameters);
      const imageInfo = json.images[textureInfo.source];
      let uri;
      if (imageInfo.uri) {
        uri = resolveTexturePath(imageInfo.uri, opts);
      } else if (imageInfo.bufferView != null) {
        uri = URL.createObjectURL(
          new Blob([lib.bufferViews[imageInfo.bufferView]], {
            type: imageInfo.mimeType
          })
        );
      }
      if (uri) {
        texture.load(uri, opts.crossOrigin);
        lib.textures[idx] = texture;
      }
    }
  });
}

function KHRCommonMaterialToStandard(
  materialInfo: GLTFMaterial,
  lib: ParsedLib,
  opts: GLTFLoadOpts
) {
  /* eslint-disable-next-line */
  const commonMaterialInfo = materialInfo.extensions['KHR_materials_common'];
  const uniforms = commonMaterialInfo.values || {};

  if (typeof uniforms.diffuse === 'number') {
    uniforms.diffuse = lib.textures[uniforms.diffuse];
  }
  if (typeof uniforms.emission === 'number') {
    uniforms.emission = lib.textures[uniforms.emission];
  }

  const enabledTextures = [];
  if (uniforms.diffuse instanceof Texture2D) {
    enabledTextures.push('diffuseMap');
  }
  if (materialInfo.normalTexture) {
    enabledTextures.push('normalMap');
  }
  if (uniforms.emission instanceof Texture2D) {
    enabledTextures.push('emissiveMap');
  }
  let material;
  const isStandardMaterial = opts.useStandardMaterial;
  if (isStandardMaterial) {
    material = new StandardMaterial({
      name: materialInfo.name,
      doubleSided: materialInfo.doubleSided
    });
  } else {
    material = new Material({
      name: materialInfo.name,
      shader: opts.shader
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

  let diffuseProp = uniforms.diffuse;
  if (diffuseProp) {
    // Color
    if (Array.isArray(diffuseProp)) {
      diffuseProp = diffuseProp.slice(0, 3);
      isStandardMaterial
        ? ((material as StandardMaterial).color = diffuseProp)
        : material.set('color', diffuseProp);
    } else {
      // Texture
      isStandardMaterial
        ? ((material as StandardMaterial).diffuseMap = diffuseProp)
        : material.set('diffuseMap', diffuseProp);
    }
  }
  let emissionProp = uniforms.emission;
  if (emissionProp != null) {
    // Color
    if (Array.isArray(emissionProp)) {
      emissionProp = emissionProp.slice(0, 3);
      isStandardMaterial
        ? ((material as StandardMaterial).emission = emissionProp)
        : material.set('emission', emissionProp);
    } else {
      // Texture
      isStandardMaterial
        ? ((material as StandardMaterial).emissiveMap = emissionProp)
        : material.set('emissiveMap', emissionProp);
    }
  }
  if (materialInfo.normalTexture != null) {
    // TODO texCoord
    const normalTextureIndex = materialInfo.normalTexture.index;
    if (isStandardMaterial) {
      (material as StandardMaterial).normalMap = lib.textures[normalTextureIndex];
    } else {
      material.set('normalMap', lib.textures[normalTextureIndex]);
    }
  }
  if (uniforms.shininess != null) {
    const glossiness = Math.log(uniforms.shininess) / Math.log(8192);
    // Uniform glossiness
    material.set('glossiness', glossiness);
    material.set('roughness', 1 - glossiness);
  } else {
    material.set('glossiness', 0.3);
    material.set('roughness', 0.3);
  }
  if (uniforms.specular != null) {
    material.set('specularColor', uniforms.specular.slice(0, 3));
  }
  if (uniforms.transparency != null) {
    material.set('alpha', uniforms.transparency);
  }

  return material;
}

function pbrMetallicRoughnessToStandard(
  materialInfo: GLTFMaterial,
  metallicRoughnessMatInfo: any,
  lib: ParsedLib,
  opts: GLTFLoadOpts
) {
  const alphaTest = materialInfo.alphaMode === 'MASK';

  const isStandardMaterial = opts.useStandardMaterial;
  let material;
  let diffuseMap, roughnessMap, metalnessMap, normalMap, emissiveMap, occlusionMap;
  const enabledTextures = [];

  /**
   * The scalar multiplier applied to each normal vector of the normal texture.
   *
   * @type {number}
   *
   * XXX This value is ignored if `materialInfo.normalTexture` is not specified.
   */
  let normalScale = 1.0;

  // TODO texCoord
  if (metallicRoughnessMatInfo.baseColorTexture) {
    diffuseMap = lib.textures[metallicRoughnessMatInfo.baseColorTexture.index];
    diffuseMap && enabledTextures.push('diffuseMap');
  }
  if (metallicRoughnessMatInfo.metallicRoughnessTexture) {
    roughnessMap = metalnessMap =
      lib.textures[metallicRoughnessMatInfo.metallicRoughnessTexture.index];
    roughnessMap && enabledTextures.push('metalnessMap', 'roughnessMap');
  }
  if (materialInfo.normalTexture) {
    normalMap = lib.textures[materialInfo.normalTexture.index];
    normalMap && enabledTextures.push('normalMap');

    if (typeof materialInfo.normalTexture.scale === 'number') {
      normalScale = materialInfo.normalTexture.scale;
    }
  }
  if (materialInfo.emissiveTexture) {
    emissiveMap = lib.textures[materialInfo.emissiveTexture.index];
    emissiveMap && enabledTextures.push('emissiveMap');
  }
  if (materialInfo.occlusionTexture) {
    occlusionMap = lib.textures[materialInfo.occlusionTexture.index];
    occlusionMap && enabledTextures.push('occlusionMap');
  }
  const baseColor = metallicRoughnessMatInfo.baseColorFactor || [1, 1, 1, 1];

  const commonProperties = {
    diffuseMap,
    roughnessMap,
    metalnessMap,
    normalMap,
    occlusionMap,
    emissiveMap,
    color: baseColor.slice(0, 3),
    alpha: baseColor[3],
    metalness: metallicRoughnessMatInfo.metallicFactor || 0,
    roughness: metallicRoughnessMatInfo.roughnessFactor || 0,
    emission: materialInfo.emissiveFactor || [0, 0, 0],
    emissionIntensity: 1,
    alphaCutoff: materialInfo.alphaCutoff || 0.5,
    normalScale: normalScale
  } as StandardMaterialOpts;
  if (commonProperties.roughnessMap) {
    // In glTF metallicFactor will do multiply, which is different from StandardMaterial.
    // So simply ignore it
    commonProperties.metalness = 0.5;
    commonProperties.roughness = 0.5;
  }
  if (isStandardMaterial) {
    material = new StandardMaterial(
      Object.assign(
        {
          name: materialInfo.name,
          alphaTest: alphaTest,
          doubleSided: materialInfo.doubleSided,
          // G channel
          roughnessChannel: 1,
          // B Channel
          metalnessChannel: 2
        },
        commonProperties
      )
    );
  } else {
    material = new Material({
      name: materialInfo.name,
      shader: opts.shader
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
}

function pbrSpecularGlossinessToStandard(
  materialInfo: GLTFMaterial,
  specularGlossinessMatInfo: any,
  lib: ParsedLib,
  opts: GLTFLoadOpts
) {
  const alphaTest = materialInfo.alphaMode === 'MASK';

  if (opts.useStandardMaterial) {
    console.error("StandardMaterial doesn't support specular glossiness workflow yet");
  }

  let diffuseMap, glossinessMap, specularMap, normalMap, emissiveMap, occlusionMap;
  const enabledTextures = [];
  // TODO texCoord
  if (specularGlossinessMatInfo.diffuseTexture) {
    diffuseMap = lib.textures[specularGlossinessMatInfo.diffuseTexture.index];
    diffuseMap && enabledTextures.push('diffuseMap');
  }
  if (specularGlossinessMatInfo.specularGlossinessTexture) {
    glossinessMap = specularMap =
      lib.textures[specularGlossinessMatInfo.specularGlossinessTexture.index];
    glossinessMap && enabledTextures.push('specularMap', 'glossinessMap');
  }
  if (materialInfo.normalTexture) {
    normalMap = lib.textures[materialInfo.normalTexture.index];
    normalMap && enabledTextures.push('normalMap');
  }
  if (materialInfo.emissiveTexture) {
    emissiveMap = lib.textures[materialInfo.emissiveTexture.index];
    emissiveMap && enabledTextures.push('emissiveMap');
  }
  if (materialInfo.occlusionTexture) {
    occlusionMap = lib.textures[materialInfo.occlusionTexture.index];
    occlusionMap && enabledTextures.push('occlusionMap');
  }
  const diffuseColor = specularGlossinessMatInfo.diffuseFactor || [1, 1, 1, 1];

  const commonProperties = {
    diffuseMap: diffuseMap,
    glossinessMap: glossinessMap,
    specularMap: specularMap,
    normalMap: normalMap,
    emissiveMap: emissiveMap,
    occlusionMap: occlusionMap,
    color: diffuseColor.slice(0, 3),
    alpha: diffuseColor[3],
    specularColor: specularGlossinessMatInfo.specularFactor || [1, 1, 1],
    glossiness: specularGlossinessMatInfo.glossinessFactor || 0,
    emission: materialInfo.emissiveFactor || [0, 0, 0],
    emissionIntensity: 1,
    alphaCutoff: materialInfo.alphaCutoff == null ? 0.5 : materialInfo.alphaCutoff
  };
  if (commonProperties.glossinessMap) {
    // Ignore specularFactor
    commonProperties.glossiness = 0.5;
  }
  if (commonProperties.specularMap) {
    // Ignore specularFactor
    commonProperties.specularColor = [1, 1, 1];
  }

  const material = new Material({
    name: materialInfo.name,
    shader: opts.shader
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
}

function parseMaterials(json: GLTFFormat, lib: ParsedLib, opts: GLTFLoadOpts) {
  (json.materials || []).forEach((materialInfo: GLTFMaterial, idx: number) => {
    /* eslint-disable-next-line */
    if (materialInfo.extensions && materialInfo.extensions['KHR_materials_common']) {
      lib.materials[idx] = KHRCommonMaterialToStandard(materialInfo, lib, opts);
    } else if (
      materialInfo.extensions &&
      /* eslint-disable-next-line */
      materialInfo.extensions['KHR_materials_pbrSpecularGlossiness']
    ) {
      lib.materials[idx] = pbrSpecularGlossinessToStandard(
        materialInfo,
        /* eslint-disable-next-line */
        materialInfo.extensions['KHR_materials_pbrSpecularGlossiness'],
        lib,
        opts
      );
    } else {
      lib.materials[idx] = pbrMetallicRoughnessToStandard(
        materialInfo,
        materialInfo.pbrMetallicRoughness || {},
        lib,
        opts
      );
    }
  });
}

function parseMeshes(json: GLTFFormat, lib: ParsedLib, opts: GLTFLoadOpts) {
  (json.meshes || []).forEach((meshInfo: GLTFMesh, idx: number) => {
    lib.meshes[idx] = [];
    // Geometry
    for (let pp = 0; pp < meshInfo.primitives.length; pp++) {
      const primitiveInfo = meshInfo.primitives[pp];
      const geometry = new Geometry({
        dynamic: false,
        // PENDIGN
        name: meshInfo.name
      });
      geometry.boundingBox = new BoundingBox();
      // Parse attributes
      const semantics = Object.keys(primitiveInfo.attributes);
      for (let ss = 0; ss < semantics.length; ss++) {
        const semantic = semantics[ss];
        const accessorIdx = primitiveInfo.attributes[semantic];
        const attributeInfo = json.accessors[accessorIdx];
        const attributeName = (semanticAttributeMap as any)[semantic];
        if (!attributeName) {
          continue;
        }
        const size = (SIZE_MAP as any)[attributeInfo.type];
        let attributeArray = getAccessorData(json, lib, accessorIdx);
        // WebGL attribute buffer not support uint32.
        // Direct use Float32Array may also have issue.
        if (attributeArray instanceof Uint32Array) {
          attributeArray = new Float32Array(attributeArray);
        }
        if (semantic === 'WEIGHTS_0' && size === 4) {
          // Weight data in QTEK has only 3 component, the last component can be evaluated since it is normalized
          const weightArray = new (attributeArray as any).constructor(attributeInfo.count * 3);
          for (let i = 0; i < attributeInfo.count; i++) {
            const i4 = i * 4,
              i3 = i * 3;
            const w1 = attributeArray[i4],
              w2 = attributeArray[i4 + 1],
              w3 = attributeArray[i4 + 2],
              w4 = attributeArray[i4 + 3];
            const wSum = w1 + w2 + w3 + w4;
            weightArray[i3] = w1 / wSum;
            weightArray[i3 + 1] = w2 / wSum;
            weightArray[i3 + 2] = w3 / wSum;
          }
          geometry.attributes[attributeName].value = weightArray;
        } else if (semantic === 'COLOR_0' && size === 3) {
          const colorArray = new (attributeArray as any).constructor(attributeInfo.count * 4);
          for (let i = 0; i < attributeInfo.count; i++) {
            const i4 = i * 4,
              i3 = i * 3;
            colorArray[i4] = attributeArray[i3];
            colorArray[i4 + 1] = attributeArray[i3 + 1];
            colorArray[i4 + 2] = attributeArray[i3 + 2];
            colorArray[i4 + 3] = 1;
          }
          geometry.attributes[attributeName].value = colorArray;
        } else {
          geometry.attributes[attributeName].value = attributeArray;
        }

        let attributeType = 'float';
        if (attributeArray instanceof Uint16Array) {
          attributeType = 'ushort';
        } else if (attributeArray instanceof Int16Array) {
          attributeType = 'short';
        } else if (attributeArray instanceof Uint8Array) {
          attributeType = 'ubyte';
        } else if (attributeArray instanceof Int8Array) {
          attributeType = 'byte';
        }
        // TODO
        (geometry.attributes[attributeName] as any).type = attributeType;

        if (semantic === 'POSITION') {
          // Bounding Box
          const min = attributeInfo.min;
          const max = attributeInfo.max;
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
        geometry.indices = getAccessorData(json, lib, primitiveInfo.indices, true) as Uint16Array;
        if (geometry.vertexCount <= 0xffff && geometry.indices instanceof Uint32Array) {
          geometry.indices = new Uint16Array(geometry.indices);
        }
        if (geometry.indices instanceof Uint8Array) {
          geometry.indices = new Uint16Array(geometry.indices);
        }
      }

      let material = lib.materials[primitiveInfo.material];
      const materialInfo = (json.materials || [])[primitiveInfo.material];
      // Use default material
      if (!material) {
        material = new Material({
          shader: opts.shader
        });
      }
      const mesh = new Mesh({
        geometry: geometry,
        material: material,
        mode:
          [
            Mesh.POINTS,
            Mesh.LINES,
            Mesh.LINE_LOOP,
            Mesh.LINE_STRIP,
            Mesh.TRIANGLES,
            Mesh.TRIANGLE_STRIP,
            Mesh.TRIANGLE_FAN
          ][primitiveInfo.mode] || Mesh.TRIANGLES,
        ignoreGBuffer: material.transparent
      });
      if (materialInfo != null) {
        mesh.culling = !materialInfo.doubleSided;
      }
      if (!mesh.geometry.attributes.normal.value) {
        mesh.geometry.generateVertexNormals();
      }
      if (
        (material instanceof StandardMaterial && material.normalMap) ||
        material.isTextureEnabled('normalMap')
      ) {
        if (!mesh.geometry.attributes.tangent.value) {
          mesh.geometry.generateTangents();
        }
      }
      if (mesh.geometry.attributes.color.value) {
        mesh.material.define('VERTEX_COLOR');
      }

      mesh.name = generateMeshName(json.meshes, idx, pp);

      lib.meshes[idx].push(mesh);
    }
  });
}

function instanceCamera(json: GLTFFormat, nodeInfo: GLTFNode) {
  const cameraInfo = json.cameras[nodeInfo.camera];

  if (cameraInfo.type === 'perspective') {
    const perspectiveInfo = cameraInfo.perspective || {};
    return new PerspectiveCamera({
      name: nodeInfo.name,
      aspect: perspectiveInfo.aspectRatio,
      fov: (perspectiveInfo.yfov / Math.PI) * 180,
      far: perspectiveInfo.zfar,
      near: perspectiveInfo.znear
    });
  } else {
    const orthographicInfo = cameraInfo.orthographic || {};
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
}

function parseNodes(json: GLTFFormat, lib: ParsedLib, opts: GLTFLoadOpts) {
  function instanceMesh(mesh: Mesh): Mesh {
    return new Mesh({
      name: mesh.name,
      geometry: mesh.geometry,
      material: mesh.material,
      culling: mesh.culling,
      mode: mesh.mode
    });
  }

  (json.nodes || []).forEach((nodeInfo: GLTFNode, idx: number) => {
    let node: ClayNode;
    if (nodeInfo.camera != null && opts.includeCamera) {
      node = instanceCamera(json, nodeInfo);
      lib.cameras.push(node as Camera);
    } else if (nodeInfo.mesh != null && opts.includeMesh) {
      const primitives = lib.meshes[nodeInfo.mesh];
      if (primitives) {
        if (primitives.length === 1) {
          // Replace the node with mesh directly
          node = instanceMesh(primitives[0]);
          node.setName(nodeInfo.name);
          lib.instancedMeshes!.push(node as Mesh);
        } else {
          node = new ClayNode();
          node.setName(nodeInfo.name);
          for (let j = 0; j < primitives.length; j++) {
            const newMesh = instanceMesh(primitives[j]);
            node.add(newMesh);
            lib.instancedMeshes!.push(newMesh);
          }
        }
      }
    } else {
      node = new ClayNode();
      // PENDING Dulplicate name.
      node.setName(nodeInfo.name);
    }
    if (nodeInfo.matrix) {
      node!.localTransform.setArray(nodeInfo.matrix);
      node!.decomposeLocalTransform();
    } else {
      if (nodeInfo.translation) {
        node!.position.setArray(nodeInfo.translation);
      }
      if (nodeInfo.rotation) {
        node!.rotation.setArray(nodeInfo.rotation);
      }
      if (nodeInfo.scale) {
        node!.scale.setArray(nodeInfo.scale);
      }
    }

    lib.nodes[idx] = node!;
  });

  // Build hierarchy
  (json.nodes || []).forEach((nodeInfo: GLTFNode, idx: number) => {
    const node = lib.nodes[idx];
    if (nodeInfo.children) {
      for (let i = 0; i < nodeInfo.children.length; i++) {
        const childIdx = nodeInfo.children[i];
        const child = lib.nodes[childIdx];
        node.add(child);
      }
    }
  });
}

function parseAnimations(json: GLTFFormat, lib: ParsedLib, opts: GLTFLoadOpts) {
  function checkChannelPath(channelInfo: GLTFChannel) {
    if (channelInfo.path === 'weights') {
      console.warn('GLTFLoader not support morph targets yet.');
      return false;
    }
    return true;
  }

  function getChannelHash(channelInfo: GLTFChannel, animationInfo: GLTFAnimation) {
    return channelInfo.target.node + '_' + animationInfo.samplers[channelInfo.sampler].input;
  }

  const timeAccessorMultiplied: Record<string, boolean> = {};
  (json.animations || []).forEach((animationInfo: GLTFAnimation, idx: number) => {
    const channels = animationInfo.channels.filter(checkChannelPath);

    if (!channels.length) {
      return;
    }
    const tracks: Record<string, SamplerTrack> = {};
    for (let i = 0; i < channels.length; i++) {
      const channelInfo = channels[i];
      const channelHash = getChannelHash(channelInfo, animationInfo);

      const targetNode = lib.nodes[channelInfo.target.node];
      let track = tracks[channelHash];
      const samplerInfo = animationInfo.samplers[channelInfo.sampler];

      if (!track) {
        track = tracks[channelHash] = new SamplerTrack({
          name: targetNode ? targetNode.name : '',
          target: targetNode
        });
        track.channels.time = getAccessorData(json, lib, samplerInfo.input) as Float32Array;
        const frameLen = track.channels.time.length;
        if (!timeAccessorMultiplied[samplerInfo.input]) {
          for (let k = 0; k < frameLen; k++) {
            track.channels.time[k] *= 1000;
          }
          timeAccessorMultiplied[samplerInfo.input] = true;
        }
      }

      const interpolation = samplerInfo.interpolation || 'LINEAR';
      if (interpolation !== 'LINEAR') {
        console.warn('GLTFLoader only support LINEAR interpolation.');
      }

      let path = channelInfo.target.path;
      if (path === 'translation') {
        path = 'position';
      }

      track.channels[path as 'position' | 'rotation' | 'scale'] = getAccessorData(
        json,
        lib,
        samplerInfo.output
      ) as Float32Array;
    }
    const tracksList = [];
    for (const hash in tracks) {
      tracksList.push(tracks[hash]);
    }
    const clip = new TrackAnimator({
      name: animationInfo.name,
      loop: true,
      tracks: tracksList
    });
    lib.animators.push(clip);
  });

  // PENDING
  const maxLife = lib.animators.reduce(function (maxTime, animator) {
    return Math.max(maxTime, animator.getLife());
  }, 0);
  (lib.animators || []).forEach(function (animator) {
    animator.setLife(maxLife);
  });

  return lib.animators;
}
function generateMeshName(meshes: Mesh[], idx: number, primitiveIdx: number) {
  const meshInfo = meshes[idx];
  const meshName = meshInfo.name || 'mesh_' + idx;
  return primitiveIdx === 0 ? meshName : meshName + '$' + primitiveIdx;
}

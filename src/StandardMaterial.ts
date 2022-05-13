import Material, { MaterialOpts } from './Material';

import StandardMRShader from './shader/StandardMRShader';
import { Color } from './core/type';
import Texture2D from './Texture2D';
import type TextureCube from './TextureCube';
import type BoundingBox from './math/BoundingBox';
import { assign } from './core/util';

const TEXTURE_PROPERTIES = [
  'diffuseMap',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'environmentMap',
  'brdfLookup',
  'ssaoMap',
  'aoMap',
  'occlusionMap'
] as const;
const SIMPLE_PROPERTIES = [
  'color',
  'emission',
  'emissionIntensity',
  'alpha',
  'roughness',
  'metalness',
  'uvRepeat',
  'uvOffset',
  'aoIntensity',
  'alphaCutoff',
  'normalScale'
] as const;
const PROPERTIES_NEEDS_INVALIDATE_SHADER = [
  'linear',
  'encodeRGBM',
  'decodeRGBM',
  'doubleSided',
  'alphaTest',
  'roughnessChannel',
  'metalnessChannel',
  'environmentMapPrefiltered'
] as const;

const NUM_DEFINE_MAP = {
  roughnessChannel: 'ROUGHNESS_CHANNEL',
  metalnessChannel: 'METALNESS_CHANNEL'
} as const;
const BOOL_DEFINE_MAP = {
  linear: 'SRGB_DECODE',
  encodeRGBM: 'RGBM_ENCODE',
  decodeRGBM: 'RGBM_DECODE',
  doubleSided: 'DOUBLE_SIDED',
  alphaTest: 'ALPHA_TEST',
  environmentMapPrefiltered: 'ENVIRONMENTMAP_PREFILTER'
} as const;

let standardShader: StandardMRShader;

type MaterialColor = Color | string;

export interface StandardMaterialOpts extends Omit<MaterialOpts, 'shader'> {
  color: MaterialColor;

  emission: MaterialColor;

  emissionIntensity: number;

  roughness: number;

  metalness: number;

  alpha: number;

  alphaTest: boolean;

  alphaCutoff: number;

  /**
   * Scalar multiplier applied to each normal vector of normal texture.
   *
   * This value is considered only if a normal texture is specified.
   */
  normalScale: number;

  // TODO Must disable culling.
  doubleSided: boolean;

  diffuseMap?: Texture2D;

  normalMap?: Texture2D;

  roughnessMap?: Texture2D;

  metalnessMap?: Texture2D;
  emissiveMap?: Texture2D;

  environmentMap?: TextureCube;

  environmentBox?: BoundingBox;

  /**
   * BRDF Lookup is generated by clay.util.cubemap.integrateBrdf
   */
  brdfLookup?: Texture2D;

  ssaoMap?: Texture2D;

  aoMap?: Texture2D;

  occlusionMap?: Texture2D;

  uvRepeat: [number, number];

  uvOffset: [number, number];

  aoIntensity: number;

  environmentMapPrefiltered: boolean;

  linear: boolean;

  encodeRGBM: boolean;

  decodeRGBM: boolean;

  roughnessChannel: number;
  metalnessChannel: number;
}

interface StandardMaterial extends StandardMaterialOpts {}

const defaultStandardMaterialOpts = {
  color: [1, 1, 1],
  emission: [0, 0, 0],
  emissionIntensity: 0,
  roughness: 0.5,
  metalness: 0,
  alpha: 1,

  alphaTest: false,
  alphaCutoff: 0.9,
  normalScale: 1.0,
  // TODO Must disable culling.
  doubleSided: false,

  uvRepeat: [1, 1],

  uvOffset: [0, 0],
  aoIntensity: 1,

  environmentMapPrefiltered: false,

  linear: false,

  encodeRGBM: false,

  decodeRGBM: false,

  roughnessChannel: 0,
  metalnessChannel: 1
} as StandardMaterialOpts;
/**
 * Standard material without custom shader.
 * @example
 * const mat = new clay.StandardMaterial({
 *     color: [1, 1, 1],
 *     diffuseMap: diffuseTexture
 * });
 * mat.roughness = 1;
 */
class StandardMaterial extends Material {
  constructor(opts?: Partial<StandardMaterialOpts>) {
    if (!standardShader) {
      standardShader = new StandardMRShader();
    }
    super(standardShader, opts);

    assign(this, defaultStandardMaterialOpts, opts);
  }

  clone() {
    const material = new StandardMaterial({
      name: this.name
    });
    TEXTURE_PROPERTIES.forEach((propName) => {
      if (this[propName]) {
        (material as any)[propName] = this[propName];
      }
    });
    [...SIMPLE_PROPERTIES, ...PROPERTIES_NEEDS_INVALIDATE_SHADER].forEach((propName) => {
      (material as any)[propName] = this[propName];
    });
    return material;
  }
}

SIMPLE_PROPERTIES.forEach(function (propName) {
  Object.defineProperty(StandardMaterial.prototype, propName, {
    get: function () {
      return this.get(propName);
    },
    set: function (value) {
      this.setUniform(propName, value);
    }
  });
});

TEXTURE_PROPERTIES.forEach(function (propName) {
  Object.defineProperty(StandardMaterial.prototype, propName, {
    get: function () {
      return this.get(propName);
    },
    set: function (value) {
      this.setUniform(propName, value);
    }
  });
});

PROPERTIES_NEEDS_INVALIDATE_SHADER.forEach(function (propName) {
  const privateKey = '_' + propName;
  Object.defineProperty(StandardMaterial.prototype, propName, {
    get: function () {
      return this[privateKey];
    },
    set: function (value) {
      this[privateKey] = value;
      if (propName in NUM_DEFINE_MAP) {
        const defineName = NUM_DEFINE_MAP[propName as keyof typeof NUM_DEFINE_MAP];
        this.define('fragment', defineName, value);
      } else {
        const defineName =
          BOOL_DEFINE_MAP[propName as Exclude<typeof propName, keyof typeof NUM_DEFINE_MAP>];
        value ? this.define('fragment', defineName) : this.undefine('fragment', defineName);
      }
    }
  });
});

Object.defineProperty(StandardMaterial.prototype, 'environmentBox', {
  get: function () {
    const envBox = this._environmentBox;
    if (envBox) {
      envBox.min.setArray(this.get('environmentBoxMin'));
      envBox.max.setArray(this.get('environmentBoxMax'));
    }
    return envBox;
  },

  set: function (value) {
    this._environmentBox = value;

    const uniforms = (this.uniforms = this.uniforms || {});
    uniforms.environmentBoxMin = uniforms.environmentBoxMin || {
      value: null
    };
    uniforms.environmentBoxMax = uniforms.environmentBoxMax || {
      value: null
    };

    // TODO Can't detect operation like box.min = new Vector()
    if (value) {
      this.setUniform('environmentBoxMin', value.min.array);
      this.setUniform('environmentBoxMax', value.max.array);
    }

    if (value) {
      this.define('fragment', 'PARALLAX_CORRECTED');
    } else {
      this.undefine('fragment', 'PARALLAX_CORRECTED');
    }
  }
});

export default StandardMaterial;

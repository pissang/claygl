// https://docs.unrealengine.com/latest/INT/Engine/Rendering/LightingAndShadows/AmbientCubemap/
import Light, { LightOpts } from '../Light';
import Renderer from '../Renderer';
import Texture2D from '../Texture2D';
import type TextureCube from '../TextureCube';
import {
  generateNormalDistribution,
  integrateBRDF,
  prefilterEnvironmentMap
} from '../util/cubemap';

const cubemapPrefilteredMap = new WeakMap<TextureCube | Texture2D, boolean>();
export interface AmbientCubemapLightOpts extends LightOpts {
  cubemap: TextureCube | Texture2D;
}

/**
 * Ambient cubemap light provides specular parts of Image Based Lighting.
 * Which is a basic requirement for Physically Based Rendering
 */
class AmbientCubemapLight extends Light {
  cubemap?: TextureCube | Texture2D;

  _normalDistribution?: Texture2D;
  _brdfLookup?: Texture2D;

  readonly type = 'AMBIENT_CUBEMAP_LIGHT';

  constructor(opts?: Partial<AmbientCubemapLightOpts>) {
    super(opts);
    this.cubemap = opts && opts.cubemap;
  }

  /**
   * Do prefitering the cubemap
   * @param {clay.Renderer} renderer
   * @param {number} [size=32]
   */
  prefilter(renderer: Renderer, size?: number) {
    if (!renderer.getWebGLExtension('EXT_shader_texture_lod')) {
      console.warn('Device not support textureCubeLodEXT');
      return;
    }
    if (!this._brdfLookup) {
      this._normalDistribution = generateNormalDistribution();
      this._brdfLookup = integrateBRDF(renderer, this._normalDistribution);
    }
    const cubemap = this.cubemap;
    if (!cubemap) {
      return;
    }
    if (cubemapPrefilteredMap.get(cubemap)) {
      return;
    }

    const result = prefilterEnvironmentMap(
      renderer,
      cubemap,
      {
        encodeRGBM: true,
        width: size,
        height: size
      },
      this._normalDistribution,
      this._brdfLookup
    );
    this.cubemap = result.environmentMap;
    cubemapPrefilteredMap.set(this.cubemap, true);

    renderer.disposeTexture(cubemap);
  }
}

AmbientCubemapLight.prototype.uniformTemplates = {
  ambientCubemapLightColor: {
    type: '3f',
    value(instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  },

  ambientCubemapLightCubemap: {
    type: 't',
    value(instance) {
      return (instance as AmbientCubemapLight).cubemap;
    }
  },

  ambientCubemapLightBRDFLookup: {
    type: 't',
    value(instance) {
      return (instance as AmbientCubemapLight)._brdfLookup;
    }
  }
};

export default AmbientCubemapLight;

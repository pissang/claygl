// https://docs.unrealengine.com/latest/INT/Engine/Rendering/LightingAndShadows/AmbientCubemap/
import Light from '../Light';
import cubemapUtil from '../util/cubemap';

/**
 * Ambient cubemap light provides specular parts of Image Based Lighting.
 * Which is a basic requirement for Physically Based Rendering
 * @constructor clay.light.AmbientCubemap
 * @extends clay.Light
 */
var AmbientCubemapLight = Light.extend({

    /**
     * @type {clay.TextureCube}
     * @memberOf clay.light.AmbientCubemap#
     */
    cubemap: null,

    // TODO
    // range: 100,

    castShadow: false,

    _normalDistribution: null,
    _brdfLookup: null

}, /** @lends clay.light.AmbientCubemap# */ {

    type: 'AMBIENT_CUBEMAP_LIGHT',

    /**
     * Do prefitering the cubemap
     * @param {clay.Renderer} renderer
     * @param {number} [size=32]
     */
    prefilter: function (renderer, size) {
        if (!renderer.getGLExtension('EXT_shader_texture_lod')) {
            console.warn('Device not support textureCubeLodEXT');
            return;
        }
        if (!this._brdfLookup) {
            this._normalDistribution = cubemapUtil.generateNormalDistribution();
            this._brdfLookup = cubemapUtil.integrateBRDF(renderer, this._normalDistribution);
        }
        var cubemap = this.cubemap;
        if (cubemap.__prefiltered) {
            return;
        }

        var result = cubemapUtil.prefilterEnvironmentMap(
            renderer, cubemap, {
                encodeRGBM: true,
                width: size,
                height: size
            }, this._normalDistribution, this._brdfLookup
        );
        this.cubemap = result.environmentMap;
        this.cubemap.__prefiltered = true;

        cubemap.dispose(renderer);
    },

    getBRDFLookup: function () {
        return this._brdfLookup;
    },

    uniformTemplates: {
        ambientCubemapLightColor: {
            type: '3f',
            value: function (instance) {
                var color = instance.color;
                var intensity = instance.intensity;
                return [color[0]*intensity, color[1]*intensity, color[2]*intensity];
            }
        },

        ambientCubemapLightCubemap: {
            type: 't',
            value: function (instance) {
                return instance.cubemap;
            }
        },

        ambientCubemapLightBRDFLookup: {
            type: 't',
            value: function (instance) {
                return instance._brdfLookup;
            }
        }
    }
    /**
     * @function
     * @name clone
     * @return {clay.light.AmbientCubemap}
     * @memberOf clay.light.AmbientCubemap.prototype
     */
});

export default AmbientCubemapLight;

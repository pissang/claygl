// https://docs.unrealengine.com/latest/INT/Engine/Rendering/LightingAndShadows/AmbientCubemap/
import Light from '../Light';
import cubemapUtil from '../util/cubemap';

/**
 * Ambient cubemap light provides specular parts of Image Based Lighting.
 * Which is a basic requirement for Physically Based Rendering
 * @constructor qtek.light.AmbientCubemap
 * @extends qtek.Light
 */
var AmbientCubemapLight = Light.extend({

    /**
     * @type {qtek.TextureCube}
     */
    cubemap: null,

    // TODO
    // range: 100,

    castShadow: false,

    _normalDistribution: null,
    _brdfLookup: null

}, {

    type: 'AMBIENT_CUBEMAP_LIGHT',

    /**
     * Do prefitering the cubemap
     * @param {qtek.Renderer} renderer
     * @param {number} [size=32]
     */
    prefilter: function (renderer, size) {
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
     * @method
     * @name clone
     * @return {qtek.light.AmbientCubemap}
     * @memberOf qtek.light.AmbientCubemap.prototype
     */
});

export default AmbientCubemapLight;

import calcAmbientSHLightEssl from './calcAmbientSHLight.glsl.js';

var uniformVec3Prefix = 'uniform vec3 ';
var uniformFloatPrefix = 'uniform float ';
var exportHeaderPrefix = '@export clay.header.';
var exportEnd = '@end';
var unconfigurable = ':unconfigurable;';
export default [
    exportHeaderPrefix + 'directional_light',
    uniformVec3Prefix + 'directionalLightDirection[DIRECTIONAL_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'directionalLightColor[DIRECTIONAL_LIGHT_COUNT]' + unconfigurable,
    exportEnd,

    exportHeaderPrefix + 'ambient_light',
    uniformVec3Prefix + 'ambientLightColor[AMBIENT_LIGHT_COUNT]' + unconfigurable,
    exportEnd,

    exportHeaderPrefix + 'ambient_sh_light',
    uniformVec3Prefix + 'ambientSHLightColor[AMBIENT_SH_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'ambientSHLightCoefficients[AMBIENT_SH_LIGHT_COUNT * 9]' + unconfigurable,
    calcAmbientSHLightEssl,
    exportEnd,

    exportHeaderPrefix + 'ambient_cubemap_light',
    uniformVec3Prefix + 'ambientCubemapLightColor[AMBIENT_CUBEMAP_LIGHT_COUNT]' + unconfigurable,
    'uniform samplerCube ambientCubemapLightCubemap[AMBIENT_CUBEMAP_LIGHT_COUNT]' + unconfigurable,
    'uniform sampler2D ambientCubemapLightBRDFLookup[AMBIENT_CUBEMAP_LIGHT_COUNT]' + unconfigurable,
    exportEnd,

    exportHeaderPrefix + 'point_light',
    uniformVec3Prefix + 'pointLightPosition[POINT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'pointLightRange[POINT_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'pointLightColor[POINT_LIGHT_COUNT]' + unconfigurable,
    exportEnd,

    exportHeaderPrefix + 'spot_light',
    uniformVec3Prefix + 'spotLightPosition[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'spotLightDirection[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'spotLightRange[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'spotLightUmbraAngleCosine[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'spotLightPenumbraAngleCosine[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'spotLightFalloffFactor[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'spotLightColor[SPOT_LIGHT_COUNT]' + unconfigurable,
    exportEnd
].join('\n');

define(function () {
    var uniformVec3Prefix = 'uniform vec3 ';
    var uniformFloatPrefix = 'uniform float ';
    var exportHeaderPrefix = '@export buildin.header.';
    var exportEnd = '@end';
    var unconfigurable = ':unconfigurable;';
    return [
        exportHeaderPrefix + 'directional_light',
        uniformVec3Prefix + 'directionalLightDirection[DIRECTIONAL_LIGHT_NUMBER]' + unconfigurable,
        uniformVec3Prefix + 'directionalLightColor[DIRECTIONAL_LIGHT_NUMBER]' + unconfigurable,
        exportEnd,

        exportHeaderPrefix + 'ambient_light',
        uniformVec3Prefix + 'ambientLightColor[AMBIENT_LIGHT_NUMBER]' + unconfigurable,
        exportEnd,

        exportHeaderPrefix + 'point_light',
        uniformVec3Prefix + 'pointLightPosition[POINT_LIGHT_NUMBER]' + unconfigurable,
        uniformFloatPrefix + 'pointLightRange[POINT_LIGHT_NUMBER]' + unconfigurable,
        uniformVec3Prefix + 'pointLightColor[POINT_LIGHT_NUMBER]' + unconfigurable,
        exportEnd,

        exportHeaderPrefix + 'spot_light',
        uniformVec3Prefix + 'spotLightPosition[SPOT_LIGHT_NUMBER]' + unconfigurable,
        uniformVec3Prefix + 'spotLightDirection[SPOT_LIGHT_NUMBER]' + unconfigurable,
        uniformFloatPrefix + 'spotLightRange[SPOT_LIGHT_NUMBER]' + unconfigurable,
        uniformFloatPrefix + 'spotLightUmbraAngleCosine[SPOT_LIGHT_NUMBER]' + unconfigurable,
        uniformFloatPrefix + 'spotLightPenumbraAngleCosine[SPOT_LIGHT_NUMBER]' + unconfigurable,
        uniformFloatPrefix + 'spotLightFalloffFactor[SPOT_LIGHT_NUMBER]' + unconfigurable,
        uniformVec3Prefix + 'spotLightColor[SPOT_LIGHT_NUMBER]' + unconfigurable,
        exportEnd
    ].join('\n');
});
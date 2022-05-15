import { createShaderMixin, createShaderFunction } from '../../../Shader';
import { calcAmbientSHLightFunction } from './calcAmbientSHLight.glsl';

const uniform = `uniform`;
const uniformVec3 = `${uniform} vec3`;
const uniformFloat = `${uniform} float`;
const _LIGHT_COUNT = '_LIGHT_COUNT';
const ifdef = '#ifdef';
const endif = '#endif';
const ambientCubemapLight = 'ambientCubemapLight';
const pointLight = 'pointLight';
const spotLight = 'spotLight';
const ambientSHLight = 'ambientSHLight';
const directionalLight = 'directionalLight';

export const directionalLightHeader = createShaderFunction(`
${ifdef} DIRECTIONAL${_LIGHT_COUNT}
${uniformVec3} ${directionalLight}Direction[DIRECTIONAL${_LIGHT_COUNT}];
${uniformVec3} ${directionalLight}Color[DIRECTIONAL${_LIGHT_COUNT}];
${endif}
`);

export const ambientLightHeader = createShaderFunction(`
${ifdef} AMBIENT${_LIGHT_COUNT}
${uniformVec3} ambientLightColor[AMBIENT${_LIGHT_COUNT}];
${endif}
`);

export const ambientSHLightHeader = createShaderFunction(`
${ifdef} AMBIENT_SH${_LIGHT_COUNT}
${uniformVec3} ${ambientSHLight}Color[AMBIENT_SH${_LIGHT_COUNT}];
${uniformVec3} ${ambientSHLight}Coefficients[AMBIENT_SH${_LIGHT_COUNT}];
${calcAmbientSHLightFunction()}
${endif}
`);

// TODO only one cubemap is necessary.
export const ambientCubemapLightHeader = createShaderFunction(`
${ifdef} AMBIENT_CUBEMAP${_LIGHT_COUNT}
${uniformVec3} ${ambientCubemapLight}Color[AMBIENT_CUBEMAP${_LIGHT_COUNT}];
${uniform} samplerCube ${ambientCubemapLight}Cubemap[AMBIENT_CUBEMAP${_LIGHT_COUNT}];
${uniform} sampler2D ${ambientCubemapLight}BRDFLookup[AMBIENT_CUBEMAP${_LIGHT_COUNT}];
${endif}
`);

export const pointLightHeader = createShaderFunction(`
${ifdef} POINT${_LIGHT_COUNT}
${uniformVec3} ${pointLight}Position[POINT${_LIGHT_COUNT}];
${uniformFloat} ${pointLight}Range[POINT${_LIGHT_COUNT}];
${uniformVec3} ${pointLight}Color[POINT${_LIGHT_COUNT}];
${endif}
`);

export const spotLightHeader = createShaderFunction(`
${ifdef} SPOT${_LIGHT_COUNT}
${uniformVec3} ${spotLight}Position[SPOT${_LIGHT_COUNT}];
${uniformVec3} ${spotLight}Direction[SPOT${_LIGHT_COUNT}];
${uniformFloat} ${spotLight}Range[SPOT${_LIGHT_COUNT}];
${uniformFloat} ${spotLight}UmbraAngleCosine[SPOT${_LIGHT_COUNT}];
${uniformFloat} ${spotLight}PenumbraAngleCosine[SPOT${_LIGHT_COUNT}];
${uniformFloat} ${spotLight}FalloffFactor[SPOT${_LIGHT_COUNT}];
${uniformVec3} ${spotLight}Color[SPOT${_LIGHT_COUNT}];
${endif}
`);

export const lightHeaderMixin = createShaderMixin({
  functions: [
    ambientLightHeader,
    ambientSHLightHeader,
    pointLightHeader,
    directionalLightHeader,
    spotLightHeader
  ]
});

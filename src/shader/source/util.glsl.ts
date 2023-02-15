import {
  createShaderMixin,
  glsl,
  createVarying as varying,
  createUniform as uniform,
  createArrayUniform as arrayUniform,
  createAttribute as attribute,
  createShaderFunction,
  FUNCTION_NAME_PLACEHOLDER
} from '../../Shader';

// // http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
// float rand(vec2 co){
//     return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
// }
// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/

/**
 * Random in GLSL
 */
export const randomFunction = createShaderFunction(
  glsl`
highp float ${FUNCTION_NAME_PLACEHOLDER}(vec2 uv) {
  const highp float a = 12.9898, b = 78.233, c = 43758.5453;
  highp float dt = dot(uv.xy, vec2(a,b)), sn = mod(dt, 3.141592653589793);
  return fract(sin(sn) * c);
}`,
  'rand'
);

/**
 * Random in GLSL
 */
export const rotateVec2Function = createShaderFunction(
  glsl`
vec2 rotateVec2(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  mat2 m = mat2(c, -s, s, c);
  return m * v;
}`,
  'rotateVec2'
);

/**
 * Calculate light attenuation
 */
const lightAttenuationFunction = createShaderFunction(
  // Use light attenuation formula in
  // http://blog.slindev.com/2011/01/10/natural-light-attenuation/
  glsl`
float ${FUNCTION_NAME_PLACEHOLDER}(float dist, float range) {
  float attenuation = 1.0;
  attenuation = dist*dist/(range*range+1.0);
  float att_s = attenuationFactor;
  attenuation = 1.0/(attenuation*att_s+1.0);
  att_s = 1.0/(att_s+1.0);
  attenuation = attenuation - att_s;
  attenuation /= 1.0 - att_s;
  return clamp(attenuation, 0.0, 1.0);
}`,
  'lightAttenuation'
);

export const lightAttenuationMixin = createShaderMixin({
  uniforms: {
    attenuationFactor: uniform('float', 5.0)
  },
  functions: [lightAttenuationFunction]
});

//http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
/**
 * Edge factor for wireframe implemented with barycentric coord
 */
export const edgeFactorFunction = createShaderFunction(
  glsl`
float ${FUNCTION_NAME_PLACEHOLDER}(float width) {
  vec3 d = fwidth(v_Barycentric);
  vec3 a3 = smoothstep(vec3(0.0), d * width, v_Barycentric);
  return min(min(a3.x, a3.y), a3.z);
}
`,
  'edgeFactor'
);

export const wireframeMixin = createShaderMixin({
  functions: [edgeFactorFunction]
});

/**
 * Encode float value into rgba ubyte value.
 */
export const encodeFloatFunction = createShaderFunction(
  // !!!! Float value can only be [0.0 - 1.0)
  glsl`
vec4 ${FUNCTION_NAME_PLACEHOLDER}(const in float depth) {
  const vec4 bitShifts = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
  const vec4 bit_mask = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
  vec4 res = fract(depth * bitShifts);
  res -= res.xxyz * bit_mask;

  return res;
}`,
  'encodeFloat'
);

/**
 * Decode rgba ubyte value into float value.
 */
export const decodeFloatFunction = createShaderFunction(
  glsl`
float ${FUNCTION_NAME_PLACEHOLDER}(const in vec4 color) {
  const vec4 bitShifts = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
  return dot(color, bitShifts);
}`,
  'decodeFloat'
);

export const floatEncoderMixin = createShaderMixin({
  functions: [encodeFloatFunction, decodeFloatFunction]
});

/**
 * Decode RGBM to HDR
 * @see http://graphicrants.blogspot.com/2009/04/rgbm-color-encoding.html
 */
export const decodeRGBMFunction = createShaderFunction(
  glsl`
vec3 ${FUNCTION_NAME_PLACEHOLDER}(vec4 rgbm, float range) {
  return range * rgbm.rgb * rgbm.a;
}`,
  'decodeRGBM'
);

/**
 * Encode HDR to RGBM
 */
export const encodeRGBMFunction = createShaderFunction(
  glsl`
vec4 ${FUNCTION_NAME_PLACEHOLDER}(vec3 color, float range) {
  if (dot(color, color) == 0.0) {
    return vec4(0.0);
  }
  vec4 rgbm;
  color /= range;
  rgbm.a = clamp(max(max(color.r, color.g), max(color.b, 1e-6)), 0.0, 1.0);
  rgbm.a = ceil(rgbm.a * 255.0) / 255.0;
  rgbm.rgb = color / rgbm.a;
  return rgbm;
}`,
  'encodeRGBM'
);

/**
 * ecode RGBM to HDR if enabled.
 */
export const decodeHDRFunction = createShaderFunction(
  glsl`
vec4 ${FUNCTION_NAME_PLACEHOLDER}(vec4 color) {
#if defined(RGBM_DECODE) || defined(RGBM)
  return vec4(decodeRGBM(color, 8.12), 1.0);
#else
  return color;
#endif
}`,
  'decodeHDR'
);

/**
 * Decode HDR to RGBM if enabled.
 */
export const encodeHDRFunction = createShaderFunction(
  glsl`
vec4 ${FUNCTION_NAME_PLACEHOLDER}(vec4 color) {
#if defined(RGBM_ENCODE) || defined(RGBM)
  return encodeRGBM(color.xyz, 8.12);
#else
  return color;
#endif
}`,
  'encodeHDR'
);

/**
 * Mixin for RGBM encode and decode.
 */
export const HDREncoderMixin = createShaderMixin({
  functions: [encodeRGBMFunction, decodeRGBMFunction, encodeHDRFunction, decodeHDRFunction]
});

/**
 * sRGB helpers. Convert sRGB to Linear and Linear to sRGB
 */
export const sRGBToLinearFunction = createShaderFunction(
  glsl`
vec4 ${FUNCTION_NAME_PLACEHOLDER}(in vec4 value) {
  return vec4(mix(pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);
}`,
  'sRGBToLinear'
);
export const linearToSRGBFunction = createShaderFunction(
  glsl`
vec4 ${FUNCTION_NAME_PLACEHOLDER}(in vec4 value) {
  return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.w);
}`,
  'linearTosRGB'
);

export const sRGBMixin = createShaderMixin({
  functions: [sRGBToLinearFunction, linearToSRGBFunction]
});

/**
 * Skinning helpers.
 */
export const skinningMixin = createShaderMixin({
  attributes: {
    weight: attribute('vec3', 'WEIGHT'),
    joint: attribute('vec4', 'JOINT')
  },
  uniforms: {
    skinMatrix: arrayUniform('mat4', 'JOINT_COUNT')
  },
  functions: [
    createShaderFunction(glsl`
#ifdef SKINNING
uniform sampler2D skinMatricesTexture;
uniform float skinMatricesTextureSize;

#ifdef USE_SKIN_MATRICES_TEXTURE
mat4 getSkinMatrix(sampler2D tex, float idx) {
  float j = idx * 4.0;
  float x = mod(j, skinMatricesTextureSize);
  float y = floor(j / skinMatricesTextureSize) + 0.5;
  vec2 scale = vec2(skinMatricesTextureSize);
  return mat4(
    texture(tex, vec2(x + 0.5, y) / scale),
    texture(tex, vec2(x + 1.5, y) / scale),
    texture(tex, vec2(x + 2.5, y) / scale),
    texture(tex, vec2(x + 3.5, y) / scale)
  );
}
mat4 getSkinMatrix(float idx) {
  return getSkinMatrix(skinMatricesTexture, idx);
}
#else
mat4 getSkinMatrix(float idx) {
  return skinMatrix[int(idx)];
}
#endif
#endif`)
  ],
  // Add uniform in code to be not configurable

  // Weighted Sum Skinning Matrix
  // PENDING Must be assigned.
  main: glsl`
mat4 skinMatrixWS = getSkinMatrix(joint.x) * weight.x;
if (weight.y > 1e-4) {
  skinMatrixWS += getSkinMatrix(joint.y) * weight.y;
}
if (weight.z > 1e-4) {
  skinMatrixWS += getSkinMatrix(joint.z) * weight.z;
}
float weightW = 1.0-weight.x-weight.y-weight.z;
if (weightW > 1e-4) {
  skinMatrixWS += getSkinMatrix(joint.w) * weightW;
}`
});

export const instancingMixin = createShaderMixin({
  attributes: {
    instanceMat1: attribute('vec4'),
    instanceMat2: attribute('vec4'),
    instanceMat3: attribute('vec4')
  },
  main: glsl`
mat4 instanceMat = mat4(
  vec4(instanceMat1.xyz, 0.0),
  vec4(instanceMat2.xyz, 0.0),
  vec4(instanceMat3.xyz, 0.0),
  vec4(instanceMat1.w, instanceMat2.w, instanceMat3.w, 1.0)
);`
});

/**
 * Parallax corrected cubemap
 * @see https://seblagarde.wordpress.com/2012/09/29/image-based-lighting-approaches-and-parallax-corrected-cubemap/
 */
export const parallaxCorrectFunction = createShaderFunction(
  glsl`
vec3 ${FUNCTION_NAME_PLACEHOLDER}(in vec3 dir, in vec3 pos, in vec3 boxMin, in vec3 boxMax) {
  // Find ray box intersect point using slab method
  // https://tavianator.com/fast-branchless-raybounding-box-intersections/
  vec3 first = (boxMax - pos) / dir;
  vec3 second = (boxMin - pos) / dir;

  vec3 further = max(first, second);
  float dist = min(further.x, min(further.y, further.z));

  vec3 fixedPos = pos + dir * dist;
  vec3 boxCenter = (boxMax + boxMin) * 0.5;

  return normalize(fixedPos - boxCenter);
}`,
  'parallaxCorrect'
);

/**
 * Clampped to edge when sampling.
 * In stereo rendering. It will clampped to each part of screen.
 */
export const clampSampleFunction = createShaderFunction(
  glsl`
// Sample with stereo clamp
vec4 ${FUNCTION_NAME_PLACEHOLDER}(const in sampler2D tex, const in vec2 coord)
{
#ifdef STEREO
  // Left is 0.0 - 0.5, Right is 0.5 - 1.0, avoid leaking
  // FIXME fetch with linear filtering will still have leak!
  float eye = step(0.5, coord.x) * 0.5;
  vec2 coordClamped = clamp(coord, vec2(eye, 0.0), vec2(0.5 + eye, 1.0));
#else
  vec2 coordClamped = clamp(coord, vec2(0.0), vec2(1.0));
#endif
  return texture(tex, coordClamped);
}`,
  'clampSample'
);

/**
 * ACES tonemapping
 */
export const ACESToneMappingFunction = createShaderFunction(
  glsl`
vec3 ${FUNCTION_NAME_PLACEHOLDER}(vec3 color) {
    float A = 2.51;
    float B = 0.03;
    float C = 2.43;
    float D = 0.59;
    float E = 0.14;
    return (color * (A * color + B)) / (color * (C * color + D) + E);
}`,
  'ACESToneMapping'
);

/**
 * Log depth helper in vertex shader
 */
export const logDepthVertexMixin = createShaderMixin({
  varyings: {
    v_FragDepth: varying('float')
  },
  uniforms: {
    logDepthBufFC: uniform('float', 0, 'LOG_DEPTH_BUFFER_FC')
  },
  main: glsl`
#ifdef LOG_DEPTH
#ifdef SUPPORT_FRAG_DEPTH
    v_FragDepth = 1.0 + gl_Position.w;
#else
    gl_Position.z = log2(max(1e-6, gl_Position.w + 1.0)) * logDepthBufFC - 1.0;
    gl_Position.z *= gl_Position.w;
#endif
#endif`
});

/**
 * Log depth helper in fragment shader
 */
export const logDepthFragmentMixin = createShaderMixin({
  uniforms: {
    logDepthBufFC: uniform('float', 0, 'LOG_DEPTH_BUFFER_FC')
  },
  main: glsl`
#if defined(LOG_DEPTH) && defined(SUPPORT_FRAG_DEPTH)
  gl_FragDepth = log2(v_FragDepth) * logDepthBufFC * 0.5;
#endif
`
});

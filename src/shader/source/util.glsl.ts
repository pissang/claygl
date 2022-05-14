import {
  createShaderChunk,
  glsl,
  createUniform,
  createAttribute,
  createArrayUniform,
  createVarying
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
export const random = createShaderChunk(
  glsl`
highp float rand(vec2 uv) {
  const highp float a = 12.9898, b = 78.233, c = 43758.5453;
  highp float dt = dot(uv.xy, vec2(a,b)), sn = mod(dt, 3.141592653589793);
  return fract(sin(sn) * c);
}`
);

/**
 * Calculate light attenuation
 */
export const calculateLightAttenuation = createShaderChunk({
  uniforms: {
    attenuationFactor: createUniform('float', 5.0)
  },
  // Use light attenuation formula in
  // http://blog.slindev.com/2011/01/10/natural-light-attenuation/
  code: glsl`
float lightAttenuation(float dist, float range) {
  float attenuation = 1.0;
  attenuation = dist*dist/(range*range+1.0);
  float att_s = attenuationFactor;
  attenuation = 1.0/(attenuation*att_s+1.0);
  att_s = 1.0/(att_s+1.0);
  attenuation = attenuation - att_s;
  attenuation /= 1.0 - att_s;
  return clamp(attenuation, 0.0, 1.0);
}`
});

//http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
/**
 * Edge factor for wireframe implemented with barycentric coord
 */
export const edgeFactor = createShaderChunk(
  glsl`
#ifdef SUPPORT_STANDARD_DERIVATIVES
float edgeFactor(float width) {
  vec3 d = fwidth(v_Barycentric);
  vec3 a3 = smoothstep(vec3(0.0), d * width, v_Barycentric);
  return min(min(a3.x, a3.y), a3.z);
}
#else
float edgeFactor(float width) {
  return 1.0;
}
#endif`
);

/**
 * Encode float value into rgba ubyte value.
 */
export const encodeFloat = createShaderChunk(
  // !!!! Float value can only be [0.0 - 1.0)
  glsl`
vec4 encodeFloat(const in float depth) {
  const vec4 bitShifts = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
  const vec4 bit_mask = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
  vec4 res = fract(depth * bitShifts);
  res -= res.xxyz * bit_mask;

  return res;
}`
);

/**
 * Decode rgba ubyte value into float value.
 */
export const decodeFloat = createShaderChunk(
  glsl`
float decodeFloat(const in vec4 color) {
  const vec4 bitShifts = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
  return dot(color, bitShifts);
}`
);
/**
 * float helper
 * Inlcude encodeFloat and decodeFloat
 */
export const float = createShaderChunk(`
${encodeFloat.code}
${decodeFloat.code}`);

/**
 * Decode RGBM to HDR
 * @see http://graphicrants.blogspot.com/2009/04/rgbm-color-encoding.html
 */
export const decodeRGBM = createShaderChunk(
  glsl`
vec3 RGBMDecode(vec4 rgbm, float range) {
  return range * rgbm.rgb * rgbm.a;
}`
);

/**
 * Encode HDR to RGBM
 */
export const encodeRGBM = createShaderChunk(
  glsl`
vec4 RGBMEncode(vec3 color, float range) {
  if (dot(color, color) == 0.0) {
    return vec4(0.0);
  }
  vec4 rgbm;
  color /= range;
  rgbm.a = clamp(max(max(color.r, color.g), max(color.b, 1e-6)), 0.0, 1.0);
  rgbm.a = ceil(rgbm.a * 255.0) / 255.0;
  rgbm.rgb = color / rgbm.a;
  return rgbm;
}`
);

/**
 * RGBM Helpers. Include encode and decode.
 */
export const RGBM = createShaderChunk(`
${encodeRGBM.code}
${decodeRGBM.code}`);

/**
 * Decode RGBM to HDR if enabled.
 */
export const decodeHDR = createShaderChunk(
  glsl`
vec4 decodeHDR(vec4 color) {
#if defined(RGBM_DECODE) || defined(RGBM)
  return vec4(decodeRGBM(color, 8.12), 1.0);
#else
  return color;
#endif
}`
);

/**
 * Decode HDR to RGBM if enabled.
 */
export const encodeHDR = createShaderChunk(
  glsl`
vec4 encodeHDR(vec4 color) {
#if defined(RGBM_ENCODE) || defined(RGBM)
  return encodeRGBM(color.xyz, 8.12);
#else
  return color;
#endif
}`
);

/**
 * sRGB helpers. Convert sRGB to Linear and Linear to sRGB
 */
export const sRGB = createShaderChunk(
  glsl`
vec4 sRGBToLinear(in vec4 value) {
  return vec4(mix(pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);
}
vec4 linearTosRGB(in vec4 value) {
  return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.w);
}`
);

/**
 * Skinning helpers.
 */
export const skinning = createShaderChunk({
  attributes: {
    weight: createAttribute('vec3', 'WEIGHT'),
    joint: createAttribute('vec4', 'JOINT')
  },
  uniforms: {
    skinMatrix: createArrayUniform('mat4', 'JOINT_COUNT')
  },
  code: {
    // Add uniform in code to be not configurable
    header: glsl`
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
    texture2D(tex, vec2(x + 0.5, y) / scale),
    texture2D(tex, vec2(x + 1.5, y) / scale),
    texture2D(tex, vec2(x + 2.5, y) / scale),
    texture2D(tex, vec2(x + 3.5, y) / scale)
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
#endif`,

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
  }
});

export const instancing = createShaderChunk({
  attributes: {
    instanceMat1: createAttribute('vec4'),
    instanceMat2: createAttribute('vec4'),
    instanceMat3: createAttribute('vec4')
  },
  code: glsl`
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
export const parallaxCorrect = createShaderChunk(
  glsl`
vec3 parallaxCorrect(in vec3 dir, in vec3 pos, in vec3 boxMin, in vec3 boxMax) {
  // Find ray box intersect point using slab method
  // https://tavianator.com/fast-branchless-raybounding-box-intersections/
  vec3 first = (boxMax - pos) / dir;
  vec3 second = (boxMin - pos) / dir;

  vec3 further = max(first, second);
  float dist = min(further.x, min(further.y, further.z));

  vec3 fixedPos = pos + dir * dist;
  vec3 boxCenter = (boxMax + boxMin) * 0.5;

  return normalize(fixedPos - boxCenter);
}`
);

/**
 * Clampped to edge when sampling.
 * In stereo rendering. It will clampped to each part of screen.
 */
export const clampSample = createShaderChunk(
  glsl`
// Sample with stereo clamp
vec4 clampSample(const in sampler2D texture, const in vec2 coord)
{
#ifdef STEREO
  // Left is 0.0 - 0.5, Right is 0.5 - 1.0, avoid leaking
  // FIXME fetch with linear filtering will still have leak!
  float eye = step(0.5, coord.x) * 0.5;
  vec2 coordClamped = clamp(coord, vec2(eye, 0.0), vec2(0.5 + eye, 1.0));
#else
  vec2 coordClamped = clamp(coord, vec2(0.0), vec2(1.0));
#endif
  return texture2D(texture, coordClamped);
}`
);

/**
 * ACES tonemapping
 */
export const ACESToneMapping = createShaderChunk(
  glsl`
vec3 ACESToneMapping(vec3 color) {
    float A = 2.51;
    float B = 0.03;
    float C = 2.43;
    float D = 0.59;
    float E = 0.14;
    return (color * (A * color + B)) / (color * (C * color + D) + E);
}`
);

/**
 * Log depth helper in vertex shader
 */
export const logDepthVertex = createShaderChunk({
  varyings: {
    v_FragDepth: createVarying('float')
  },
  uniforms: {
    logDepthBufFC: createUniform('float', 0, 'LOG_DEPTH_BUFFER_FC')
  },
  code: glsl`
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
export const logDepthFragment = createShaderChunk({
  uniforms: {
    logDepthBufFC: createUniform('float', 0, 'LOG_DEPTH_BUFFER_FC')
  },
  code: glsl`
#if defined(LOG_DEPTH) && defined(SUPPORT_FRAG_DEPTH)
  gl_FragDepthEXT = log2(v_FragDepth) * logDepthBufFC * 0.5;
#endif
`
});

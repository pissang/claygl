import {
  createUniform as uniform,
  glsl,
  VertexShader,
  createVarying as varying,
  FragmentShader,
  createShaderFunction,
  createShaderMixin,
  createArrayUniform
} from '../../Shader';
import { POSITION, TEXCOORD_0, WORLD, WORLDVIEWPROJECTION } from './shared';
import {
  decodeFloatFunction,
  floatEncoderMixin,
  instancingMixin,
  skinningMixin
} from './util.glsl';

export const shadowMapDepthVertex = new VertexShader({
  name: 'shadowDepthVertex',
  uniforms: {
    worldViewProjection: WORLDVIEWPROJECTION(),
    uvRepeat: uniform('vec2', [1, 1]),
    uvOffset: uniform('vec2', [0, 0])
  },
  attributes: {
    position: POSITION(),
    texcoord: TEXCOORD_0()
  },
  varyings: {
    v_ViewPosition: varying('vec4'),
    v_Texcoord: varying('vec2')
  },
  includes: [skinningMixin, instancingMixin],

  main: glsl`
void main(){
  vec4 P = vec4(position, 1.0);
#ifdef SKINNING
  ${skinningMixin.main}
  P = skinMatrixWS * P;
#endif

#ifdef INSTANCING
  ${instancingMixin.main}
  P = instanceMat * P;
#endif

  v_ViewPosition = worldViewProjection * P;
  gl_Position = v_ViewPosition;

  v_Texcoord = texcoord * uvRepeat + uvOffset;
}`
});

export const shadowMapDepthFragment = new FragmentShader({
  name: 'shadowDepthFrag',
  uniforms: {
    bias: uniform('float', 0.001),
    slopeScale: uniform('float', 1.0),
    alphaCutoff: uniform('float', 0.0),
    alphaMap: uniform('sampler2D')
  },
  includes: [floatEncoderMixin],
  main: glsl`

void main(){
  // Whats the difference between gl_FragCoord.z and this v_ViewPosition
  // gl_FragCoord consider the polygon offset ?
  float depth = v_ViewPosition.z / v_ViewPosition.w;
  // float depth = gl_FragCoord.z / gl_FragCoord.w;

  if (alphaCutoff > 0.0) {
    if (texture2D(alphaMap, v_Texcoord).a <= alphaCutoff) {
      discard;
    }
  }
  // Add slope scaled bias using partial derivative
  #ifdef SUPPORT_STANDARD_DERIVATIVES
  float dx = dFdx(depth);
  float dy = dFdy(depth);
  depth += sqrt(dx*dx + dy*dy) * slopeScale + bias;
  #else
  depth += bias;
  #endif

  gl_FragColor = encodeFloat(depth * 0.5 + 0.5);
}`
});

export const shadowMapDepthDebugFragment = new FragmentShader({
  name: 'shadowDepthDebugFrag',
  uniforms: {
    depthMap: uniform('sampler2D')
  },
  includes: [floatEncoderMixin],
  main: glsl`
void main() {
    vec4 tex = texture2D(depthMap, v_Texcoord);
#ifdef USE_VSM
    gl_FragColor = vec4(tex.rgb, 1.0);
#else
    float depth = decodeFloat(tex);
    gl_FragColor = vec4(depth, depth, depth, 1.0);
#endif
}`
});

export const shadowMapDistanceVertex = new VertexShader({
  name: 'shadowDistVertex',
  uniforms: {
    worldViewProjection: WORLDVIEWPROJECTION(),
    world: WORLD()
  },
  attributes: {
    position: POSITION()
  },
  varyings: {
    v_WorldPosition: varying('vec3')
  },
  includes: [skinningMixin],
  main: glsl`
void main (){
  vec4 P = vec4(position, 1.0);
#ifdef SKINNING
  ${skinningMixin.main}
  P = skinMatrixWS * P;
#endif

#ifdef INSTANCING
  ${instancingMixin.main}
  P = instanceMat * P;
#endif
  gl_Position = worldViewProjection * P;
  v_WorldPosition = (world * P).xyz;
}`
});

export const shadowMapDistanceFragment = new FragmentShader({
  name: 'shadowDistFrag',
  uniforms: {
    lightPosition: uniform('vec3'),
    range: uniform('float', 100)
  },
  includes: [floatEncoderMixin],
  main: glsl`
void main(){
    float dist = distance(lightPosition, v_WorldPosition);
    dist = dist / range;
    gl_FragColor = encodeFloat(dist);
}`
});

// TODO reduce shadow glsl code size.
export const shadowMapFunction = createShaderFunction(glsl`
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT) || defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT) || defined(POINT_LIGHT_SHADOWMAP_COUNT)

#ifdef SPOT_LIGHT_SHADOWMAP_COUNT
uniform sampler2D spotLightShadowMaps[SPOT_LIGHT_SHADOWMAP_COUNT];
uniform mat4 spotLightMatrices[SPOT_LIGHT_SHADOWMAP_COUNT];
uniform float spotLightShadowMapSizes[SPOT_LIGHT_SHADOWMAP_COUNT];
#endif

#ifdef DIRECTIONAL_LIGHT_SHADOWMAP_COUNT
#if defined(SHADOW_CASCADE)
uniform sampler2D directionalLightShadowMaps[1];
uniform mat4 directionalLightMatrices[SHADOW_CASCADE];
uniform float directionalLightShadowMapSizes[1];
uniform float shadowCascadeClipsNear[SHADOW_CASCADE];
uniform float shadowCascadeClipsFar[SHADOW_CASCADE];
#else
uniform sampler2D directionalLightShadowMaps[DIRECTIONAL_LIGHT_SHADOWMAP_COUNT];
uniform mat4 directionalLightMatrices[DIRECTIONAL_LIGHT_SHADOWMAP_COUNT];
uniform float directionalLightShadowMapSizes[DIRECTIONAL_LIGHT_SHADOWMAP_COUNT];
#endif
#endif

#ifdef POINT_LIGHT_SHADOWMAP_COUNT
uniform samplerCube pointLightShadowMaps[POINT_LIGHT_SHADOWMAP_COUNT];
#endif

float tapShadowMap(sampler2D map, vec2 uv, float z) {
  vec4 tex = texture2D(map, uv);
  return step(z, decodeFloat(tex) * 2.0 - 1.0);
}

float pcf(sampler2D map, vec2 uv, float z, float textureSize, vec2 scale) {

  float shadowContrib = tapShadowMap(map, uv, z);
  vec2 offset = vec2(1.0 / textureSize) * scale;
#ifdef PCF_KERNEL_SIZE
  for (int _idx_ = 0; _idx_ < PCF_KERNEL_SIZE; _idx_++) {{
      shadowContrib += tapShadowMap(map, uv + offset * pcfKernel[_idx_], z);
  }}

  return shadowContrib / float(PCF_KERNEL_SIZE + 1);
#else
  // TODO Removed in deferred pipeline
  shadowContrib += tapShadowMap(map, uv+vec2(offset.x, 0.0), z);
  shadowContrib += tapShadowMap(map, uv+vec2(offset.x, offset.y), z);
  shadowContrib += tapShadowMap(map, uv+vec2(-offset.x, offset.y), z);
  shadowContrib += tapShadowMap(map, uv+vec2(0.0, offset.y), z);
  shadowContrib += tapShadowMap(map, uv+vec2(-offset.x, 0.0), z);
  shadowContrib += tapShadowMap(map, uv+vec2(-offset.x, -offset.y), z);
  shadowContrib += tapShadowMap(map, uv+vec2(offset.x, -offset.y), z);
  shadowContrib += tapShadowMap(map, uv+vec2(0.0, -offset.y), z);

  return shadowContrib / 9.0;
#endif
}

float pcf(sampler2D map, vec2 uv, float z, float textureSize) {
  return pcf(map, uv, z, textureSize, vec2(1.0));
}

float computeShadowContrib(sampler2D map, mat4 lightVPM, vec3 position, float textureSize, vec2 scale, vec2 offset) {

  vec4 posInLightSpace = lightVPM * vec4(position, 1.0);
  posInLightSpace.xyz /= posInLightSpace.w;
  float z = posInLightSpace.z;
  // In frustum
  if(all(greaterThan(posInLightSpace.xyz, vec3(-0.99, -0.99, -1.0))) &&
      all(lessThan(posInLightSpace.xyz, vec3(0.99, 0.99, 1.0)))){
      // To texture uv
      vec2 uv = (posInLightSpace.xy+1.0) / 2.0;

      return pcf(map, uv * scale + offset, z, textureSize, scale);
  }
  return 1.0;
}

float computeShadowContrib(sampler2D map, mat4 lightVPM, vec3 position, float textureSize) {
  return computeShadowContrib(map, lightVPM, position, textureSize, vec2(1.0), vec2(0.0));
}

float computeShadowContribOmni(samplerCube map, vec3 direction, float range)
{
  float dist = length(direction);
  vec4 shadowTex = textureCube(map, direction);
  return step(dist, (decodeFloat(shadowTex) + 0.0002) * range);
}
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)

void computeShadowOfSpotLights(vec3 position, inout float shadowContribs[SPOT_LIGHT_COUNT] ) {
  float shadowContrib;
  for(int _idx_ = 0; _idx_ < SPOT_LIGHT_SHADOWMAP_COUNT; _idx_++) {{
    shadowContrib = computeShadowContrib(
      spotLightShadowMaps[_idx_], spotLightMatrices[_idx_], position,
      spotLightShadowMapSizes[_idx_]
    );
    shadowContribs[_idx_] = shadowContrib;
  }}
  // set default fallof of rest lights
  for(int _idx_ = SPOT_LIGHT_SHADOWMAP_COUNT; _idx_ < SPOT_LIGHT_COUNT; _idx_++){{
    shadowContribs[_idx_] = 1.0;
  }}
}

#endif


#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)
#ifdef SHADOW_CASCADE
void computeShadowOfDirectionalLights(vec3 position, inout float shadowContribs[DIRECTIONAL_LIGHT_COUNT]){
  // http://www.opengl.org/wiki/Compute_eye_space_from_window_space
  float depth = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far)
    / (gl_DepthRange.far - gl_DepthRange.near);

  float shadowContrib;
  // Pixels not in light box are lighted
  // TODO
  shadowContribs[0] = 1.0;

  for (int _idx_ = 0; _idx_ < SHADOW_CASCADE; _idx_++) {{
    if (
      depth >= shadowCascadeClipsNear[_idx_] &&
      depth <= shadowCascadeClipsFar[_idx_]
    ) {
      shadowContrib = computeShadowContrib(
        directionalLightShadowMaps[0], directionalLightMatrices[_idx_], position,
        directionalLightShadowMapSizes[0],
        vec2(1.0 / float(SHADOW_CASCADE), 1.0),
        vec2(float(_idx_) / float(SHADOW_CASCADE), 0.0)
      );
      // TODO Will get a sampler needs to be be uniform error in native gl
      shadowContribs[0] = shadowContrib;
    }
  }}
  // set default fallof of rest lights
  for(int _idx_ = DIRECTIONAL_LIGHT_SHADOWMAP_COUNT; _idx_ < DIRECTIONAL_LIGHT_COUNT; _idx_++) {{
    shadowContribs[_idx_] = 1.0;
  }}
}
#else

void computeShadowOfDirectionalLights(vec3 position, inout float shadowContribs[DIRECTIONAL_LIGHT_COUNT]){
  float shadowContrib;

  for(int _idx_ = 0; _idx_ < DIRECTIONAL_LIGHT_SHADOWMAP_COUNT; _idx_++) {{
    shadowContrib = computeShadowContrib(
      directionalLightShadowMaps[_idx_], directionalLightMatrices[_idx_], position,
      directionalLightShadowMapSizes[_idx_]
    );
    shadowContribs[_idx_] = shadowContrib;
  }}
  // set default fallof of rest lights
  for(int _idx_ = DIRECTIONAL_LIGHT_SHADOWMAP_COUNT; _idx_ < DIRECTIONAL_LIGHT_COUNT; _idx_++) {{
    shadowContribs[_idx_] = 1.0;
  }}
}
#endif
#endif


#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
void computeShadowOfPointLights(vec3 position, inout float shadowContribs[POINT_LIGHT_COUNT] ){
  vec3 lightPosition;
  vec3 direction;
  for(int _idx_ = 0; _idx_ < POINT_LIGHT_SHADOWMAP_COUNT; _idx_++) {{
    lightPosition = pointLightPosition[_idx_];
    direction = position - lightPosition;
    shadowContribs[_idx_] = computeShadowContribOmni(pointLightShadowMaps[_idx_], direction, pointLightRange[_idx_]);
  }}
  for(int _idx_ = POINT_LIGHT_SHADOWMAP_COUNT; _idx_ < POINT_LIGHT_COUNT; _idx_++) {{
    shadowContribs[_idx_] = 1.0;
  }}
}
#endif
#endif
`);

export const shadowMapMixin = createShaderMixin({
  uniforms: {
    shadowEnabled: uniform('bool', 1),
    pcfKernel: createArrayUniform('vec2', 'PCF_KERNEL_SIZE')
  },
  functions: [decodeFloatFunction, shadowMapFunction]
});

import {
  VertexShader,
  createUniform as uniform,
  createAttribute as attribute,
  createVarying as varying,
  glsl,
  FragmentShader,
  createSemanticUniform
} from '../../Shader';
import { lightHeader } from './header/light.glsl';
import {
  sharedLambertFragmentUniforms,
  sharedLambertVaryings,
  sharedLambertVertexAttributes,
  sharedLambertVertexUniforms
} from './lambert.glsl';
import { shadowMap } from './shadowmap.glsl';
import { VIEWINVERSE } from './shared';
import {
  ACESToneMappingFunction,
  decodeHDRFunction,
  encodeHDRFunction,
  edgeFactorFunction,
  instancing,
  linearToSRGBFunction,
  logDepthFragment,
  logDepthVertex,
  parallaxCorrectFunction,
  skinning,
  sRGBToLinearFunction
} from './util.glsl';

export const standardVertex = new VertexShader({
  uniforms: {
    ...sharedLambertVertexUniforms
  },
  attributes: {
    ...sharedLambertVertexAttributes,
    texcoord2: attribute('vec2', 'TEXCOORD_1'),
    tangent: attribute('vec4', 'TANGENT')
  },
  varyings: {
    ...sharedLambertVaryings,
    v_Tangent: varying('vec3'),
    v_Bitangent: varying('vec3'),
    v_Texcoord2: varying('vec2'),
    v_Color: varying('vec4')
  },
  includes: [lightHeader, skinning, instancing, logDepthVertex],

  main: glsl`
void main() {
  vec4 skinnedPosition = vec4(position, 1.0);
  vec4 skinnedNormal = vec4(normal, 0);
  vec4 skinnedTangent = vec4(tangent.xyz, 0);
#ifdef SKINNING

  ${skinning.main}

  skinnedPosition = skinMatrixWS * skinnedPosition;
  // Upper 3x3 of skinMatrix is orthogonal
  skinnedNormal = skinMatrixWS * skinnedNormal;
  skinnedTangent = skinMatrixWS * skinnedTangent;
#endif

#ifdef INSTANCING
  ${instancing.main}

  skinnedPosition = instanceMat * skinnedPosition;
  skinnedNormal = instanceMat * skinnedNormal;
  skinnedTangent = instanceMat * skinnedTangent;
#endif

  gl_Position = worldViewProjection * skinnedPosition;

  v_Texcoord = texcoord * uvRepeat + uvOffset;
  v_WorldPosition = (world * skinnedPosition).xyz;
  v_Barycentric = barycentric;

  v_Normal = normalize((worldInverseTranspose * skinnedNormal).xyz);

#if defined(PARALLAXOCCLUSIONMAP_ENABLED) || defined(NORMALMAP_ENABLED)
  v_Tangent = normalize((worldInverseTranspose * skinnedTangent).xyz);
  v_Bitangent = normalize(cross(v_Normal, v_Tangent) * tangent.w);
#endif

#ifdef VERTEX_COLOR
  v_Color = a_Color;
#endif

#if defined(AOMAP_ENABLED)
  v_Texcoord2 = texcoord2;
#endif

  ${logDepthVertex.main}
}`
});

export const standardFragment = new FragmentShader({
  defines: {
    PI: Math.PI,
    GLOSSINESS_CHANNEL: 0,
    ROUGHNESS_CHANNEL: 0,
    METALNESS_CHANNEL: 1,
    SPECULAR_WORKFLOW: null,
    DIFFUSEMAP_ALPHA_ALPHA: null
  },
  uniforms: {
    viewInverse: VIEWINVERSE(),
    ...sharedLambertFragmentUniforms,
    occlusionMap: uniform('sampler2D'),
    environmentMap: uniform('samplerCube'),
    environmentBoxMin: uniform('vec3'),
    environmentBoxMax: uniform('vec3'),
    brdfLookup: uniform('sampler2D'),
    emissiveMap: uniform('sampler2D'),
    ssaoMap: uniform('sampler2D'),
    viewport: createSemanticUniform('vec4', 'VIEWPORT'),
    aoMap: uniform('sampler2D'),
    aoIntensity: uniform('float'),

    // metalness workflow
    metalness: uniform('float', 0),
    metalnessMap: uniform('sampler2D'),
    roughness: uniform('float', 0.5),
    roughnessMap: uniform('sampler2D'),

    // specular workflow
    specularColor: uniform('vec3', [0.1, 0.1, 0.1]),
    specularMap: uniform('sampler2D'),
    glossiness: uniform('float', 0.5),
    glossinessMap: uniform('sampler2D'),

    emission: uniform('vec3', [0, 0, 0]),
    emissionIntensity: uniform('float', 1),
    lineWidth: uniform('float', 0),
    lineColor: uniform('vec4', [0, 0, 0, 0.6]),
    maxMipmapLevel: uniform('float', 5),

    // Parallax occlusion map
    parallaxOcclusionScale: uniform('float', 0.02),
    parallaxMaxLayers: uniform('float', 20),
    parallaxMinLayers: uniform('float', 5),
    parallaxOcclusionMap: uniform('sampler2D')
  },
  includes: [lightHeader, logDepthFragment, shadowMap],

  main: glsl`
${ACESToneMappingFunction()}
${edgeFactorFunction()}
${decodeHDRFunction()}
${encodeHDRFunction()}
${sRGBToLinearFunction()}
${linearToSRGBFunction()}
${parallaxCorrectFunction()}

float G_Smith(float g, float ndv, float ndl)
{
  // float k = (roughness+1.0) * (roughness+1.0) * 0.125;
  float roughness = 1.0 - g;
  float k = roughness * roughness / 2.0;
  float G1V = ndv / (ndv * (1.0 - k) + k);
  float G1L = ndl / (ndl * (1.0 - k) + k);
  return G1L * G1V;
}
// Fresnel
vec3 F_Schlick(float ndv, vec3 spec) {
  return spec + (1.0 - spec) * pow(1.0 - ndv, 5.0);
}

float D_Phong(float g, float ndh) {
  // from black ops 2
  float a = pow(8192.0, g);
  return (a + 2.0) / 8.0 * pow(ndh, a);
}

float D_GGX(float g, float ndh) {
  float r = 1.0 - g;
  float a = r * r;
  float tmp = ndh * ndh * (a - 1.0) + 1.0;
  return a / (PI * tmp * tmp);
}

mat3 transpose(in mat3 inMat)
{
  vec3 i0 = inMat[0];
  vec3 i1 = inMat[1];
  vec3 i2 = inMat[2];

  return mat3(
    vec3(i0.x, i1.x, i2.x),
    vec3(i0.y, i1.y, i2.y),
    vec3(i0.z, i1.z, i2.z)
  );
}
// Modified from http://apoorvaj.io/exploring-bump-mapping-with-webgl.html
vec2 parallaxUv(vec2 uv, vec3 viewDir)
{
  // Determine number of layers from angle between V and N
  float numLayers = mix(parallaxMaxLayers, parallaxMinLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));
  float layerHeight = 1.0 / numLayers;
  float curLayerHeight = 0.0;
  vec2 deltaUv = viewDir.xy * parallaxOcclusionScale / (viewDir.z * numLayers);
  vec2 curUv = uv;

  float height = 1.0 - texture2D(parallaxOcclusionMap, curUv).r;

  for (int i = 0; i < 30; i++) {
    curLayerHeight += layerHeight;
    curUv -= deltaUv;
    height = 1.0 - texture2D(parallaxOcclusionMap, curUv).r;
    if (height < curLayerHeight) {
      break;
    }
  }

  // Parallax occlusion mapping
  vec2 prevUv = curUv + deltaUv;
  float next = height - curLayerHeight;
  float prev = 1.0 - texture2D(parallaxOcclusionMap, prevUv).r - curLayerHeight + layerHeight;
  return mix(curUv, prevUv, next / (next - prev));
}

void main() {

  vec4 albedoColor = vec4(color, alpha);

#ifdef VERTEX_COLOR
  albedoColor *= v_Color;
#endif

#ifdef SRGB_DECODE
  albedoColor = sRGBToLinear(albedoColor);
#endif

  vec3 eyePos = viewInverse[3].xyz;
  vec3 V = normalize(eyePos - v_WorldPosition);

  vec2 uv = v_Texcoord;

#if defined(PARALLAXOCCLUSIONMAP_ENABLED) || defined(NORMALMAP_ENABLED)
  mat3 tbn = mat3(v_Tangent, v_Bitangent, v_Normal);
#endif

#ifdef PARALLAXOCCLUSIONMAP_ENABLED
  uv = parallaxUv(v_Texcoord, normalize(transpose(tbn) * -V));
#endif
#ifdef DIFFUSEMAP_ENABLED
  vec4 texel = texture2D(diffuseMap, uv);
  #ifdef SRGB_DECODE
  texel = sRGBToLinear(texel);
  #endif
  albedoColor.rgb *= texel.rgb;
  #ifdef DIFFUSEMAP_ALPHA_ALPHA
  albedoColor.a *= texel.a;
  #endif
#endif

#ifdef SPECULAR_WORKFLOW
  vec3 spec = specularColor;
#else
  float m = metalness;

  #ifdef METALNESSMAP_ENABLED
  float m2 = texture2D(metalnessMap, uv)[METALNESS_CHANNEL];
  // Adjust the brightness
  m = clamp(m2 + (m - 0.5) * 2.0, 0.0, 1.0);
  #endif

  vec3 baseColor = albedoColor.rgb;
  albedoColor.rgb = baseColor * (1.0 - m);
  vec3 spec = mix(vec3(0.04), baseColor, m);
#endif

#ifdef SPECULAR_WORKFLOW
  float g = glossiness;
  #ifdef GLOSSINESSMAP_ENABLED
  float g2 = texture2D(glossinessMap, uv)[GLOSSINESS_CHANNEL];
  // Adjust the brightness
  g = clamp(g2 + (g - 0.5) * 2.0, 0.0, 1.0);
  #endif
#else
  float g = clamp(1.0 - roughness, 0.0, 1.0);
  #ifdef ROUGHNESSMAP_ENABLED
  float g2 = 1.0 - texture2D(roughnessMap, uv)[ROUGHNESS_CHANNEL];
  // Adjust the brightness
  g = clamp(g2 + (g - 0.5) * 2.0, 0.0, 1.0);
  #endif
#endif

#ifdef SPECULARMAP_ENABLED
  // Convert to linear space.
  spec *= sRGBToLinear(texture2D(specularMap, uv)).rgb;
#endif

  vec3 N = v_Normal;

#ifdef DOUBLE_SIDED
  if (dot(N, V) < 0.0) {
    N = -N;
  }
#endif

#ifdef NORMALMAP_ENABLED
  if (dot(v_Tangent, v_Tangent) > 0.0) {
    vec3 normalTexel = texture2D(normalMap, uv).xyz;
    if (dot(normalTexel, normalTexel) > 0.0) { // Valid normal map
      N = (normalTexel * 2.0 - 1.0);
      // Apply scalar multiplier to normal vector of texture.
      N = normalize(N * vec3(normalScale, normalScale, 1.0));
      // FIXME Why need to negate
      tbn[1] = -tbn[1];
      N = normalize(tbn * N);
    }
  }
#endif

  // Diffuse part of all lights
  vec3 diffuseTerm = vec3(0.0, 0.0, 0.0);
  // Specular part of all lights
  vec3 specularTerm = vec3(0.0, 0.0, 0.0);

  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 fresnelTerm = F_Schlick(ndv, spec);

#ifdef AMBIENT_LIGHT_COUNT
  for(int _idx_ = 0; _idx_ < AMBIENT_LIGHT_COUNT; _idx_++) {{
    diffuseTerm += ambientLightColor[_idx_];
  }}
#endif

#ifdef AMBIENT_SH_LIGHT_COUNT
  for(int _idx_ = 0; _idx_ < AMBIENT_SH_LIGHT_COUNT; _idx_++) {{
    diffuseTerm += calcAmbientSHLight(_idx_, N) * ambientSHLightColor[_idx_];
  }}
#endif

#ifdef POINT_LIGHT_COUNT
#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
  float shadowContribsPoint[POINT_LIGHT_COUNT];
  if(shadowEnabled) {
    computeShadowOfPointLights(v_WorldPosition, shadowContribsPoint);
  }
#endif
  for(int _idx_ = 0; _idx_ < POINT_LIGHT_COUNT; _idx_++) {{
    vec3 lightPosition = pointLightPosition[_idx_];
    vec3 lc = pointLightColor[_idx_];
    float range = pointLightRange[_idx_];

    vec3 L = lightPosition - v_WorldPosition;

    // Calculate point light attenuation
    float dist = length(L);
    float attenuation = lightAttenuation(dist, range);
    L /= dist;
    vec3 H = normalize(L + V);
    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);

    float shadowContrib = 1.0;
#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
    if(shadowEnabled) {
      shadowContrib = shadowContribsPoint[_idx_];
    }
#endif

    vec3 li = lc * ndl * attenuation * shadowContrib;
    diffuseTerm += li;
    specularTerm += li * fresnelTerm * D_Phong(g, ndh);
  }}
#endif

#ifdef DIRECTIONAL_LIGHT_COUNT
#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)
  float shadowContribsDir[DIRECTIONAL_LIGHT_COUNT];
  if(shadowEnabled) {
    computeShadowOfDirectionalLights(v_WorldPosition, shadowContribsDir);
  }
#endif
  for(int _idx_ = 0; _idx_ < DIRECTIONAL_LIGHT_COUNT; _idx_++) {{
    vec3 L = -normalize(directionalLightDirection[_idx_]);
    vec3 lc = directionalLightColor[_idx_];

    vec3 H = normalize(L + V);
    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);

    float shadowContrib = 1.0;
#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)
    if(shadowEnabled) {
      shadowContrib = shadowContribsDir[_idx_];
    }
#endif

    vec3 li = lc * ndl * shadowContrib;

    diffuseTerm += li;
    specularTerm += li * fresnelTerm * D_Phong(g, ndh);
  }}
#endif

#ifdef SPOT_LIGHT_COUNT
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)
  float shadowContribsSpot[SPOT_LIGHT_COUNT];
  if(shadowEnabled) {
    computeShadowOfSpotLights(v_WorldPosition, shadowContribsSpot);
  }
#endif
  for(int i = 0; i < SPOT_LIGHT_COUNT; i++) {
    vec3 lightPosition = spotLightPosition[i];
    vec3 spotLightDirection = -normalize(spotLightDirection[i]);
    vec3 lc = spotLightColor[i];
    float range = spotLightRange[i];
    float a = spotLightUmbraAngleCosine[i];
    float b = spotLightPenumbraAngleCosine[i];
    float falloffFactor = spotLightFalloffFactor[i];

    vec3 L = lightPosition - v_WorldPosition;
    // Calculate attenuation
    float dist = length(L);
    float attenuation = lightAttenuation(dist, range);

    // Normalize light direction
    L /= dist;
    // Calculate spot light fall off
    float c = dot(spotLightDirection, L);

    float falloff;
    // Fomular from real-time-rendering
    falloff = clamp((c - a) /(b - a), 0.0, 1.0);
    falloff = pow(falloff, falloffFactor);

    vec3 H = normalize(L + V);
    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);

    float shadowContrib = 1.0;
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)
    if (shadowEnabled) {
        shadowContrib = shadowContribsSpot[i];
    }
#endif

    vec3 li = lc * attenuation * (1.0 - falloff) * shadowContrib * ndl;

    diffuseTerm += li;
    specularTerm += li * fresnelTerm * D_Phong(g, ndh);
  }
#endif

  vec4 outColor = albedoColor;
  outColor.rgb *= max(diffuseTerm, vec3(0.0));

  outColor.rgb += max(specularTerm, vec3(0.0));

#ifdef AMBIENT_CUBEMAP_LIGHT_COUNT
  vec3 L = reflect(-V, N);
  float rough2 = clamp(1.0 - g, 0.0, 1.0);
  // FIXME fixed maxMipmapLevel ?
  float bias2 = rough2 * 5.0;
  // One brdf lookup is enough
  vec2 brdfParam2 = texture2D(ambientCubemapLightBRDFLookup[0], vec2(rough2, ndv)).xy;
  vec3 envWeight2 = spec * brdfParam2.x + brdfParam2.y;
  vec3 envTexel2;
  for(int _idx_ = 0; _idx_ < AMBIENT_CUBEMAP_LIGHT_COUNT; _idx_++) {{
  #ifdef SUPPORT_TEXTURE_LOD
    envTexel2 = RGBMDecode(textureCubeLodEXT(ambientCubemapLightCubemap[_idx_], L, bias2), 8.12);
  #else
    envTexel2 = RGBMDecode(textureCube(ambientCubemapLightCubemap[_idx_], L), 8.12);
  #endif
    // TODO mix ?
    outColor.rgb += ambientCubemapLightColor[_idx_] * envTexel2 * envWeight2;
  }}
#endif

#ifdef ENVIRONMENTMAP_ENABLED

  vec3 envWeight = g * fresnelTerm;
  vec3 L = reflect(-V, N);

  #ifdef PARALLAX_CORRECTED
  L = parallaxCorrect(L, v_WorldPosition, environmentBoxMin, environmentBoxMax);
#endif

  #ifdef ENVIRONMENTMAP_PREFILTER
  float rough = clamp(1.0 - g, 0.0, 1.0);
  float bias = rough * maxMipmapLevel;
  // PENDING Only env map can have HDR
    #ifdef SUPPORT_TEXTURE_LOD
  vec3 envTexel = decodeHDR(textureCubeLodEXT(environmentMap, L, bias)).rgb;
    #else
  vec3 envTexel = decodeHDR(textureCube(environmentMap, L)).rgb;
    #endif

    #ifdef BRDFLOOKUP_ENABLED
  vec2 brdfParam = texture2D(brdfLookup, vec2(rough, ndv)).xy;
  envWeight = spec * brdfParam.x + brdfParam.y;
    #endif
  #else
  vec3 envTexel = textureCube(environmentMap, L).xyz;
  #endif

  outColor.rgb += envTexel * envWeight;
#endif

  float aoFactor = 1.0;
#ifdef SSAOMAP_ENABLED
  // PENDING
  aoFactor = min(texture2D(ssaoMap, (gl_FragCoord.xy - viewport.xy) / viewport.zw).r, aoFactor);
#endif

#ifdef AOMAP_ENABLED
  aoFactor = min(1.0 - clamp((1.0 - texture2D(aoMap, v_Texcoord2).r) * aoIntensity, 0.0, 1.0), aoFactor);
#endif

#ifdef OCCLUSIONMAP_ENABLED
  // Use R channel for occlusion. Same with glTF.
  aoFactor = min(1.0 - clamp((1.0 - texture2D(occlusionMap, v_Texcoord).r), 0.0, 1.0), aoFactor);
#endif

  outColor.rgb *= aoFactor;

  vec3 lEmission = emission;
#ifdef EMISSIVEMAP_ENABLED
  lEmission *= texture2D(emissiveMap, uv).rgb;
#endif
  outColor.rgb += lEmission * emissionIntensity;

  if(lineWidth > 0.) {
    outColor.rgb = mix(outColor.rgb, lineColor.rgb, (1.0 - edgeFactor(lineWidth)) * lineColor.a);
  }

#ifdef ALPHA_TEST
  if (outColor.a < alphaCutoff) {
    discard;
  }
#endif

#ifdef TONEMAPPING
  outColor.rgb = ACESToneMapping(outColor.rgb);
#endif
#ifdef SRGB_ENCODE
  outColor = linearTosRGB(outColor);
#endif
  gl_FragColor = encodeHDR(outColor);

  ${logDepthFragment.main}
}`
});

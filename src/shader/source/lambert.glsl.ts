import {
  VertexShader,
  createUniform as uniform,
  createVarying as varying,
  glsl,
  FragmentShader
} from '../../Shader';
import { sharedBasicFragmentUniforms, sharedBasicVertexAttributes } from './basic.glsl';
import { lightHeader } from './header/light.glsl';
import { shadowMap } from './shadowmap.glsl';
import { NORMAL, WORLD, WORLDINVERSETRANSPOSE, WORLDVIEWPROJECTION } from './shared';
import {
  lightAttenuationUniforms,
  instancing,
  logDepthVertex,
  skinning,
  lightAttenuationFunction,
  edgeFactorFunction,
  logDepthFragment,
  ACESToneMappingFunction,
  encodeHDRFunction,
  decodeHDRFunction
} from './util.glsl';

export const sharedLambertVertexUniforms = {
  worldViewProjection: WORLDVIEWPROJECTION(),
  worldInverseTranspose: WORLDINVERSETRANSPOSE(),
  world: WORLD(),
  uvRepeat: uniform('vec2', [1.0, 1.0]),
  uvOffset: uniform('vec2', [0.0, 0.0])
};

export const sharedLambertVertexAttributes = {
  ...sharedBasicVertexAttributes,
  normal: NORMAL()
};

export const sharedLambertVaryings = {
  v_Texcoord: varying('vec2'),
  v_Normal: varying('vec3'),
  v_WorldPosition: varying('vec3'),
  v_Barycentric: varying('vec3')
};

export const sharedLambertFragmentUniforms = {
  ...sharedBasicFragmentUniforms
};

export const lambertVertex = new VertexShader({
  uniforms: {
    ...sharedLambertVertexUniforms,
    ...lightAttenuationUniforms
  },

  attributes: {
    ...sharedLambertVertexAttributes
  },

  varyings: {
    ...sharedLambertVaryings
  },

  includes: [skinning, instancing, logDepthVertex],

  main: glsl`
void main() {
  vec4 skinnedPosition = vec4(position, 1.0);
  vec4 skinnedNormal = vec4(normal, 0.0);

#ifdef SKINNING

  ${skinning.main}

  skinnedPosition = skinMatrixWS * skinnedPosition;
  // Upper 3x3 of skinMatrix is orthogonal
  skinnedNormal = skinMatrixWS * skinnedNormal;
#endif

#ifdef INSTANCING
  ${instancing.main}
  skinnedPosition = instanceMat * skinnedPosition;
  skinnedNormal = instanceMat * skinnedNormal;
#endif

  gl_Position = worldViewProjection * skinnedPosition;

  v_Texcoord = texcoord * uvRepeat + uvOffset;
  v_Normal = normalize((worldInverseTranspose * skinnedNormal).xyz);
  v_WorldPosition = ( world * skinnedPosition ).xyz;

  v_Barycentric = barycentric;

#ifdef VERTEX_COLOR
  v_Color = a_Color;
#endif

  ${logDepthVertex.main}
}`
});

export const lambertFragment = new FragmentShader({
  defines: {
    DIFFUSEMAP_ALPHA_ALPHA: null
  },
  uniforms: {
    ...sharedLambertFragmentUniforms
  },
  includes: [lightHeader, logDepthFragment, shadowMap],
  main: glsl`
${lightAttenuationFunction()}
${edgeFactorFunction()}
${encodeHDRFunction()}
${decodeHDRFunction()}
${ACESToneMappingFunction()}

void main() {
  gl_FragColor = vec4(color, alpha);

#ifdef VERTEX_COLOR
  gl_FragColor *= v_Color;
#endif

#ifdef SRGB_DECODE
  gl_FragColor = sRGBToLinear(gl_FragColor);
#endif

#ifdef DIFFUSEMAP_ENABLED
  vec4 tex = texture2D( diffuseMap, v_Texcoord );
#ifdef SRGB_DECODE
  tex.rgb = pow(tex.rgb, vec3(2.2));
#endif
  gl_FragColor.rgb *= tex.rgb;
#ifdef DIFFUSEMAP_ALPHA_ALPHA
  gl_FragColor.a *= tex.a;
#endif
#endif

  vec3 diffuseColor = vec3(0.0, 0.0, 0.0);

#ifdef AMBIENT_LIGHT_COUNT
  for(int _idx_ = 0; _idx_ < AMBIENT_LIGHT_COUNT; _idx_++) {
    diffuseColor += ambientLightColor[_idx_];
  }
#endif
#ifdef AMBIENT_SH_LIGHT_COUNT
  for(int _idx_ = 0; _idx_ < AMBIENT_SH_LIGHT_COUNT; _idx_++) {{
    diffuseColor += calcAmbientSHLight(_idx_, v_Normal) * ambientSHLightColor[_idx_];
  }}
#endif
// Compute point light color
#ifdef POINT_LIGHT_COUNT
#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
  float shadowContribsPoint[POINT_LIGHT_COUNT];
  if( shadowEnabled ) {
    computeShadowOfPointLights(v_WorldPosition, shadowContribsPoint);
  }
#endif
  for(int _idx_ = 0; _idx_ < POINT_LIGHT_COUNT; _idx_++) {{
    vec3 lightPosition = pointLightPosition[_idx_];
    vec3 lightColor = pointLightColor[_idx_];
    float range = pointLightRange[_idx_];

    vec3 lightDirection = lightPosition - v_WorldPosition;

    // Calculate point light attenuation
    float dist = length(lightDirection);
    float attenuation = lightAttenuation(dist, range);

    // Normalize vectors
    lightDirection /= dist;

    float ndl = dot( v_Normal, lightDirection );

    float shadowContrib = 1.0;
#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
    if( shadowEnabled )
    {
      shadowContrib = shadowContribsPoint[_idx_];
    }
#endif

    diffuseColor += lightColor * clamp(ndl, 0.0, 1.0) * attenuation * shadowContrib;
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
    vec3 lightDirection = -directionalLightDirection[_idx_];
    vec3 lightColor = directionalLightColor[_idx_];

    float ndl = dot(v_Normal, normalize(lightDirection));

    float shadowContrib = 1.0;
#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)
    if( shadowEnabled )
    {
      shadowContrib = shadowContribsDir[_idx_];
    }
#endif
    diffuseColor += lightColor * clamp(ndl, 0.0, 1.0) * shadowContrib;
  }}
#endif

#ifdef SPOT_LIGHT_COUNT
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)
  float shadowContribsSpot[SPOT_LIGHT_COUNT];
  if(shadowEnabled) {
    computeShadowOfSpotLights(v_WorldPosition, shadowContribsSpot);
  }
#endif
  for(int _idx_ = 0; _idx_ < SPOT_LIGHT_COUNT; _idx_++) {{
    vec3 lightPosition = -spotLightPosition[i];
    vec3 spotLightDirection = -normalize( spotLightDirection[i] );
    vec3 lightColor = spotLightColor[_idx_];
    float range = spotLightRange[_idx_];
    float a = spotLightUmbraAngleCosine[_idx_];
    float b = spotLightPenumbraAngleCosine[_idx_];
    float falloffFactor = spotLightFalloffFactor[_idx_];

    vec3 lightDirection = lightPosition - v_WorldPosition;
    // Calculate attenuation
    float dist = length(lightDirection);
    float attenuation = lightAttenuation(dist, range);

    // Normalize light direction
    lightDirection /= dist;
    // Calculate spot light fall off
    float c = dot(spotLightDirection, lightDirection);

    float falloff;
    falloff = clamp((c - a) /( b - a), 0.0, 1.0);
    falloff = pow(falloff, falloffFactor);

    float ndl = dot(v_Normal, lightDirection);
    ndl = clamp(ndl, 0.0, 1.0);

    float shadowContrib = 1.0;
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)
    if( shadowEnabled )
    {
      shadowContrib = shadowContribsSpot[_idx_];
    }
#endif
    diffuseColor += lightColor * ndl * attenuation * (1.0-falloff) * shadowContrib;
  }}
#endif

  gl_FragColor.rgb *= diffuseColor;
  gl_FragColor.rgb += emission;
  if(lineWidth > 0.) {
    gl_FragColor.rgb = mix(gl_FragColor.rgb, lineColor.rgb, (1.0 - edgeFactor(lineWidth)) * lineColor.a);
  }

#ifdef ALPHA_TEST
  if (gl_FragColor.a < alphaCutoff) {
    discard;
  }
#endif

#ifdef TONEMAPPING
  gl_FragColor.rgb = ACESToneMapping(gl_FragColor.rgb);
#endif
#ifdef SRGB_ENCODE
  gl_FragColor = linearTosRGB(gl_FragColor);
#endif

  gl_FragColor = encodeHDR(gl_FragColor);

  ${logDepthFragment.main}
}`
});

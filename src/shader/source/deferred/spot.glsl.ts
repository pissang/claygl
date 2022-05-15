import {
  FragmentShader,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  glsl,
  createArrayUniform as arrayUniform
} from '../../../Shader';
import { shadowMapMixin } from '../shadowmap.glsl';
import { lightAttenuationMixin } from '../util.glsl';
import { gBufferReadMixin, lightEquationFunction } from './chunk.glsl';

export const spotLightFragment = new FragmentShader({
  uniforms: {
    lightPosition: uniform('vec3'),
    lightDirection: uniform('vec3'),
    lightColor: uniform('vec3'),
    umbraAngleCosine: uniform('float'),
    penumbraAngleCosine: uniform('float'),
    lightRange: uniform('float'),
    falloffFactor: uniform('float'),
    eyePosition: uniform('vec3'),
    lightShadowMap: uniform('sampler2D'),
    lightMatrix: uniform('mat4'),
    lightShadowMapSize: uniform('float')
  },
  includes: [shadowMapMixin, gBufferReadMixin, lightAttenuationMixin],
  main: glsl`

${lightEquationFunction()}

void main() {
  ${gBufferReadMixin.main}

  vec3 L = lightPosition - position;
  vec3 V = normalize(eyePosition - position);

  float dist = length(L);
  L /= dist;

  float attenuation = lightAttenuation(dist, lightRange);
  float c = dot(-normalize(lightDirection), L);

  float falloff = clamp((c - umbraAngleCosine) / (penumbraAngleCosine - umbraAngleCosine), 0.0, 1.0);
  falloff = pow(falloff, falloffFactor);

  vec3 H = normalize(L + V);
  float ndl = clamp(dot(N, L), 0.0, 1.0);
  float ndh = clamp(dot(N, H), 0.0, 1.0);
  float ndv = clamp(dot(N, V), 0.0, 1.0);

  // Diffuse term
  gl_FragColor.rgb = (1.0 - falloff) * attenuation * lightEquation(
    lightColor, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
  );

#ifdef SHADOWMAP_ENABLED
  float shadowContrib = computeShadowContrib(
    lightShadowMap, lightMatrix, position, lightShadowMapSize
  );
  gl_FragColor.rgb *= shadowContrib;
#endif

  gl_FragColor.a = 1.0;
}`
});

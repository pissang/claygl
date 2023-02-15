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

export const deferredPointLightFragment = new FragmentShader({
  name: 'deferredPointFrag',
  uniforms: {
    lightPosition: uniform('vec3'),
    lightColor: uniform('vec3'),
    lightRange: uniform('float'),
    eyePosition: uniform('vec3'),
    lightShadowMap: uniform('samplerCube'),
    lightShadowMapSize: uniform('float')
  },
  includes: [shadowMapMixin, gBufferReadMixin, lightAttenuationMixin],
  main: glsl`

${lightEquationFunction()}

void main()
{
  ${gBufferReadMixin.main}

  vec3 L = lightPosition - position;
  vec3 V = normalize(eyePosition - position);

  float dist = length(L);
  L /= dist;

  vec3 H = normalize(L + V);

  float ndl = clamp(dot(N, L), 0.0, 1.0);
  float ndh = clamp(dot(N, H), 0.0, 1.0);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float attenuation = lightAttenuation(dist, lightRange);
  // Diffuse term
  out_color.rgb = attenuation * lightEquation(
    lightColor, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
  );

#ifdef SHADOWMAP_ENABLED
  float shadowContrib = computeShadowContribOmni(
    lightShadowMap, -L * dist, lightRange
  );
  out_color.rgb *= clamp(shadowContrib, 0.0, 1.0);
#endif

  out_color.a = 1.0;
}`
});

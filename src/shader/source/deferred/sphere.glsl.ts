import {
  FragmentShader,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  glsl,
  createArrayUniform as arrayUniform
} from '../../../Shader';
import { lightAttenuationMixin } from '../util.glsl';
import { gBufferReadMixin, lightEquationFunction } from './chunk.glsl';

export const deferredSphereLightFragment = new FragmentShader({
  name: 'deferredSphereFrag',
  uniforms: {
    lightPosition: uniform('vec3'),
    lightColor: uniform('vec3'),
    lightRange: uniform('float'),
    lightRadius: uniform('float'),
    eyePosition: uniform('vec3')
  },
  includes: [gBufferReadMixin, lightAttenuationMixin],
  main: glsl`
${lightEquationFunction()}

void main()
{
  ${gBufferReadMixin.main}
  vec3 L = lightPosition - position;

  vec3 V = normalize(eyePosition - position);

  float dist = length(L);
  // Light pos fix
  vec3 R = reflect(V, N);
  float tmp = dot(L, R);
  vec3 cToR = tmp * R - L;
  float d = length(cToR);
  L = L + cToR * clamp(lightRadius / d, 0.0, 1.0);

  L = normalize(L);

  vec3 H = normalize(L + V);

  float ndl = clamp(dot(N, L), 0.0, 1.0);
  float ndh = clamp(dot(N, H), 0.0, 1.0);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float attenuation = lightAttenuation(dist, lightRange);
  // Diffuse term
  out_color.rgb = lightColor * ndl * attenuation;

  // Specular fix
  glossiness = clamp(glossiness - lightRadius / 2.0 / dist, 0.0, 1.0);

  out_color.rgb = attenuation * lightEquation(
    lightColor, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
  );

  out_color.a = 1.0;
}`
});

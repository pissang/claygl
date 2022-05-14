import {
  FragmentShader,
  createUniform as uniform,
  createSemanticUniform as semanticUniform,
  glsl,
  createArrayUniform as arrayUniform
} from '../../../Shader';
import { shadowMap } from '../shadowmap.glsl';
import { lightAttenuation } from '../util.glsl';
import { gBufferRead, lightEquationFunction } from './chunk.glsl';

export const pointLightFragment = new FragmentShader({
  uniforms: {
    lightPosition: uniform('vec3'),
    lightColor: uniform('vec3'),
    lightRange: uniform('float'),
    eyePosition: uniform('vec3'),
    lightShadowMap: uniform('samplerCube'),
    lightShadowMapSize: uniform('float')
  },
  includes: [shadowMap, gBufferRead, lightAttenuation],
  main: glsl`

${lightEquationFunction()}

void main()
{
  ${gBufferRead.main}

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
  gl_FragColor.rgb = attenuation * lightEquation(
    lightColor, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
  );

#ifdef SHADOWMAP_ENABLED
  float shadowContrib = computeShadowContribOmni(
    lightShadowMap, -L * dist, lightRange
  );
  gl_FragColor.rgb *= clamp(shadowContrib, 0.0, 1.0);
#endif

  gl_FragColor.a = 1.0;
}`
});

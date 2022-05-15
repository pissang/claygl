import { createUniform as uniform, FragmentShader, glsl } from '../../Shader';
import { VIEWINVERSE } from '../../shader/source/shared';
import { decodeRGBMFunction, encodeRGBMFunction } from '../../shader/source/util.glsl';

export const cubemapPrefilterFragment = new FragmentShader({
  name: 'prefilterFrag',
  defines: {
    SHADER_NAME: 'prefilter',
    SAMPLE_NUMBER: 1024,
    PI: Math.PI
  },
  uniforms: {
    viewInverse: VIEWINVERSE(),
    environmentMap: uniform('samplerCube'),
    normalDistribution: uniform('sampler2D'),
    roughness: uniform('float')
  },
  main: glsl`

${encodeRGBMFunction()}
${decodeRGBMFunction()}

vec3 importanceSampleNormal(float i, float roughness, vec3 N) {
  vec3 H = texture2D(normalDistribution, vec2(roughness, i)).rgb;

  vec3 upVector = abs(N.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 tangentX = normalize(cross(N, upVector));
  vec3 tangentZ = cross(N, tangentX);
  // Tangent to world space
  return normalize(tangentX * H.x + N * H.y + tangentZ * H.z);
}

void main() {

  vec3 eyePos = viewInverse[3].xyz;
  vec3 V = normalize(v_WorldPosition - eyePos);

  vec3 N = V;

  vec3 prefilteredColor = vec3(0.0);
  float totalWeight = 0.0;
  float fMaxSampleNumber = float(SAMPLE_NUMBER);

  for (int i = 0; i < SAMPLE_NUMBER; i++) {
    vec3 H = importanceSampleNormal(float(i) / fMaxSampleNumber, roughness, N);
    vec3 L = reflect(-V, H);

    float NoL = clamp(dot(N, L), 0.0, 1.0);
    if (NoL > 0.0) {
      prefilteredColor += decodeHDR(textureCube(environmentMap, L)).rgb * NoL;
      totalWeight += NoL;
    }
  }

  gl_FragColor = encodeHDR(vec4(prefilteredColor / totalWeight, 1.0));
}
  `
});

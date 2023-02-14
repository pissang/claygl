import { Shader, FragmentShader, glsl } from 'claygl';
import { floatEncoderMixin } from 'claygl/shaders';
const { uniform, arrayUniform } = Shader;

export const SSAOEstimateFragment = new FragmentShader({
  name: 'SSAOEstimateFrag',
  uniforms: {
    gBufferTex: uniform('sampler2D'),
    depthTex: uniform('sampler2D'),
    noiseTex: uniform('sampler2D'),
    gBufferTexSize: uniform('vec2'),
    noiseTexSize: uniform('vec2'),
    projection: uniform('mat4'),
    projectionInv: uniform('mat4'),
    viewInverseTranspose: uniform('mat4'),
    kernel: arrayUniform('vec3', 'KERNEL_SIZE'),
    radius: uniform('float', 1.5),
    power: uniform('float', 2),
    bias: uniform('float', 1e-4)
  },
  includes: [floatEncoderMixin],
  main: glsl`
vec3 ssaoEstimator(in mat3 kernelBasis, in vec3 originPos) {
  float occlusion = 0.0;

  for (int i = 0; i < KERNEL_SIZE; i++) {
    vec3 samplePos = kernelBasis * kernel[i];
    samplePos = samplePos * radius + originPos;

    vec4 texCoord = projection * vec4(samplePos, 1.0);
    texCoord.xy /= texCoord.w;

    vec4 depthTexel = texture(depthTex, texCoord.xy * 0.5 + 0.5);
  #ifdef DEPTH_ENCODED
    depthTexel.rgb /= depthTexel.a;
    float sampleDepth = decodeFloat(depthTexel) * 2.0 - 1.0;
  #else
    float sampleDepth = depthTexel.r * 2.0 - 1.0;
  #endif

    sampleDepth = projection[3][2] / (sampleDepth * projection[2][3] - projection[2][2]);

    float rangeCheck = smoothstep(0.0, 1.0, radius / abs(originPos.z - sampleDepth));
    occlusion += rangeCheck * step(samplePos.z, sampleDepth - bias);
  }
  occlusion = 1.0 - occlusion / float(KERNEL_SIZE);
  return vec3(pow(occlusion, power));
}

void main()
{
  vec4 tex = texture(gBufferTex, v_Texcoord);

  // Is empty
  if (dot(tex.rgb, vec3(1.0)) == 0.0) {
    out_color = vec4(vec3(1.0), 0.0);
    return;
  }

  vec3 N = tex.rgb * 2.0 - 1.0;

  // Convert to view space
  N = (viewInverseTranspose * vec4(N, 0.0)).xyz;


  vec4 depthTexel = texture(depthTex, v_Texcoord);
#ifdef DEPTH_ENCODED
  depthTexel.rgb /= depthTexel.a;
  float z = decodeFloat(depthTexel) * 2.0 - 1.0;
#else
  float z = depthTexel.r * 2.0 - 1.0;
#endif

  vec4 projectedPos = vec4(v_Texcoord * 2.0 - 1.0, z, 1.0);
  vec4 p4 = projectionInv * projectedPos;

  vec3 position = p4.xyz / p4.w;

  vec2 noiseTexCoord = gBufferTexSize / vec2(noiseTexSize) * v_Texcoord;
  vec3 rvec = texture(noiseTex, noiseTexCoord).rgb * 2.0 - 1.0;

  // Tangent
  vec3 T = normalize(rvec - N * dot(rvec, N));
  // Bitangent
  vec3 BT = normalize(cross(N, T));
  mat3 kernelBasis = mat3(T, BT, N);

  out_color = vec4(vec3(ssaoEstimator(kernelBasis, position)), 1.0);
}`
});
export const SSAOBlurFragment = new FragmentShader({
  name: 'SSAOBlurFrag',
  uniforms: {
    texture: uniform('sampler2D'),
    textureSize: uniform('vec2')
  },
  includes: [floatEncoderMixin],
  main: glsl`
void main () {
  vec2 texelSize = 1.0 / textureSize;

  vec4 color = vec4(0.0);
  vec2 hlim = vec2(float(-BLUR_SIZE) * 0.5 + 0.5);
  vec4 centerColor = texture(texture, v_Texcoord);
  float weightAll = 0.0;
  float boxWeight = 1.0 / float(BLUR_SIZE) * float(BLUR_SIZE);
  for (int x = 0; x < BLUR_SIZE; x++) {
    for (int y = 0; y < BLUR_SIZE; y++) {
      vec2 coord = (vec2(float(x), float(y)) + hlim) * texelSize + v_Texcoord;
      vec4 sample = texture(texture, coord);
      // http://stackoverflow.com/questions/6538310/anyone-know-where-i-can-find-a-glsl-implementation-of-a-bilateral-filter-blur
      // PENDING
      float closeness = 1.0 - distance(sample, centerColor) / sqrt(3.0);
      float weight = boxWeight * closeness;
      color += weight * sample;
      weightAll += weight;
    }
  }

  out_color = color / weightAll;
}`
});

import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { HDREncoderMixin } from '../util.glsl';

export const lensflareCompositeFragment = new FragmentShader({
  name: 'lensflareFrag',
  defines: {
    SAMPLE_NUMBER: 8
  },
  uniforms: {
    colorTex: uniform('sampler2D'),
    lenscolor: uniform('sampler2D'),
    textureSize: uniform('vec2', [512, 512]),
    dispersal: uniform('float', 0.3),
    haloWidth: uniform('float', 0.4),
    distortion: uniform('float', 1.0)
  },
  includes: [HDREncoderMixin],
  main: glsl`
vec4 textureDistorted(
  in vec2 texcoord,
  in vec2 direction,
  in vec3 distortion
) {
  return vec4(
    decodeHDR(texture(colorTex, texcoord + direction * distortion.r)).r,
    decodeHDR(texture(colorTex, texcoord + direction * distortion.g)).g,
    decodeHDR(texture(colorTex, texcoord + direction * distortion.b)).b,
    1.0
  );
}

void main()
{
  vec2 texcoord = -v_Texcoord + vec2(1.0); // Flip texcoords
  vec2 textureOffset = 1.0 / textureSize;

  vec2 ghostVec = (vec2(0.5) - texcoord) * dispersal;
  vec2 haloVec = normalize(ghostVec) * haloWidth;

  vec3 distortion = vec3(-textureOffset.x * distortion, 0.0, textureOffset.x * distortion);
  //Sample ghost
  vec4 result = vec4(0.0);
  for (int i = 0; i < SAMPLE_NUMBER; i++) {
    vec2 offset = fract(texcoord + ghostVec * float(i));

    float weight = length(vec2(0.5) - offset) / length(vec2(0.5));
    weight = pow(1.0 - weight, 10.0);

    result += textureDistorted(offset, normalize(ghostVec), distortion) * weight;
  }

  result *= texture(lenscolor, vec2(length(vec2(0.5) - texcoord)) / length(vec2(0.5)));
  //Sample halo
  float weight = length(vec2(0.5) - fract(texcoord + haloVec)) / length(vec2(0.5));
  weight = pow(1.0 - weight, 10.0);
  vec2 offset = fract(texcoord + haloVec);
  result += textureDistorted(offset, normalize(ghostVec), distortion) * weight;

  out_color = result;
}`
});

import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { HDREncoderMixin } from '../util.glsl';

const weightShader = 'const vec3 w = vec3(0.2125, 0.7154, 0.0721);';

export const lumCompositeFragment = new FragmentShader({
  name: 'lumFrag',
  uniforms: {
    texture: uniform('sampler2D')
  },
  main: glsl`
${weightShader}
void main() {
  vec4 tex = texture(texture, v_Texcoord);
  float luminance = dot(tex.rgb, w);
  out_color = vec4(vec3(luminance), 1.0);
}
  `
});

export const logLumCompositeFragment = new FragmentShader({
  name: 'logLumFrag',
  uniforms: {
    texture: uniform('sampler2D')
  },
  includes: [HDREncoderMixin],
  main: glsl`

${weightShader}

void main() {
  vec4 tex = decodeHDR(texture(texture, v_Texcoord));
  float luminance = dot(tex.rgb, w);
  luminance = log(luminance + 0.001);
  out_color = encodeHDR(vec4(vec3(luminance), 1.0));
}`
});

export const lumAdaptionCompositeFragment = new FragmentShader({
  name: 'lumAdaptionFrag',
  uniforms: {
    adaptedLum: uniform('sampler2D'),
    currentLum: uniform('sampler2D'),
    frameTime: uniform('float', 0.02)
  },
  includes: [HDREncoderMixin],
  main: glsl`
void main() {
  float fAdaptedLum = decodeHDR(texture(adaptedLum, vec2(0.5, 0.5))).r;
  float fCurrentLum = exp(encodeHDR(texture(currentLum, vec2(0.5, 0.5))).r);

  fAdaptedLum += (fCurrentLum - fAdaptedLum) * (1.0 - pow(0.98, 30.0 * frameTime));
  out_color = encodeHDR(vec4(vec3(fAdaptedLum), 1.0));
}`
});

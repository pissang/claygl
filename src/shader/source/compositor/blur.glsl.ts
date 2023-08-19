import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { clampSampleFunction, HDREncoderMixin } from '../util.glsl';

const defaultGaussianKernelName = `gaussianKernel`;

export const gaussianKernel9 = (kernelName: string = defaultGaussianKernelName) => glsl`
float ${kernelName}[9] = float[9](0.07, 0.09, 0.12, 0.14, 0.16, 0.14, 0.12, 0.09, 0.07);
`;

export const gaussianKernel13 = (kernelName: string = defaultGaussianKernelName) => glsl`
float ${kernelName}[13] = float[13](0.02, 0.03, 0.06, 0.08, 0.11, 0.13, 0.14, 0.13, 0.11, 0.08, 0.06, 0.03, 0.02);
`;

export const gaussianBlurCompositeFragment = new FragmentShader({
  name: 'gaussianBlurFrag',
  uniforms: {
    /**
     * the texture with the scene you want to blur
     */
    colorTex: uniform('sampler2D'),

    blurSize: uniform('float', 2.0),

    /**
     * 0.0 is horizontal, 1.0 is vertical
     */
    blurDir: uniform('float', 0.0)
  },
  includes: [HDREncoderMixin],
  main: glsl`
${clampSampleFunction()}

void main (void)
{
  ${gaussianKernel9()}

  vec2 off = blurSize / vec2(textureSize(colorTex, 0));
  off *= vec2(1.0 - blurDir, blurDir);

  vec4 sum = vec4(0.0);
  float weightAll = 0.0;

    // blur in y (horizontal)
  for (int i = 0; i < 9; i++) {
    float w = gaussianKernel[i];
    // Premultiplied Alpha
    vec4 texel = decodeHDR(clampSample(colorTex, v_Texcoord + float(i - 4) * off));
    // TODO alpha blend?
    sum += texel * w;
    weightAll += w;
  }
  out_color = encodeHDR(sum / max(weightAll, 0.01));
}

  `
});

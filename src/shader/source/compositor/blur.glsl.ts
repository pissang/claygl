import { createUniform as uniform, FragmentShader, glsl } from '../../../Shader';
import { clampSampleFunction, decodeHDRFunction, encodeHDRFunction } from '../util.glsl';

const defaultGaussianKernelName = `gaussianKernel`;

export const gaussianKernel9 = (kernelName: string = defaultGaussianKernelName) => glsl`
float ${kernelName}[9];
${kernelName}[0] = 0.07;
${kernelName}[1] = 0.09;
${kernelName}[2] = 0.12;
${kernelName}[3] = 0.14;
${kernelName}[4] = 0.16;
${kernelName}[5] = 0.14;
${kernelName}[6] = 0.12;
${kernelName}[7] = 0.09;
${kernelName}[8] = 0.07;`;

export const gaussianKernel13 = (kernelName: string = defaultGaussianKernelName) => glsl`
float ${kernelName}[13];
${kernelName}[0] = 0.02;
${kernelName}[1] = 0.03;
${kernelName}[2] = 0.06;
${kernelName}[3] = 0.08;
${kernelName}[4] = 0.11;
${kernelName}[5] = 0.13;
${kernelName}[6] = 0.14;
${kernelName}[7] = 0.13;
${kernelName}[8] = 0.11;
${kernelName}[9] = 0.08;
${kernelName}[10] = 0.06;
${kernelName}[11] = 0.03;
${kernelName}[12] = 0.02;`;

export const blurCompositeFragment = new FragmentShader({
  name: 'gaussianBlurFrag',
  uniforms: {
    /**
     * the texture with the scene you want to blur
     */
    texture: uniform('sampler2D'),

    blurSize: uniform('float', 2.0),
    textureSize: uniform('vec2', [512.0, 512.0]),
    /**
     * 0.0 is horizontal, 1.0 is vertical
     */
    blurDir: uniform('float', 0.0)
  },
  main: glsl`
${encodeHDRFunction()}
${decodeHDRFunction()}
${clampSampleFunction()}

void main (void)
{
  ${gaussianKernel9()}

  vec2 off = blurSize / textureSize;
  off *= vec2(1.0 - blurDir, blurDir);

  vec4 sum = vec4(0.0);
  float weightAll = 0.0;

    // blur in y (horizontal)
  for (int i = 0; i < 9; i++) {
    float w = gaussianKernel[i];
    // Premultiplied Alpha
    vec4 texel = decodeHDR(clampSample(texture, v_Texcoord + float(i - 4) * off));
    // TODO alpha blend?
    sum += texel * w;
    weightAll += w;
  }
  gl_FragColor = encodeHDR(sum / max(weightAll, 0.01));
}

  `
});

@export clay.compositor.kernel.gaussian_9
// http://dev.theomader.com/gaussian-kernel-calculator/
// array constructor supported in GLSL ES 3.00 only
float gaussianKernel[9];
gaussianKernel[0] = 0.07;
gaussianKernel[1] = 0.09;
gaussianKernel[2] = 0.12;
gaussianKernel[3] = 0.14;
gaussianKernel[4] = 0.16;
gaussianKernel[5] = 0.14;
gaussianKernel[6] = 0.12;
gaussianKernel[7] = 0.09;
gaussianKernel[8] = 0.07;
@end

@export clay.compositor.kernel.gaussian_13

float gaussianKernel[13];

gaussianKernel[0] = 0.02;
gaussianKernel[1] = 0.03;
gaussianKernel[2] = 0.06;
gaussianKernel[3] = 0.08;
gaussianKernel[4] = 0.11;
gaussianKernel[5] = 0.13;
gaussianKernel[6] = 0.14;
gaussianKernel[7] = 0.13;
gaussianKernel[8] = 0.11;
gaussianKernel[9] = 0.08;
gaussianKernel[10] = 0.06;
gaussianKernel[11] = 0.03;
gaussianKernel[12] = 0.02;

@end


@export clay.compositor.gaussian_blur

#define SHADER_NAME gaussian_blur

uniform sampler2D texture; // the texture with the scene you want to blur
varying vec2 v_Texcoord;

uniform float blurSize : 2.0;
uniform vec2 textureSize : [512.0, 512.0];
// 0.0 is horizontal, 1.0 is vertical
uniform float blurDir : 0.0;

@import clay.util.rgbm
@import clay.util.clamp_sample

void main (void)
{
    @import clay.compositor.kernel.gaussian_9

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

@end

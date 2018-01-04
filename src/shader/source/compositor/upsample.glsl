// https://github.com/keijiro/KinoBloom/blob/master/Assets/Kino/Bloom/Shader/Bloom.cginc#L96

@export clay.compositor.upsample

#define HIGH_QUALITY

uniform sampler2D texture;
uniform vec2 textureSize : [512, 512];

uniform float sampleScale: 0.5;

varying vec2 v_Texcoord;

@import clay.util.rgbm

@import clay.util.clamp_sample

void main()
{

#ifdef HIGH_QUALITY
    // 9-tap bilinear upsampler (tent filter)
    vec4 d = vec4(1.0, 1.0, -1.0, 0.0) / textureSize.xyxy * sampleScale;

    vec4 s;
    s  = decodeHDR(clampSample(texture, v_Texcoord - d.xy));
    s += decodeHDR(clampSample(texture, v_Texcoord - d.wy)) * 2.0;
    s += decodeHDR(clampSample(texture, v_Texcoord - d.zy));

    s += decodeHDR(clampSample(texture, v_Texcoord + d.zw)) * 2.0;
    s += decodeHDR(clampSample(texture, v_Texcoord       )) * 4.0;
    s += decodeHDR(clampSample(texture, v_Texcoord + d.xw)) * 2.0;

    s += decodeHDR(clampSample(texture, v_Texcoord + d.zy));
    s += decodeHDR(clampSample(texture, v_Texcoord + d.wy)) * 2.0;
    s += decodeHDR(clampSample(texture, v_Texcoord + d.xy));

    gl_FragColor = encodeHDR(s / 16.0);
#else
    // 4-tap bilinear upsampler
    vec4 d = vec4(-1.0, -1.0, +1.0, +1.0) / textureSize.xyxy;

    vec4 s;
    s  = decodeHDR(clampSample(texture, v_Texcoord + d.xy));
    s += decodeHDR(clampSample(texture, v_Texcoord + d.zy));
    s += decodeHDR(clampSample(texture, v_Texcoord + d.xw));
    s += decodeHDR(clampSample(texture, v_Texcoord + d.zw));

    gl_FragColor = encodeHDR(s / 4.0);
#endif
}

@end
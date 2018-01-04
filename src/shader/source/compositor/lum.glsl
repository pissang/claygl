@export clay.compositor.hdr.log_lum

varying vec2 v_Texcoord;

uniform sampler2D texture;

const vec3 w = vec3(0.2125, 0.7154, 0.0721);

@import clay.util.rgbm

void main()
{
    vec4 tex = decodeHDR(texture2D(texture, v_Texcoord));
    float luminance = dot(tex.rgb, w);
    luminance = log(luminance + 0.001);

    gl_FragColor = encodeHDR(vec4(vec3(luminance), 1.0));
}

@end

@export clay.compositor.hdr.lum_adaption
varying vec2 v_Texcoord;

uniform sampler2D adaptedLum;
uniform sampler2D currentLum;

uniform float frameTime : 0.02;

@import clay.util.rgbm

void main()
{
    float fAdaptedLum = decodeHDR(texture2D(adaptedLum, vec2(0.5, 0.5))).r;
    float fCurrentLum = exp(encodeHDR(texture2D(currentLum, vec2(0.5, 0.5))).r);

    fAdaptedLum += (fCurrentLum - fAdaptedLum) * (1.0 - pow(0.98, 30.0 * frameTime));
    gl_FragColor = encodeHDR(vec4(vec3(fAdaptedLum), 1.0));
}
@end

@export clay.compositor.lum

varying vec2 v_Texcoord;

uniform sampler2D texture;

const vec3 w = vec3(0.2125, 0.7154, 0.0721);

void main()
{
    vec4 tex = texture2D( texture, v_Texcoord );
    float luminance = dot(tex.rgb, w);

    gl_FragColor = vec4(vec3(luminance), 1.0);
}

@end
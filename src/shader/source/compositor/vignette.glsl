@export clay.compositor.vignette

#define OUTPUT_ALPHA

varying vec2 v_Texcoord;

uniform sampler2D texture;

uniform float darkness: 1;
uniform float offset: 1;

@import clay.util.rgbm

void main()
{
    vec4 texel = decodeHDR(texture2D(texture, v_Texcoord));

    gl_FragColor.rgb = texel.rgb;

    vec2 uv = (v_Texcoord - vec2(0.5)) * vec2(offset);

    gl_FragColor = encodeHDR(vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a));
}

@end
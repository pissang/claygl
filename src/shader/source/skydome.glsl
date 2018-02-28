@export clay.skydome.vertex
#define SHADER_NAME skydome
uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
attribute vec2 texcoord : TEXCOORD_0;

attribute vec3 position : POSITION;

varying vec2 v_Texcoord;

void main()
{
    gl_Position = worldViewProjection * vec4(position, 1.0);
    v_Texcoord = texcoord;
}

@end

@export clay.skydome.fragment

uniform sampler2D environmentMap;

varying vec2 v_Texcoord;

@import clay.util.rgbm

@import clay.util.srgb

@import clay.util.ACES

void main()
{
    vec4 texel = decodeHDR(texture2D(environmentMap, v_Texcoord));

#ifdef SRGB_DECODE
    texel = sRGBToLinear(texel);
#endif

#ifdef TONEMAPPING
    texel.rgb = ACESToneMapping(texel.rgb);
#endif

#ifdef SRGB_ENCODE
    texel = linearTosRGB(texel);
#endif

    gl_FragColor = encodeHDR(vec4(texel.rgb, 1.0));
}
@end
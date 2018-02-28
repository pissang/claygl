@export clay.skybox.vertex
#define SHADER_NAME skybox

uniform mat4 world : WORLD;
uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;

varying vec3 v_WorldPosition;

void main()
{
    v_WorldPosition = (world * vec4(position, 1.0)).xyz;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}

@end

@export clay.skybox.fragment

uniform mat4 viewInverse : VIEWINVERSE;
uniform samplerCube environmentMap;
uniform float lod: 0.0;

varying vec3 v_WorldPosition;

@import clay.util.rgbm

@import clay.util.srgb

@import clay.util.ACES

void main()
{
    vec3 eyePos = viewInverse[3].xyz;
    vec3 viewDirection = normalize(v_WorldPosition - eyePos);
#ifdef LOD
    vec4 texel = decodeHDR(textureCubeLodEXT(environmentMap, viewDirection, lod));
#else
    vec4 texel = decodeHDR(textureCube(environmentMap, viewDirection));
#endif

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
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

#define PI 3.1415926

uniform mat4 viewInverse : VIEWINVERSE;
#ifdef EQUIRECTANGULAR
uniform sampler2D environmentMap;
#else
uniform samplerCube environmentMap;
#endif
uniform float lod: 0.0;

varying vec3 v_WorldPosition;

@import clay.util.rgbm

@import clay.util.srgb

@import clay.util.ACES

void main()
{
    vec3 eyePos = viewInverse[3].xyz;
    vec3 V = normalize(v_WorldPosition - eyePos);
#ifdef EQUIRECTANGULAR
    float phi = acos(V.y);
    // consistent with cubemap.
    // atan(y, x) is same with atan2 ?
    float theta = atan(-V.x, V.z) + PI * 0.5;
    vec2 uv = vec2(theta / 2.0 / PI, phi / PI);
    vec4 texel = decodeHDR(texture2D(environmentMap, fract(uv)));
#else
    #if defined(LOD) || defined(SUPPORT_TEXTURE_LOD)
    vec4 texel = decodeHDR(textureCubeLodEXT(environmentMap, V, lod));
    #else
    vec4 texel = decodeHDR(textureCube(environmentMap, V));
    #endif
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
@export qtek.skybox.vertex

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

@export qtek.skybox.fragment

uniform mat4 viewInverse : VIEWINVERSE;
uniform samplerCube environmentMap;
uniform float lod: 0.0;

varying vec3 v_WorldPosition;

@import qtek.util.rgbm

void main()
{
    vec3 eyePos = viewInverse[3].xyz;
    vec3 viewDirection = normalize(v_WorldPosition - eyePos);

    vec3 tex = decodeHDR(textureCubeLodEXT(environmentMap, viewDirection, lod)).rgb;

#ifdef SRGB_DECODE
    tex.rgb = pow(tex.rgb, vec3(2.2));
#endif

    gl_FragColor = encodeHDR(vec4(tex, 1.0));
}
@end
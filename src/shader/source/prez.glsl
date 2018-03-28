// Shader for prez pass
@export clay.prez.vertex

uniform mat4 WVP : WORLDVIEWPROJECTION;

attribute vec3 pos : POSITION;
attribute vec2 uv : TEXCOORD_0;

@import clay.chunk.skinning_header

varying vec2 v_Uv;

void main()
{

    vec3 P = pos;

#ifdef SKINNING

    @import clay.chunk.skin_matrix

    P = (skinMatrixWS * vec4(pos, 1.0)).xyz;
#endif

    gl_Position = WVP * vec4(P, 1.0);
    v_Uv = uv;
}

@end


@export clay.prez.fragment

uniform sampler2D alphaMap;
uniform float alphaCutoff: 0.0;

varying vec2 v_Uv;

void main()
{
    if (alphaCutoff > 0.0) {
        if (texture2D(alphaMap, v_Uv).a <= alphaCutoff) {
            discard;
        }
    }
    gl_FragColor = vec4(0.0,0.0,0.0,1.0);
}

@end
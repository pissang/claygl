// Shader for prez pass
@export clay.prez.vertex

uniform mat4 WVP : WORLDVIEWPROJECTION;

attribute vec3 pos : POSITION;
attribute vec2 uv : TEXCOORD_0;

uniform vec2 uvRepeat : [1.0, 1.0];
uniform vec2 uvOffset : [0.0, 0.0];

@import clay.chunk.skinning_header

@import clay.chunk.instancing_header

varying vec2 v_Texcoord;

void main()
{

    vec4 P = vec4(pos, 1.0);

#ifdef SKINNING

    @import clay.chunk.skin_matrix

    P = skinMatrixWS * P;
#endif

#ifdef INSTANCING
    @import clay.chunk.instancing_matrix
    P = instanceMat * P;
#endif

    gl_Position = WVP * P;
    v_Texcoord = uv * uvRepeat + uvOffset;
}

@end


@export clay.prez.fragment

uniform sampler2D alphaMap;
uniform float alphaCutoff: 0.0;

varying vec2 v_Texcoord;

void main()
{
    if (alphaCutoff > 0.0) {
        if (texture2D(alphaMap, v_Texcoord).a <= alphaCutoff) {
            discard;
        }
    }
    gl_FragColor = vec4(0.0,0.0,0.0,1.0);
}

@end
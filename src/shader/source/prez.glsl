// Shader for prez pass
@export clay.prez.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;

@import clay.chunk.skinning_header

varying vec2 v_Texcoord;

void main()
{

    vec3 skinnedPosition = position;

#ifdef SKINNING

    @import clay.chunk.skin_matrix

    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
#endif

    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);
    v_Texcoord = texcoord;
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
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}

@end
// Shader for prez pass
@export qtek.prez.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;

@import qtek.chunk.skinning_header

void main()
{

    vec3 skinnedPosition = position;

#ifdef SKINNING

    @import qtek.chunk.skin_matrix

    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
#endif

    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);
}

@end


@export qtek.prez.fragment

void main()
{
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}

@end
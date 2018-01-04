@export clay.deferred.depth.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;

@import clay.chunk.skinning_header

varying vec4 v_ProjPos;

void main(){

    vec3 skinnedPosition = position;

#ifdef SKINNING

    @import clay.chunk.skin_matrix

    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
#endif

    v_ProjPos = worldViewProjection * vec4(skinnedPosition, 1.0);
    gl_Position = v_ProjPos;

}
@end


@export clay.deferred.depth.fragment

varying vec4 v_ProjPos;
@import clay.util.encode_float

void main()
{
    float depth = v_ProjPos.z / v_ProjPos.w;

    gl_FragColor = encodeFloat(depth * 0.5 + 0.5);
}

@end
@export clay.wireframe.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 world : WORLD;

attribute vec3 position : POSITION;
attribute vec3 barycentric;

@import clay.chunk.skinning_header

varying vec3 v_Barycentric;

void main()
{

    vec3 skinnedPosition = position;
#ifdef SKINNING

    @import clay.chunk.skin_matrix

    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
#endif

    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0 );

    v_Barycentric = barycentric;
}

@end


@export clay.wireframe.fragment

uniform vec3 color : [0.0, 0.0, 0.0];

uniform float alpha : 1.0;
uniform float lineWidth : 1.0;

varying vec3 v_Barycentric;


@import clay.util.edge_factor

void main()
{

    gl_FragColor.rgb = color;
    gl_FragColor.a = (1.0-edgeFactor(lineWidth)) * alpha;
}

@end
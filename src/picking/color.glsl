@export clay.picking.color.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;

@import clay.chunk.skinning_header

void main(){

    vec3 skinnedPosition = position;

    #ifdef SKINNING

        @import clay.chunk.skin_matrix

        skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;
    #endif

    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);
}

@end

@end

@export clay.picking.color.fragment

uniform vec4 color : [1.0, 1.0, 1.0, 1.0];

void main() {
    gl_FragColor = color;
}

@end
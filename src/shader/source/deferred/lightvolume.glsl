@export clay.deferred.light_volume.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;

varying vec3 v_Position;

void main()
{
    gl_Position = worldViewProjection * vec4(position, 1.0);

    v_Position = position;
}

@end
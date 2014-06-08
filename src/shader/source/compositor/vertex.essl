
@export buildin.compositor.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;

varying vec2 v_Texcoord;

void main()
{
    v_Texcoord = texcoord;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}

@end
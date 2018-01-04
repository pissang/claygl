@export clay.vr.disorter.output.vertex

attribute vec2 texcoord: TEXCOORD_0;
attribute vec3 position: POSITION;

varying vec2 v_Texcoord;

void main()
{

    v_Texcoord = texcoord;

    gl_Position = vec4(position.xy, 0.5, 1.0);
}

@end

@export clay.vr.disorter.output.fragment

uniform sampler2D texture;

varying vec2 v_Texcoord;

void main()
{
    gl_FragColor = texture2D(texture, v_Texcoord);
}
@end
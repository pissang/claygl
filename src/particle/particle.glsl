@export clay.particle.vertex

uniform mat4 worldView : WORLDVIEW;
uniform mat4 projection : PROJECTION;

attribute vec3 position : POSITION;
attribute vec3 normal : NORMAL;

#ifdef UV_ANIMATION
attribute vec2 texcoord0 : TEXCOORD_0;
attribute vec2 texcoord1 : TEXCOORD_1;

varying vec2 v_Uv0;
varying vec2 v_Uv1;
#endif

varying float v_Age;

void main() {
    v_Age = normal.x;
    float rotation = normal.y;

    vec4 worldViewPosition = worldView * vec4(position, 1.0);
    gl_Position = projection * worldViewPosition;
    float w = gl_Position.w;
    // TODO
    gl_PointSize = normal.z * projection[0].x / w;

    #ifdef UV_ANIMATION
        v_Uv0 = texcoord0;
        v_Uv1 = texcoord1;
    #endif
}

@end

@export clay.particle.fragment

uniform sampler2D sprite;
uniform sampler2D gradient;
uniform vec3 color : [1.0, 1.0, 1.0];
uniform float alpha : 1.0;

varying float v_Age;

#ifdef UV_ANIMATION
varying vec2 v_Uv0;
varying vec2 v_Uv1;
#endif

void main() {
    vec4 color = vec4(color, alpha);
    #ifdef SPRITE_ENABLED
        #ifdef UV_ANIMATION
            color *= texture2D(sprite, mix(v_Uv0, v_Uv1, gl_PointCoord));
        #else
            color *= texture2D(sprite, gl_PointCoord);
        #endif
    #endif
    #ifdef GRADIENT_ENABLED
        color *= texture2D(gradient, vec2(v_Age, 0.5));
    #endif
    gl_FragColor = color;
}

@end
@export buildin.compositor.coloradjust

varying vec2 v_Texcoord;
uniform sampler2D texture;

uniform float brightness : 0.0;
uniform float contrast : 1.0;
uniform float exposure : 0.0;
uniform float gamma : 1.0;
uniform float saturation : 1.0;

// Values from "Graphics Shaders: Theory and Practice" by Bailey and Cunningham
const vec3 w = vec3(0.2125, 0.7154, 0.0721);

void main()
{
    vec4 tex = texture2D( texture, v_Texcoord);

    // brightness
    vec3 color = clamp(tex.rgb + vec3(brightness), 0.0, 1.0);
    // contrast
    color = clamp( (color-vec3(0.5))*contrast+vec3(0.5), 0.0, 1.0);
    // exposure
    color = clamp( color * pow(2.0, exposure), 0.0, 1.0);
    // gamma
    color = clamp( pow(color, vec3(gamma)), 0.0, 1.0);
    // saturation
    float luminance = dot( color, w );
    color = mix(vec3(luminance), color, saturation);
    
    gl_FragColor = vec4(color, tex.a);
}

@end

// Seperate shader for float texture
@export buildin.compositor.brightness
varying vec2 v_Texcoord;
uniform sampler2D texture;

uniform float brightness : 0.0;

void main()
{
    vec4 tex = texture2D( texture, v_Texcoord);
    vec3 color = tex.rgb + vec3(brightness);
    gl_FragColor = vec4(color, tex.a);
}
@end

@export buildin.compositor.contrast
varying vec2 v_Texcoord;
uniform sampler2D texture;

uniform float contrast : 1.0;

void main()
{
    vec4 tex = texture2D( texture, v_Texcoord);
    vec3 color = (tex.rgb-vec3(0.5))*contrast+vec3(0.5);
    gl_FragColor = vec4(color, tex.a);
}
@end

@export buildin.compositor.exposure
varying vec2 v_Texcoord;
uniform sampler2D texture;

uniform float exposure : 0.0;

void main()
{
    vec4 tex = texture2D(texture, v_Texcoord);
    vec3 color = tex.rgb * pow(2.0, exposure);
    gl_FragColor = vec4(color, tex.a);
}
@end

@export buildin.compositor.gamma
varying vec2 v_Texcoord;
uniform sampler2D texture;

uniform float gamma : 1.0;

void main()
{
    vec4 tex = texture2D(texture, v_Texcoord);
    vec3 color = pow(tex.rgb, vec3(gamma));
    gl_FragColor = vec4(color, tex.a);
}
@end

@export buildin.compositor.saturation
varying vec2 v_Texcoord;
uniform sampler2D texture;

uniform float saturation : 1.0;

const vec3 w = vec3(0.2125, 0.7154, 0.0721);

void main()
{
    vec4 tex = texture2D(texture, v_Texcoord);
    vec3 color = tex.rgb;
    float luminance = dot(color, w);
    color = mix(vec3(luminance), color, saturation);
    gl_FragColor = vec4(color, tex.a);
}
@end
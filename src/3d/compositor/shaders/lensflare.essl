// john-chapman-graphics.blogspot.co.uk/2013/02/pseudo-lens-flare.html
@export buildin.compositor.lensflare

#define SAMPLE_NUMBER 8

uniform sampler2D texture;
uniform sampler2D lensColor;

uniform vec2 textureSize : [512, 512];

uniform float dispersal : 0.3;
uniform float haloWidth : 0.4;
uniform float distortion : 1.0;

varying vec2 v_Texcoord;

vec4 textureDistorted(
    in vec2 texcoord,
    in vec2 direction,
    in vec3 distortion
) {
    return vec4(
        texture2D(texture, texcoord + direction * distortion.r).r,
        texture2D(texture, texcoord + direction * distortion.g).g,
        texture2D(texture, texcoord + direction * distortion.b).b,
        1.0
    );
}

void main()
{
    vec2 texcoord = -v_Texcoord + vec2(1.0); // Flip texcoords
    vec2 textureOffset = 1.0 / textureSize;

    vec2 ghostVec = (vec2(0.5) - texcoord) * dispersal;
    vec2 haloVec = normalize(ghostVec) * haloWidth;

    vec3 distortion = vec3(-textureOffset.x * distortion, 0.0, textureOffset.x * distortion);
    //Sample ghost
    vec4 result = vec4(0.0);
    for (int i = 0; i < SAMPLE_NUMBER; i++)
    {
        vec2 offset = fract(texcoord + ghostVec * float(i));

        float weight = length(vec2(0.5) - offset) / length(vec2(0.5));
        weight = pow(1.0 - weight, 10.0);

        result += textureDistorted(offset, normalize(ghostVec), distortion) * weight;
    }

    result *= texture2D(lensColor, vec2(length(vec2(0.5) - texcoord)) / length(vec2(0.5)));
    //Sample halo
    float weight = length(vec2(0.5) - fract(texcoord + haloVec)) / length(vec2(0.5));
    weight = pow(1.0 - weight, 10.0);
    vec2 offset = fract(texcoord + haloVec);
    result += textureDistorted(offset, normalize(ghostVec), distortion) * weight;

    gl_FragColor = result;
}
@end
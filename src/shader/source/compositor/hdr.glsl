// Final composite of bloom, source, lensflare
// with tonemapping, lut and vignette
// http://filmicgames.com/archives/75
@export clay.compositor.hdr.composite
#define TONEMAPPING

uniform sampler2D texture;
#ifdef BLOOM_ENABLED
uniform sampler2D bloom;
#endif
#ifdef LENSFLARE_ENABLED
uniform sampler2D lensflare;
uniform sampler2D lensdirt;
#endif

#ifdef LUM_ENABLED
uniform sampler2D lum;
#endif

#ifdef LUT_ENABLED
uniform sampler2D lut;
#endif

#ifdef COLOR_CORRECTION
uniform float brightness : 0.0;
uniform float contrast : 1.0;
uniform float saturation : 1.0;
#endif

#ifdef VIGNETTE
uniform float vignetteDarkness: 1.0;
uniform float vignetteOffset: 1.0;
#endif

uniform float exposure : 1.0;
uniform float bloomIntensity : 0.25;
uniform float lensflareIntensity : 1;

varying vec2 v_Texcoord;

// const vec3 whiteScale = vec3(11.2);

@import clay.util.srgb

// vec3 uncharted2ToneMap(vec3 x)
// {
//     const float A = 0.22;   // Shoulder Strength
//     const float B = 0.30;   // Linear Strength
//     const float C = 0.10;   // Linear Angle
//     const float D = 0.20;   // Toe Strength
//     const float E = 0.01;   // Toe Numerator
//     const float F = 0.30;   // Toe Denominator

//     return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
// }

// vec3 filmicToneMap(vec3 color)
// {
//     vec3 x = max(vec3(0.0), color - 0.004);
//     return (x*(6.2*x+0.5))/(x*(6.2*x+1.7)+0.06);
// }

vec3 ACESToneMapping(vec3 color)
{
    const float A = 2.51;
    const float B = 0.03;
    const float C = 2.43;
    const float D = 0.59;
    const float E = 0.14;
    return (color * (A * color + B)) / (color * (C * color + D) + E);
}

float eyeAdaption(float fLum)
{
    return mix(0.2, fLum, 0.5);
}

#ifdef LUT_ENABLED
vec3 lutTransform(vec3 color) {
    float blueColor = color.b * 63.0;

    vec2 quad1;
    quad1.y = floor(floor(blueColor) / 8.0);
    quad1.x = floor(blueColor) - (quad1.y * 8.0);

    vec2 quad2;
    quad2.y = floor(ceil(blueColor) / 8.0);
    quad2.x = ceil(blueColor) - (quad2.y * 8.0);

    vec2 texPos1;
    texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.r);
    texPos1.y = (quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.g);

    vec2 texPos2;
    texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.r);
    texPos2.y = (quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * color.g);

    vec4 newColor1 = texture2D(lut, texPos1);
    vec4 newColor2 = texture2D(lut, texPos2);

    vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
    return newColor.rgb;
}
#endif

@import clay.util.rgbm

void main()
{
    // TODO alpha blend
    vec4 texel = vec4(0.0);
    vec4 originalTexel = vec4(0.0);
#ifdef TEXTURE_ENABLED
    texel = decodeHDR(texture2D(texture, v_Texcoord));
    originalTexel = texel;
#endif

#ifdef BLOOM_ENABLED
    vec4 bloomTexel = decodeHDR(texture2D(bloom, v_Texcoord));
    texel.rgb += bloomTexel.rgb * bloomIntensity;
    // TODO If consider bloomInstensity.
    // There are shadow like blurred edge if not consider bloomIntensity. Which is not bad
    texel.a += bloomTexel.a * bloomIntensity;
#endif

#ifdef LENSFLARE_ENABLED
    texel += decodeHDR(texture2D(lensflare, v_Texcoord)) * texture2D(lensdirt, v_Texcoord) * lensflareIntensity;
#endif

    texel.a = min(texel.a, 1.0);

// Adjust exposure
// From KlayGE
#ifdef LUM_ENABLED
    float fLum = texture2D(lum, vec2(0.5, 0.5)).r;
    float adaptedLumDest = 3.0 / (max(0.1, 1.0 + 10.0*eyeAdaption(fLum)));
    float exposureBias = adaptedLumDest * exposure;
#else
    float exposureBias = exposure;
#endif

    // Tone mapping
    // vec3 color = uncharted2ToneMap(tex) / uncharted2ToneMap(whiteScale);
    // vec3 color = filmicToneMap(tex);
#ifdef TONEMAPPING
    texel.rgb *= exposureBias;
    texel.rgb = ACESToneMapping(texel.rgb);
#endif
    texel = linearTosRGB(texel);

// Color lut
#ifdef LUT_ENABLED
    texel.rgb = lutTransform(clamp(texel.rgb,vec3(0.0),vec3(1.0)));
#endif

#ifdef COLOR_CORRECTION
    // brightness
    texel.rgb = clamp(texel.rgb + vec3(brightness), 0.0, 1.0);
    // contrast
    texel.rgb = clamp((texel.rgb - vec3(0.5))*contrast+vec3(0.5), 0.0, 1.0);
    // saturation
    float lum = dot(texel.rgb, vec3(0.2125, 0.7154, 0.0721));
    texel.rgb = mix(vec3(lum), texel.rgb, saturation);
#endif

#ifdef VIGNETTE
    vec2 uv = (v_Texcoord - vec2(0.5)) * vec2(vignetteOffset);
    texel.rgb = mix(texel.rgb, vec3(1.0 - vignetteDarkness), dot(uv, uv));
#endif

    gl_FragColor = encodeHDR(texel);

#ifdef DEBUG
    // Debug output original
    #if DEBUG == 1
    gl_FragColor = encodeHDR(decodeHDR(texture2D(texture, v_Texcoord)));
    // Debug output bloom
    #elif DEBUG == 2
    gl_FragColor = encodeHDR(decodeHDR(texture2D(bloom, v_Texcoord)) * bloomIntensity);
    // Debug output lensflare
    #elif DEBUG == 3
    gl_FragColor = encodeHDR(decodeHDR(texture2D(lensflare, v_Texcoord) * lensflareIntensity));
    #endif
#endif

    if (originalTexel.a <= 0.01 && gl_FragColor.a > 1e-5) {
        // bloom and lensflare out of main scene should be additive blending with the background dom.
        // Here is the tricky part. Use lum to simulate alpha and use browser's default blending.
        gl_FragColor.a = dot(gl_FragColor.rgb, vec3(0.2125, 0.7154, 0.0721));
    }

    // Premultiply alpha if there is no blending.
    // webgl will divide alpha.
#ifdef PREMULTIPLY_ALPHA
    gl_FragColor.rgb *= gl_FragColor.a;
#endif
}

@end
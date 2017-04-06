// Sousa_Graphics_Gems_CryENGINE3, Siggraph 2013
// The Skylanders SWAP Force Depth-of-Field Shader in GPU Pro 4
@export qtek.compositor.dof.coc

uniform sampler2D depth;

uniform float zNear: 0.1;
uniform float zFar: 2000;

uniform float focalDist: 3;
// Object in range are perfectly in focus
uniform float focalRange: 1;
// 30mm
uniform float focalLength: 30;
// f/2.8
uniform float fstop: 2.8;

varying vec2 v_Texcoord;

@import qtek.util.encode_float

void main()
{
    float z = texture2D(depth, v_Texcoord).r * 2.0 - 1.0;

    float dist = 2.0 * zNear * zFar / (zFar + zNear - z * (zFar - zNear));

    float aperture = focalLength / fstop;

    float coc;

    float uppper = focalDist + focalRange;
    float lower = focalDist - focalRange;
    if (dist <= uppper && dist >= lower) {
        // Object in range are perfectly in focus
        coc = 0.5;
    }
    else {
        // Adjust focalDist
        float focalAdjusted = dist > uppper ? uppper : lower;

        // GPU Gems Depth of Field: A Survey of Techniques
        coc = abs(aperture * (focalLength * (dist - focalAdjusted)) / (dist * (focalAdjusted - focalLength)));
        // Clamp on the near focus plane and far focus plane
        // PENDING
        // Float value can only be [0.0 - 1.0)
        coc = clamp(coc, 0.0, 0.4) / 0.4000001;

        // Near field
        if (dist < lower) {
            coc = -coc;
        }
        coc = coc * 0.5 + 0.5;
    }

    // R: coc, < 0.5 is near field, > 0.5 is far field
    gl_FragColor = encodeFloat(coc);
}

@end

// Premultiply with coc to avoid bleeding in upsampling
@export qtek.compositor.dof.premultiply

uniform sampler2D texture;
uniform sampler2D coc;
varying vec2 v_Texcoord;

@import qtek.util.rgbm

@import qtek.util.decode_float

void main() {
    float fCoc = max(abs(decodeFloat(texture2D(coc, v_Texcoord)) * 2.0 - 1.0), 0.1);
    gl_FragColor = encodeHDR(
        vec4(decodeHDR(texture2D(texture, v_Texcoord)).rgb * fCoc, 1.0)
    );
}
@end


// Get min coc tile
@export qtek.compositor.dof.min_coc
uniform sampler2D coc;
varying vec2 v_Texcoord;
uniform vec2 textureSize : [512.0, 512.0];

@import qtek.util.float

void main()
{
    vec4 d = vec4(-1.0, -1.0, 1.0, 1.0) / textureSize.xyxy;

    float fCoc = decodeFloat(texture2D(coc, v_Texcoord + d.xy));
    fCoc = min(fCoc, decodeFloat(texture2D(coc, v_Texcoord + d.zy)));
    fCoc = min(fCoc, decodeFloat(texture2D(coc, v_Texcoord + d.xw)));
    fCoc = min(fCoc, decodeFloat(texture2D(coc, v_Texcoord + d.zw)));

    gl_FragColor = encodeFloat(fCoc);
}

@end


// Get max coc tile
@export qtek.compositor.dof.max_coc
uniform sampler2D coc;
varying vec2 v_Texcoord;
uniform vec2 textureSize : [512.0, 512.0];

@import qtek.util.float

void main()
{

    vec4 d = vec4(-1.0, -1.0, 1.0, 1.0) / textureSize.xyxy;

    float fCoc = decodeFloat(texture2D(coc, v_Texcoord + d.xy));
    fCoc = max(fCoc, decodeFloat(texture2D(coc, v_Texcoord + d.zy)));
    fCoc = max(fCoc, decodeFloat(texture2D(coc, v_Texcoord + d.xw)));
    fCoc = max(fCoc, decodeFloat(texture2D(coc, v_Texcoord + d.zw)));

    gl_FragColor = encodeFloat(fCoc);
}

@end




@export qtek.compositor.dof.coc_upsample

#define HIGH_QUALITY

uniform sampler2D coc;
uniform vec2 textureSize : [512, 512];

uniform float sampleScale: 0.5;

varying vec2 v_Texcoord;

@import qtek.util.float

void main()
{

#ifdef HIGH_QUALITY
    // 9-tap bilinear upsampler (tent filter)
    vec4 d = vec4(1.0, 1.0, -1.0, 0.0) / textureSize.xyxy * sampleScale;

    float s;
    s  = decodeFloat(texture2D(coc, v_Texcoord - d.xy));
    s += decodeFloat(texture2D(coc, v_Texcoord - d.wy)) * 2.0;
    s += decodeFloat(texture2D(coc, v_Texcoord - d.zy));

    s += decodeFloat(texture2D(coc, v_Texcoord + d.zw)) * 2.0;
    s += decodeFloat(texture2D(coc, v_Texcoord       )) * 4.0;
    s += decodeFloat(texture2D(coc, v_Texcoord + d.xw)) * 2.0;

    s += decodeFloat(texture2D(coc, v_Texcoord + d.zy));
    s += decodeFloat(texture2D(coc, v_Texcoord + d.wy)) * 2.0;
    s += decodeFloat(texture2D(coc, v_Texcoord + d.xy));

    gl_FragColor = encodeFloat(s / 16.0);
#else
    // 4-tap bilinear upsampler
    vec4 d = vec4(-1.0, -1.0, +1.0, +1.0) / textureSize.xyxy;

    float s;
    s  = decodeFloat(texture2D(coc, v_Texcoord + d.xy));
    s += decodeFloat(texture2D(coc, v_Texcoord + d.zy));
    s += decodeFloat(texture2D(coc, v_Texcoord + d.xw));
    s += decodeFloat(texture2D(coc, v_Texcoord + d.zw));

    gl_FragColor = encodeFloat(s / 4.0);
#endif
}

@end



@export qtek.compositor.dof.upsample

#define HIGH_QUALITY

uniform sampler2D coc;
uniform sampler2D texture;
uniform vec2 textureSize : [512, 512];

uniform float sampleScale: 0.5;

varying vec2 v_Texcoord;


@import qtek.util.rgbm

@import qtek.util.decode_float

float tap(vec2 uv, inout vec4 color, float baseWeight) {
    float weight = abs(decodeFloat(texture2D(coc, uv)) * 2.0 - 1.0) * baseWeight;
    color += decodeHDR(texture2D(texture, uv)) * weight;
    return weight;
}

void main()
{
#ifdef HIGH_QUALITY
    // 9-tap bilinear upsampler (tent filter)
    vec4 d = vec4(1.0, 1.0, -1.0, 0.0) / textureSize.xyxy * sampleScale;

    vec4 color = vec4(0.0);
    float baseWeight = 1.0 / 16.0;
    float w  = tap(v_Texcoord - d.xy, color, baseWeight);
    w += tap(v_Texcoord - d.wy, color, baseWeight * 2.0);
    w += tap(v_Texcoord - d.zy, color, baseWeight);

    w += tap(v_Texcoord + d.zw, color, baseWeight * 2.0);
    w += tap(v_Texcoord       , color, baseWeight * 4.0);
    w += tap(v_Texcoord + d.xw, color, baseWeight * 2.0);

    w += tap(v_Texcoord + d.zy, color, baseWeight);
    w += tap(v_Texcoord + d.wy, color, baseWeight * 2.0);
    w += tap(v_Texcoord + d.xy, color, baseWeight);

    gl_FragColor = encodeHDR(color / w);
#else
    // 4-tap bilinear upsampler
    vec4 d = vec4(-1.0, -1.0, +1.0, +1.0) / textureSize.xyxy;

    vec4 color = vec4(0.0);
    float baseWeight = 1.0 / 4.0;
    float w  = tap(v_Texcoord + d.xy, color, baseWeight);
    w += tap(v_Texcoord + d.zy, color, baseWeight);
    w += tap(v_Texcoord + d.xw, color, baseWeight);
    w += tap(v_Texcoord + d.zw, color, baseWeight);

    gl_FragColor = encodeHDR(color / w);
#endif
}

@end



@export qtek.compositor.dof.downsample

uniform sampler2D texture;
uniform sampler2D coc;
uniform vec2 textureSize : [512, 512];

varying vec2 v_Texcoord;

@import qtek.util.rgbm

@import qtek.util.decode_float

float tap(vec2 uv, inout vec4 color) {
    float weight = abs(decodeFloat(texture2D(coc, uv)) * 2.0 - 1.0) * 0.25;
    color += decodeHDR(texture2D(texture, uv)) * weight;
    return weight;
}

void main()
{
    vec4 d = vec4(-1.0, -1.0, 1.0, 1.0) / textureSize.xyxy;

    vec4 color = vec4(0.0);
    float weight = tap(v_Texcoord + d.xy, color);
    weight += tap(v_Texcoord + d.zy, color);
    weight += tap(v_Texcoord + d.xw, color);
    weight += tap(v_Texcoord + d.zw, color);
    color /= weight;

    gl_FragColor = encodeHDR(color);
}

@end



@export qtek.compositor.dof.hexagonal_blur_frag

@import qtek.util.float


vec4 doBlur(sampler2D targetTexture, vec2 offset) {
#ifdef BLUR_COC
    float cocSum = 0.0;
#else
    vec4 color = vec4(0.0);
#endif

    float weightSum = 0.0;
    float kernelWeight = 1.0 / float(KERNEL_SIZE);

    for (int i = 0; i < KERNEL_SIZE; i++) {
        vec2 coord = v_Texcoord + offset * float(i);

        float w = kernelWeight;
#ifdef BLUR_COC
        float fCoc = decodeFloat(texture2D(targetTexture, coord)) * 2.0 - 1.0;
        // Blur coc in nearfield
        cocSum += clamp(fCoc, -1.0, 0.0) * w;
#else
        float fCoc = decodeFloat(texture2D(coc, coord)) * 2.0 - 1.0;
        vec4 texel = texture2D(targetTexture, coord);
    #if !defined(BLUR_NEARFIELD)
        w *= abs(fCoc);
    #endif
        color += decodeHDR(texel) * w;
#endif

        weightSum += w;
    }
#ifdef BLUR_COC
    return encodeFloat(clamp(cocSum / weightSum, -1.0, 0.0) * 0.5 + 0.5);
#else
    return color / weightSum;
#endif
}

@end


@export qtek.compositor.dof.hexagonal_blur_1

#define KERNEL_SIZE 5

uniform sampler2D texture;
uniform sampler2D coc;
varying vec2 v_Texcoord;

uniform float blurSize : 1.0;

uniform vec2 textureSize : [512.0, 512.0];

@import qtek.util.rgbm

@import qtek.compositor.dof.hexagonal_blur_frag

void main()
{
    vec2 offset = blurSize / textureSize;

#if !defined(BLUR_NEARFIELD) && !defined(BLUR_COC)
    offset *= abs(decodeFloat(texture2D(coc, v_Texcoord)) * 2.0 - 1.0);
#endif

    // TOP
    gl_FragColor = doBlur(texture, vec2(0.0, offset.y));
#if !defined(BLUR_COC)
    gl_FragColor = encodeHDR(gl_FragColor);
#endif
}

@end

@export qtek.compositor.dof.hexagonal_blur_2

#define KERNEL_SIZE 5

uniform sampler2D texture;
uniform sampler2D coc;
varying vec2 v_Texcoord;

uniform float blurSize : 1.0;

uniform vec2 textureSize : [512.0, 512.0];

@import qtek.util.rgbm

@import qtek.compositor.dof.hexagonal_blur_frag

void main()
{
    vec2 offset = blurSize / textureSize;
#if !defined(BLUR_NEARFIELD) && !defined(BLUR_COC)
    offset *= abs(decodeFloat(texture2D(coc, v_Texcoord)) * 2.0 - 1.0);
#endif

    offset.y /= 2.0;

    // BOTTOM LEFT
    gl_FragColor = doBlur(texture, -offset);
#if !defined(BLUR_COC)
    gl_FragColor = encodeHDR(gl_FragColor);
#endif
}
@end

@export qtek.compositor.dof.hexagonal_blur_3

#define KERNEL_SIZE 5

uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D coc;

varying vec2 v_Texcoord;

uniform float blurSize : 1.0;

uniform vec2 textureSize : [512.0, 512.0];

@import qtek.util.rgbm

@import qtek.compositor.dof.hexagonal_blur_frag

void main()
{
    vec2 offset = blurSize / textureSize;

#if !defined(BLUR_NEARFIELD) && !defined(BLUR_COC)
    offset *= abs(decodeFloat(texture2D(coc, v_Texcoord)) * 2.0 - 1.0);
#endif

    offset.y /= 2.0;
    vec2 vDownRight = vec2(offset.x, -offset.y);

    // Down left
    vec4 texel1 = doBlur(texture1, -offset);
    // Down right
    vec4 texel2 = doBlur(texture1, vDownRight);
    // Down right
    vec4 texel3 = doBlur(texture2, vDownRight);

#ifdef BLUR_COC
    float coc1 = decodeFloat(texel1) * 2.0 - 1.0;
    float coc2 = decodeFloat(texel2) * 2.0 - 1.0;
    float coc3 = decodeFloat(texel3) * 2.0 - 1.0;
    gl_FragColor = encodeFloat(
        ((coc1 + coc2 + coc3) / 3.0) * 0.5 + 0.5
    );

#else
    vec4 color = (texel1 + texel2 + texel3) / 3.0;
    gl_FragColor = encodeHDR(color);
#endif
}

@end

@export qtek.compositor.dof.composite

#define DEBUG 0

uniform sampler2D original;
uniform sampler2D blurred;
uniform sampler2D nearfield;
uniform sampler2D coc;
uniform sampler2D nearcoc;
varying vec2 v_Texcoord;

@import qtek.util.rgbm
@import qtek.util.float

void main()
{
    vec4 blurredColor = decodeHDR(texture2D(blurred, v_Texcoord));
    vec4 originalColor = decodeHDR(texture2D(original, v_Texcoord));

    float fCoc = decodeFloat(texture2D(coc, v_Texcoord));

    // FIXME blur after premultiply will have white edge
    // blurredColor.rgb /= max(fCoc, 0.1);
    fCoc = abs(fCoc * 2.0 - 1.0);

    float weight = smoothstep(0.0, 1.0, fCoc);
    // float weight = fCoc;

#ifdef NEARFIELD_ENABLED
    vec4 nearfieldColor = decodeHDR(texture2D(nearfield, v_Texcoord));
    float fNearCoc = decodeFloat(texture2D(nearcoc, v_Texcoord));
    fNearCoc = abs(fNearCoc * 2.0 - 1.0);

    // FIXME
    gl_FragColor = encodeHDR(
        mix(
            nearfieldColor, mix(originalColor, blurredColor, weight),
            // near field blur is too unobvious if use linear blending
            pow(1.0 - fNearCoc, 4.0)
        )
    );
#else
    gl_FragColor = encodeHDR(mix(originalColor, blurredColor, weight));
#endif

#if DEBUG == 1
    // Show coc
    gl_FragColor = vec4(vec3(fCoc), 1.0);
#elif DEBUG == 2
    // Show near coc
    gl_FragColor = vec4(vec3(fNearCoc), 1.0);
#elif DEBUG == 3
    gl_FragColor = encodeHDR(blurredColor);
#elif DEBUG == 4
    // gl_FragColor = vec4(vec3(nearfieldTexel.a), 1.0);
    gl_FragColor = encodeHDR(nearfieldColor);
#endif
}

@end
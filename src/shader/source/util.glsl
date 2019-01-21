
@export clay.util.rand
// // http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
// float rand(vec2 co){
//     return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
// }
// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand(vec2 uv) {
    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
    highp float dt = dot(uv.xy, vec2(a,b)), sn = mod(dt, 3.141592653589793);
    return fract(sin(sn) * c);
}
@end

// Use light attenuation formula in
// http://blog.slindev.com/2011/01/10/natural-light-attenuation/
@export clay.util.calculate_attenuation

uniform float attenuationFactor : 5.0;

float lightAttenuation(float dist, float range)
{
    float attenuation = 1.0;
    attenuation = dist*dist/(range*range+1.0);
    float att_s = attenuationFactor;
    attenuation = 1.0/(attenuation*att_s+1.0);
    att_s = 1.0/(att_s+1.0);
    attenuation = attenuation - att_s;
    attenuation /= 1.0 - att_s;
    return clamp(attenuation, 0.0, 1.0);
}

@end

//http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
@export clay.util.edge_factor

#ifdef SUPPORT_STANDARD_DERIVATIVES
float edgeFactor(float width)
{
    vec3 d = fwidth(v_Barycentric);
    vec3 a3 = smoothstep(vec3(0.0), d * width, v_Barycentric);
    return min(min(a3.x, a3.y), a3.z);
}
#else
float edgeFactor(float width)
{
    return 1.0;
}
#endif

@end

// Pack depth
// !!!! Float value can only be [0.0 - 1.0)
@export clay.util.encode_float
vec4 encodeFloat(const in float depth)
{
    // const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1)
    // const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256.,  256.);
    // const float ShiftRight8 = 1. / 256.;

    // vec4 r = vec4(fract(depth * PackFactors), depth);
    // r.yzw -= r.xyz * ShiftRight8; // tidy overflow
    // return r * PackUpscale;

    const vec4 bitShifts = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
    const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
    vec4 res = fract(depth * bitShifts);
    res -= res.xxyz * bit_mask;

    return res;
}
@end

@export clay.util.decode_float
float decodeFloat(const in vec4 color)
{
    // const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)
    // const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256.,  256.);
    // const vec4 UnpackFactors = UnpackDownscale / vec4(PackFactors, 1.);

    // return dot(color, UnpackFactors);

    const vec4 bitShifts = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
    return dot(color, bitShifts);
}
@end


@export clay.util.float
@import clay.util.encode_float
@import clay.util.decode_float
@end



// http://graphicrants.blogspot.com/2009/04/rgbm-color-encoding.html
@export clay.util.rgbm_decode
vec3 RGBMDecode(vec4 rgbm, float range) {
  return range * rgbm.rgb * rgbm.a;
}
@end

@export clay.util.rgbm_encode
vec4 RGBMEncode(vec3 color, float range) {
    if (dot(color, color) == 0.0) {
        return vec4(0.0);
    }
    vec4 rgbm;
    color /= range;
    rgbm.a = clamp(max(max(color.r, color.g), max(color.b, 1e-6)), 0.0, 1.0);
    rgbm.a = ceil(rgbm.a * 255.0) / 255.0;
    rgbm.rgb = color / rgbm.a;
    return rgbm;
}
@end

@export clay.util.rgbm
@import clay.util.rgbm_decode
@import clay.util.rgbm_encode

vec4 decodeHDR(vec4 color)
{
#if defined(RGBM_DECODE) || defined(RGBM)
    return vec4(RGBMDecode(color, 8.12), 1.0);
#else
    return color;
#endif
}

vec4 encodeHDR(vec4 color)
{
#if defined(RGBM_ENCODE) || defined(RGBM)
    return RGBMEncode(color.xyz, 8.12);
#else
    return color;
#endif
}

@end


@export clay.util.srgb

vec4 sRGBToLinear(in vec4 value) {
    return vec4(mix(pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.w);
}

vec4 linearTosRGB(in vec4 value) {
    return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.w);
}
@end


@export clay.chunk.skinning_header
#ifdef SKINNING
attribute vec3 weight : WEIGHT;
attribute vec4 joint : JOINT;

#ifdef USE_SKIN_MATRICES_TEXTURE
uniform sampler2D skinMatricesTexture : ignore;
uniform float skinMatricesTextureSize: ignore;
mat4 getSkinMatrix(sampler2D tex, float idx) {
    float j = idx * 4.0;
    float x = mod(j, skinMatricesTextureSize);
    float y = floor(j / skinMatricesTextureSize) + 0.5;
    vec2 scale = vec2(skinMatricesTextureSize);

    return mat4(
        texture2D(tex, vec2(x + 0.5, y) / scale),
        texture2D(tex, vec2(x + 1.5, y) / scale),
        texture2D(tex, vec2(x + 2.5, y) / scale),
        texture2D(tex, vec2(x + 3.5, y) / scale)
    );
}
mat4 getSkinMatrix(float idx) {
    return getSkinMatrix(skinMatricesTexture, idx);
}
#else
uniform mat4 skinMatrix[JOINT_COUNT] : SKIN_MATRIX;
mat4 getSkinMatrix(float idx) {
    return skinMatrix[int(idx)];
}
#endif

#endif

@end

@export clay.chunk.skin_matrix

// Weighted Sum Skinning Matrix
// PENDING Must be assigned.
mat4 skinMatrixWS = getSkinMatrix(joint.x) * weight.x;
if (weight.y > 1e-4)
{
    skinMatrixWS += getSkinMatrix(joint.y) * weight.y;
}
if (weight.z > 1e-4)
{
    skinMatrixWS += getSkinMatrix(joint.z) * weight.z;
}
float weightW = 1.0-weight.x-weight.y-weight.z;
if (weightW > 1e-4)
{
    skinMatrixWS += getSkinMatrix(joint.w) * weightW;
}
@end

@export clay.chunk.instancing_header
#ifdef INSTANCING
attribute vec4 instanceMat1;
attribute vec4 instanceMat2;
attribute vec4 instanceMat3;
#endif
@end

@export clay.chunk.instancing_matrix
mat4 instanceMat = mat4(
    vec4(instanceMat1.xyz, 0.0),
    vec4(instanceMat2.xyz, 0.0),
    vec4(instanceMat3.xyz, 0.0),
    vec4(instanceMat1.w, instanceMat2.w, instanceMat3.w, 1.0)
);
@end



@export clay.util.parallax_correct

// https://seblagarde.wordpress.com/2012/09/29/image-based-lighting-approaches-and-parallax-corrected-cubemap/
vec3 parallaxCorrect(in vec3 dir, in vec3 pos, in vec3 boxMin, in vec3 boxMax) {
    // Find ray box intersect point using slab method
    // https://tavianator.com/fast-branchless-raybounding-box-intersections/
    vec3 first = (boxMax - pos) / dir;
    vec3 second = (boxMin - pos) / dir;

    vec3 further = max(first, second);
    float dist = min(further.x, min(further.y, further.z));

    vec3 fixedPos = pos + dir * dist;
    vec3 boxCenter = (boxMax + boxMin) * 0.5;

    return normalize(fixedPos - boxCenter);
}

@end



@export clay.util.clamp_sample
// Sample with stereo clamp
vec4 clampSample(const in sampler2D texture, const in vec2 coord)
{
#ifdef STEREO
    // Left is 0.0 - 0.5, Right is 0.5 - 1.0, avoid leaking
    // FIXME fetch with linear filtering will still have leak!
    float eye = step(0.5, coord.x) * 0.5;
    vec2 coordClamped = clamp(coord, vec2(eye, 0.0), vec2(0.5 + eye, 1.0));
#else
    vec2 coordClamped = clamp(coord, vec2(0.0), vec2(1.0));
#endif
    return texture2D(texture, coordClamped);
}
@end

@export clay.util.ACES
vec3 ACESToneMapping(vec3 color)
{
    const float A = 2.51;
    const float B = 0.03;
    const float C = 2.43;
    const float D = 0.59;
    const float E = 0.14;
    return (color * (A * color + B)) / (color * (C * color + D) + E);
}
@end
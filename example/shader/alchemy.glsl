@export alchemy.fragment

#define VARIATION 1

#define KERNEL_SIZE 11

// Normal and glossiness
uniform sampler2D gBufferTexture1;
// Depth
uniform sampler2D gBufferTexture2;

uniform sampler2D noiseTex;

uniform vec2 textureSize;

uniform vec2 noiseTexSize;

uniform mat4 projection;

uniform mat4 projectionInv;

uniform mat4 viewInverseTranspose;

uniform vec2 kernel[KERNEL_SIZE];

uniform float radius : 1.5;

uniform float scale: 1;

uniform float power: 1;

uniform float bias: 5e-4;

uniform float epsilon: 0.01;

varying vec2 v_Texcoord;

#ifdef DEPTH_DECODE
@import clay.util.decode_float
#endif

@import clay.util.rand

float ssaoEstimator(mat2 kernelBasis, vec2 sOrigin, vec3 cOrigin, vec3 cN, float sRadius) {
    float occlusion = 0.0;

    // Hash function used in the HPG12 AlchemyAO paper
    // float randomAngle = (3 * gl_FragCoord.x ^ gl_FragCoord.y + gl_FragCoord.x * gl_FragCoord.y) * 10;

    // float randomAngle = rand(v_Texcoord);

    for (int i = 0; i < KERNEL_SIZE; i++) {
        vec2 dir = kernelBasis * kernel[i];
        vec2 uv = dir * sRadius + sOrigin;
        // float alpha = (float(i) + 0.5) / float(KERNEL_SIZE);
        // float angle = alpha * (float(NUM_SPIRAL_TURNS) * 6.28) + randomAngle;
        // vec2 uv = vec2(cos(angle), sin(angle)) * alpha * sRadius + sOrigin;

        // Ignore sampling outside
        if (uv.x > 1.0 || uv.x < 0.0 || uv.y > 1.0 || uv.y < 0.0) {
            continue;
        }

        vec4 depthTexel = texture2D(gBufferTexture2, uv);
#ifdef DEPTH_DECODE
        float z = decodeFloat(depthTexel) * 2.0 - 1.0;
#else
        float z = depthTexel.r * 2.0 - 1.0;
#endif

        vec4 projectedPos = vec4(uv * 2.0 - 1.0, z, 1.0);
        vec4 p4 = projectionInv * projectedPos;

        vec3 cPos = p4.xyz / p4.w;

        vec3 cDir = cPos - cOrigin;

        float vv = dot(cDir, cDir);
        float vn = dot(cDir, cN);

        float radius2 = radius * radius;

        vn = max(vn + p4.z * bias, 0.0);
#if VARIATION == 0

          // (from the HPG12 paper)
          // Note large epsilon to avoid overdarkening within cracks
          occlusion += float(vv < radius2) * max(vn / (epsilon + vv), 0.0);

#elif VARIATION == 1 // default / recommended

          // Smoother transition to zero (lowers contrast, smoothing out corners). [Recommended]
          float f = max(radius2 - vv, 0.0) / radius2;
          occlusion += f * f * f * max(vn / (epsilon + vv), 0.0);

#elif VARIATION == 2

          // Medium contrast (which looks better at high radii), no division.  Note that the
          // contribution still falls off with radius^2, but we've adjusted the rate in a way that is
          // more computationally efficient and happens to be aesthetically pleasing.
          float invRadius2 = 1.0 / radius2;
          occlusion += 4.0 * max(1.0 - vv * invRadius2, 0.0) * max(vn, 0.0);

#else

          // Low contrast, no division operation
          occlusion += 2.0 * float(vv < radius2) * max(vn, 0.0);
#endif

        // Estimator from original alchemy paper
        // occlusion += max(0.0, dot(cDir, cN) + bias * cPos.z) / (dot(cDir, cDir) + 1e-1) * step(length(cDir), radius);
    }
    occlusion = max(1.0 - 2.0 * scale * occlusion / float(KERNEL_SIZE), 0.0);

    return pow(occlusion, power);
}

void main()
{
    vec4 tex = texture2D(gBufferTexture1, v_Texcoord);

    // Is empty
    if (dot(tex.rgb, vec3(1.0)) == 0.0) {
        discard;
    }

    vec3 N = tex.rgb * 2.0 - 1.0;

    // Convert to view space
    N = (viewInverseTranspose * vec4(N, 0.0)).xyz;

    vec4 depthTexel = texture2D(gBufferTexture2, v_Texcoord);
#ifdef DEPTH_DECODE
    depthTexel.rgb /= depthTexel.a;
    float z = decodeFloat(depthTexel) * 2.0 - 1.0;
#else
    float z = depthTexel.r * 2.0 - 1.0;
#endif

    vec4 projectedPos = vec4(v_Texcoord * 2.0 - 1.0, z, 1.0);
    vec4 p4 = projectionInv * projectedPos;

    vec3 cOrigin = p4.xyz / p4.w;

    // Screen radius on height
    float sRadius = radius / (-cOrigin.z / projection[0][0]);

    // Use 4x4 noise texture instead of completely random can reduce noise problem after filtering
    // http://www.gamedev.net/topic/648090-alchemy-ambient-occlusion/#entry5096131
    vec2 noiseTexCoord = textureSize / vec2(noiseTexSize) * v_Texcoord;
    vec2 rvec = normalize(texture2D(noiseTex, noiseTexCoord).rg * 2.0 - 1.0);

    mat2 kernelBasis = mat2(
        rvec, vec2(-rvec.y, rvec.x)
    );

    gl_FragColor = vec4(vec3(ssaoEstimator(kernelBasis, v_Texcoord, cOrigin, N, sRadius)), 1.0);

    // gl_FragColor = vec4(rvec, 0.0, 1.0);
}

@end





@export alchemy.blur_h

uniform sampler2D colorTex;
uniform sampler2D depthTex;

varying vec2 v_Texcoord;

uniform vec2 textureSize;
uniform float blurSize : 1.0;
uniform float edgeSharpness: 1.0;

void main()
{
    @import clay.compositor.kernel.gaussian_13

    vec4 centerDepthTexel = texture2D(depthTex, v_Texcoord);

    float off = blurSize / textureSize.x;
    vec2 coord = v_Texcoord;

    vec4 sum = vec4(0.0);
    float weightAll = 0.0;

    float centerDepth = centerDepthTexel.r;
    for (int i = 0; i < 13; i++) {
        vec2 coord = vec2(clamp(v_Texcoord.x + (float(i) - 6.0) * off, 0.0, 1.0), v_Texcoord.y);
        // Use depth in bilateral filter instead normal.
        // Use normal will cause jitter in the corner.
        float w = gaussianKernel[i] * max(0.0, 1.0 - edgeSharpness * 1000.0 * abs(centerDepth - texture2D(depthTex, coord).r));
        weightAll += w;
        sum += texture2D(colorTex, coord) * w;
    }

    gl_FragColor = sum / weightAll;
}

@end

@export alchemy.blur_v

uniform sampler2D colorTex;
uniform sampler2D depthTex;

varying vec2 v_Texcoord;

uniform vec2 textureSize;
uniform float blurSize : 1.0;

uniform float edgeSharpness: 1.0;

void main()
{
    @import clay.compositor.kernel.gaussian_13

    vec4 centerDepthTexel = texture2D(depthTex, v_Texcoord);
    // Add 0.1000 bias to filling holes from missed rays.
    float off = blurSize / textureSize.y;
    vec2 coord = v_Texcoord;

    vec4 sum = vec4(0.0);
    float weightAll = 0.0;

    float centerDepth = centerDepthTexel.r;

    for (int i = 0; i < 13; i++) {
        vec2 coord = vec2(v_Texcoord.x, clamp(v_Texcoord.y + (float(i) - 6.0) * off, 0.0, 1.0));
        float w = gaussianKernel[i] * max(0.0, 1.0 - edgeSharpness * 1000.0 * abs(centerDepth - texture2D(depthTex, coord).r));
        weightAll += w;
        sum += texture2D(colorTex, coord) * w;
    }

   gl_FragColor = sum / weightAll;
}

@end
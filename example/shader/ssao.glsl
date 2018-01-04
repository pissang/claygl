@export ssao.fragment

uniform sampler2D gBufferTex;
uniform sampler2D depthTex;

uniform sampler2D noiseTex;

uniform vec2 gBufferTexSize;

uniform vec2 noiseTexSize;

uniform mat4 projection;

uniform mat4 projectionInv;

uniform mat4 viewInverseTranspose;

uniform vec3 kernel[KERNEL_SIZE];

uniform float radius : 1.5;

uniform float power : 2;

uniform float bias: 1e-4;

varying vec2 v_Texcoord;

#ifdef DEPTH_ENCODED
@import clay.util.decode_float
#endif

vec3 ssaoEstimator(in mat3 kernelBasis, in vec3 originPos) {
    float occlusion = 0.0;

    for (int i = 0; i < KERNEL_SIZE; i++) {
        vec3 samplePos = kernelBasis * kernel[i];
        samplePos = samplePos * radius + originPos;

        vec4 texCoord = projection * vec4(samplePos, 1.0);
        texCoord.xy /= texCoord.w;

        vec4 depthTexel = texture2D(depthTex, texCoord.xy * 0.5 + 0.5);
#ifdef DEPTH_ENCODED
        depthTexel.rgb /= depthTexel.a;
        float sampleDepth = decodeFloat(depthTexel) * 2.0 - 1.0;
#else
        float sampleDepth = depthTexel.r * 2.0 - 1.0;
#endif

        sampleDepth = projection[3][2] / (sampleDepth * projection[2][3] - projection[2][2]);

        float rangeCheck = smoothstep(0.0, 1.0, radius / abs(originPos.z - sampleDepth));
        occlusion += rangeCheck * step(samplePos.z, sampleDepth - bias);
    }
    occlusion = 1.0 - occlusion / float(KERNEL_SIZE);
    return vec3(pow(occlusion, power));
}

void main()
{
    vec4 tex = texture2D(gBufferTex, v_Texcoord);

    // Is empty
    if (dot(tex.rgb, vec3(1.0)) == 0.0) {
        discard;
    }

    vec3 N = tex.rgb * 2.0 - 1.0;

    // Convert to view space
    N = (viewInverseTranspose * vec4(N, 0.0)).xyz;


    vec4 depthTexel = texture2D(depthTex, v_Texcoord);
#ifdef DEPTH_ENCODED
    depthTexel.rgb /= depthTexel.a;
    float z = decodeFloat(depthTexel) * 2.0 - 1.0;
#else
    float z = depthTexel.r * 2.0 - 1.0;
#endif

    vec4 projectedPos = vec4(v_Texcoord * 2.0 - 1.0, z, 1.0);
    vec4 p4 = projectionInv * projectedPos;

    vec3 position = p4.xyz / p4.w;

    vec2 noiseTexCoord = gBufferTexSize / vec2(noiseTexSize) * v_Texcoord;
    vec3 rvec = texture2D(noiseTex, noiseTexCoord).rgb * 2.0 - 1.0;

    // Tangent
    vec3 T = normalize(rvec - N * dot(rvec, N));
    // Bitangent
    vec3 BT = normalize(cross(N, T));
    mat3 kernelBasis = mat3(T, BT, N);

    gl_FragColor = vec4(vec3(ssaoEstimator(kernelBasis, position)), 1.0);
}

@end


@export ssao.blur.fragment

uniform sampler2D texture;

uniform vec2 textureSize;

varying vec2 v_Texcoord;

void main ()
{

    vec2 texelSize = 1.0 / textureSize;

    vec4 color = vec4(0.0);
    vec2 hlim = vec2(float(-BLUR_SIZE) * 0.5 + 0.5);
    vec4 centerColor = texture2D(texture, v_Texcoord);
    float weightAll = 0.0;
    float boxWeight = 1.0 / float(BLUR_SIZE) * float(BLUR_SIZE);
    for (int x = 0; x < BLUR_SIZE; x++) {
        for (int y = 0; y < BLUR_SIZE; y++) {
            vec2 coord = (vec2(float(x), float(y)) + hlim) * texelSize + v_Texcoord;
            vec4 sample = texture2D(texture, coord);
            // http://stackoverflow.com/questions/6538310/anyone-know-where-i-can-find-a-glsl-implementation-of-a-bilateral-filter-blur
            // PENDING
            float closeness = 1.0 - distance(sample, centerColor) / sqrt(3.0);
            float weight = boxWeight * closeness;
            color += weight * sample;
            weightAll += weight;
        }
    }

    gl_FragColor = color / weightAll;
}
@end
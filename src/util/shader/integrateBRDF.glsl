#define SAMPLE_NUMBER 1024
#define PI 3.14159265358979


uniform sampler2D normalDistribution;

uniform vec2 viewportSize : [512, 256];

const vec3 N = vec3(0.0, 0.0, 1.0);
const float fSampleNumber = float(SAMPLE_NUMBER);

vec3 importanceSampleNormal(float i, float roughness, vec3 N) {
    vec3 H = texture2D(normalDistribution, vec2(roughness, i)).rgb;

    vec3 upVector = abs(N.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 tangentX = normalize(cross(N, upVector));
    vec3 tangentZ = cross(N, tangentX);
    // Tangent to world space
    return normalize(tangentX * H.x + N * H.y + tangentZ * H.z);
}

float G_Smith(float roughness, float NoV, float NoL) {
    // float k = (roughness+1.0) * (roughness+1.0) * 0.125;
    float k = roughness * roughness / 2.0;
    float G1V = NoV / (NoV * (1.0 - k) + k);
    float G1L = NoL / (NoL * (1.0 - k) + k);
    return G1L * G1V;
}

void main() {
    vec2 uv = gl_FragCoord.xy / viewportSize;
    float NoV = uv.x;
    float roughness = uv.y;

    vec3 V;
    V.x = sqrt(1.0 - NoV * NoV);
    V.y = 0.0;
    V.z = NoV;

    float A = 0.0;
    float B = 0.0;

    for (int i = 0; i < SAMPLE_NUMBER; i++) {
        vec3 H = importanceSampleNormal(float(i) / fSampleNumber, roughness, N);
        vec3 L = reflect(-V, H);
        float NoL = clamp(L.z, 0.0, 1.0);
        float NoH = clamp(H.z, 0.0, 1.0);
        float VoH = clamp(dot(V, H), 0.0, 1.0);

        if (NoL > 0.0) {
            float G = G_Smith(roughness, NoV, NoL);
            float G_Vis = G * VoH / (NoH * NoV);
            float Fc = pow(1.0 - VoH, 5.0);
            A += (1.0 - Fc) * G_Vis;
            B += Fc * G_Vis;
        }
    }

    gl_FragColor = vec4(vec2(A, B) / fSampleNumber, 0.0, 1.0);
}

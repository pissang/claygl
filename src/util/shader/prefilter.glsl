#define SAMPLE_NUMBER 1024
#define PI 3.14159265358979

uniform mat4 viewInverse : VIEWINVERSE;
uniform samplerCube environmentMap;
uniform sampler2D normalDistribution;

uniform float roughness : 0.5;

varying vec2 v_Texcoord;
varying vec3 v_WorldPosition;

const float fSampleNumber = float(SAMPLE_NUMBER);

@import qtek.util.rgbm

vec3 importanceSampleNormal(float i, float roughness, vec3 N) {
    vec3 H = texture2D(normalDistribution, vec2(roughness, i)).rgb;

    vec3 upVector = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangentX = normalize(cross(upVector, N));
    vec3 tangentY = cross(N, tangentX);
    // Tangent to world space
    return tangentX * H.x + tangentY * H.y + N * H.z;
}

void main() {

    vec3 eyePos = viewInverse[3].xyz;
    vec3 V = normalize(v_WorldPosition - eyePos);

    vec3 N = V;
    vec3 R = V;

    vec3 prefilteredColor = vec3(0.0);
    float totalWeight = 0.0;


    for (int i = 0; i < SAMPLE_NUMBER; i++) {
        vec3 H = importanceSampleNormal(float(i) / fSampleNumber, roughness, N);
        vec3 L = reflect(-V, H);

        float NoL = clamp(dot(N, L), 0.0, 1.0);
        if (NoL > 0.0) {
            prefilteredColor += decodeHDR(textureCube(environmentMap, L)).rgb * NoL;
            totalWeight += NoL;
        }
    }

    gl_FragColor = encodeHDR(vec4(prefilteredColor / totalWeight, 1.0));
}

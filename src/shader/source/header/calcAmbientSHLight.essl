vec3 calcAmbientSHLight(int idx, vec3 N) {
    int offset = 9 * idx;

    // FIXME Index expression must be constant
    return ambientSHLightCoefficients[0]
        + ambientSHLightCoefficients[1] * N.x
        + ambientSHLightCoefficients[2] * N.y
        + ambientSHLightCoefficients[3] * N.z
        + ambientSHLightCoefficients[4] * N.x * N.z
        + ambientSHLightCoefficients[5] * N.z * N.y
        + ambientSHLightCoefficients[6] * N.y * N.x
        + ambientSHLightCoefficients[7] * (3.0 * N.z * N.z - 1.0)
        + ambientSHLightCoefficients[8] * (N.x * N.x - N.y * N.y);
}
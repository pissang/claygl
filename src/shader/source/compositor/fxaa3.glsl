// https://github.com/pyalot/webgl-deferred-irradiance-volumes/blob/master/src/antialias/fxaa3_11_preprocessed.shaderlib
@export clay.compositor.fxaa3

uniform sampler2D texture;
uniform vec4 viewport : VIEWPORT;

uniform float subpixel: 0.75;
uniform float edgeThreshold: 0.125;
uniform float edgeThresholdMin: 0.0625;


varying vec2 v_Texcoord;

@import clay.util.rgbm

float FxaaLuma(vec4 rgba) { return rgba.y; }
vec4 FxaaPixelShader(
    vec2 pos
    ,sampler2D tex
    ,vec2 fxaaQualityRcpFrame
    ,float fxaaQualitySubpix
    ,float fxaaQualityEdgeThreshold
    ,float fxaaQualityEdgeThresholdMin
) {
    vec2 posM;
    posM.x = pos.x;
    posM.y = pos.y;
    vec4 rgbyM = decodeHDR(texture2D(texture, posM, 0.0));
    float lumaS = FxaaLuma(decodeHDR(texture2D(texture, posM + (vec2( 0.0, 1.0) * fxaaQualityRcpFrame.xy), 0.0)));
    float lumaE = FxaaLuma(decodeHDR(texture2D(texture, posM + (vec2( 1.0, 0.0) * fxaaQualityRcpFrame.xy), 0.0)));
    float lumaN = FxaaLuma(decodeHDR(texture2D(texture, posM + (vec2( 0.0,-1.0) * fxaaQualityRcpFrame.xy), 0.0)));
    float lumaW = FxaaLuma(decodeHDR(texture2D(texture, posM + (vec2(-1.0, 0.0) * fxaaQualityRcpFrame.xy), 0.0)));

    float maxSM = max(lumaS, rgbyM.y);
    float minSM = min(lumaS, rgbyM.y);
    float maxESM = max(lumaE, maxSM);
    float minESM = min(lumaE, minSM);
    float maxWN = max(lumaN, lumaW);
    float minWN = min(lumaN, lumaW);
    float rangeMax = max(maxWN, maxESM);
    float rangeMin = min(minWN, minESM);
    float rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;
    float range = rangeMax - rangeMin;
    float rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);
    bool earlyExit = range < rangeMaxClamped;
    if(earlyExit) return rgbyM;
    float lumaNW = FxaaLuma(decodeHDR(texture2D(texture, posM + (vec2(-1.0,-1.0) * fxaaQualityRcpFrame.xy), 0.0)));
    float lumaSE = FxaaLuma(decodeHDR(texture2D(texture, posM + (vec2( 1.0, 1.0) * fxaaQualityRcpFrame.xy), 0.0)));
    float lumaNE = FxaaLuma(decodeHDR(texture2D(texture, posM + (vec2( 1.0,-1.0) * fxaaQualityRcpFrame.xy), 0.0)));
    float lumaSW = FxaaLuma(decodeHDR(texture2D(texture, posM + (vec2(-1.0, 1.0) * fxaaQualityRcpFrame.xy), 0.0)));

    float lumaNS = lumaN + lumaS;
    float lumaWE = lumaW + lumaE;
    float subpixRcpRange = 1.0/range;
    float subpixNSWE = lumaNS + lumaWE;
    float edgeHorz1 = (-2.0 * rgbyM.y) + lumaNS;
    float edgeVert1 = (-2.0 * rgbyM.y) + lumaWE;
    float lumaNESE = lumaNE + lumaSE;
    float lumaNWNE = lumaNW + lumaNE;
    float edgeHorz2 = (-2.0 * lumaE) + lumaNESE;
    float edgeVert2 = (-2.0 * lumaN) + lumaNWNE;
    float lumaNWSW = lumaNW + lumaSW;
    float lumaSWSE = lumaSW + lumaSE;
    float edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);
    float edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);
    float edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;
    float edgeVert3 = (-2.0 * lumaS) + lumaSWSE;
    float edgeHorz = abs(edgeHorz3) + edgeHorz4;
    float edgeVert = abs(edgeVert3) + edgeVert4;
    float subpixNWSWNESE = lumaNWSW + lumaNESE;
    float lengthSign = fxaaQualityRcpFrame.x;
    bool horzSpan = edgeHorz >= edgeVert;
    float subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;
    if(!horzSpan) lumaN = lumaW;
    if(!horzSpan) lumaS = lumaE;
    if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;
    float subpixB = (subpixA * (1.0/12.0)) - rgbyM.y;
    float gradientN = lumaN - rgbyM.y;
    float gradientS = lumaS - rgbyM.y;
    float lumaNN = lumaN + rgbyM.y;
    float lumaSS = lumaS + rgbyM.y;
    bool pairN = abs(gradientN) >= abs(gradientS);
    float gradient = max(abs(gradientN), abs(gradientS));
    if(pairN) lengthSign = -lengthSign;
    float subpixC = clamp(abs(subpixB) * subpixRcpRange, 0.0, 1.0);
    vec2 posB;
    posB.x = posM.x;
    posB.y = posM.y;
    vec2 offNP;
    offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;
    offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;
    if(!horzSpan) posB.x += lengthSign * 0.5;
    if( horzSpan) posB.y += lengthSign * 0.5;
    vec2 posN;
    posN.x = posB.x - offNP.x * 1.0;
    posN.y = posB.y - offNP.y * 1.0;
    vec2 posP;
    posP.x = posB.x + offNP.x * 1.0;
    posP.y = posB.y + offNP.y * 1.0;
    float subpixD = ((-2.0)*subpixC) + 3.0;
    float lumaEndN = FxaaLuma(decodeHDR(texture2D(texture, posN, 0.0)));
    float subpixE = subpixC * subpixC;
    float lumaEndP = FxaaLuma(decodeHDR(texture2D(texture, posP, 0.0)));
    if(!pairN) lumaNN = lumaSS;
    float gradientScaled = gradient * 1.0/4.0;
    float lumaMM = rgbyM.y - lumaNN * 0.5;
    float subpixF = subpixD * subpixE;
    bool lumaMLTZero = lumaMM < 0.0;
    lumaEndN -= lumaNN * 0.5;
    lumaEndP -= lumaNN * 0.5;
    bool doneN = abs(lumaEndN) >= gradientScaled;
    bool doneP = abs(lumaEndP) >= gradientScaled;
    if(!doneN) posN.x -= offNP.x * 1.5;
    if(!doneN) posN.y -= offNP.y * 1.5;
    bool doneNP = (!doneN) || (!doneP);
    if(!doneP) posP.x += offNP.x * 1.5;
    if(!doneP) posP.y += offNP.y * 1.5;
    if(doneNP) {
        if(!doneN) lumaEndN = FxaaLuma(decodeHDR(texture2D(texture, posN.xy, 0.0)));
        if(!doneP) lumaEndP = FxaaLuma(decodeHDR(texture2D(texture, posP.xy, 0.0)));
        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
        doneN = abs(lumaEndN) >= gradientScaled;
        doneP = abs(lumaEndP) >= gradientScaled;
        if(!doneN) posN.x -= offNP.x * 2.0;
        if(!doneN) posN.y -= offNP.y * 2.0;
        doneNP = (!doneN) || (!doneP);
        if(!doneP) posP.x += offNP.x * 2.0;
        if(!doneP) posP.y += offNP.y * 2.0;

        if(doneNP) {
            if(!doneN) lumaEndN = FxaaLuma(decodeHDR(texture2D(texture, posN.xy, 0.0)));
            if(!doneP) lumaEndP = FxaaLuma(decodeHDR(texture2D(texture, posP.xy, 0.0)));
            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
            doneN = abs(lumaEndN) >= gradientScaled;
            doneP = abs(lumaEndP) >= gradientScaled;
            if(!doneN) posN.x -= offNP.x * 4.0;
            if(!doneN) posN.y -= offNP.y * 4.0;
            doneNP = (!doneN) || (!doneP);
            if(!doneP) posP.x += offNP.x * 4.0;
            if(!doneP) posP.y += offNP.y * 4.0;

            if(doneNP) {
                if(!doneN) lumaEndN = FxaaLuma(decodeHDR(texture2D(texture, posN.xy, 0.0)));
                if(!doneP) lumaEndP = FxaaLuma(decodeHDR(texture2D(texture, posP.xy, 0.0)));
                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                doneN = abs(lumaEndN) >= gradientScaled;
                doneP = abs(lumaEndP) >= gradientScaled;
                if(!doneN) posN.x -= offNP.x * 12.0;
                if(!doneN) posN.y -= offNP.y * 12.0;
                doneNP = (!doneN) || (!doneP);
                if(!doneP) posP.x += offNP.x * 12.0;
                if(!doneP) posP.y += offNP.y * 12.0;
            }
        }
    }
    float dstN = posM.x - posN.x;
    float dstP = posP.x - posM.x;
    if(!horzSpan) dstN = posM.y - posN.y;
    if(!horzSpan) dstP = posP.y - posM.y;
    bool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
    float spanLength = (dstP + dstN);
    bool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
    float spanLengthRcp = 1.0/spanLength;
    bool directionN = dstN < dstP;
    float dst = min(dstN, dstP);
    bool goodSpan = directionN ? goodSpanN : goodSpanP;
    float subpixG = subpixF * subpixF;
    float pixelOffset = (dst * (-spanLengthRcp)) + 0.5;
    float subpixH = subpixG * fxaaQualitySubpix;
    float pixelOffsetGood = goodSpan ? pixelOffset : 0.0;
    float pixelOffsetSubpix = max(pixelOffsetGood, subpixH);
    if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;
    if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;
    return vec4(decodeHDR(texture2D(texture, posM, 0.0)).xyz, rgbyM.y);

}

void main()
{
    vec4 color = FxaaPixelShader(
        v_Texcoord,
        texture,
        vec2(1.0) / viewport.zw,
        subpixel,
        edgeThreshold,
        edgeThresholdMin
    );
    gl_FragColor = vec4(color.rgb, 1.0);
}
@end
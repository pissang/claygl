// https://github.com/pyalot/webgl-deferred-irradiance-volumes/blob/master/src/illumination/harmonics.shader
uniform samplerCube environmentMap;

varying vec2 v_Texcoord;

#define TEXTURE_SIZE 16

mat3 front = mat3(
     1.0,  0.0,  0.0,
     0.0,  1.0,  0.0,
     0.0,  0.0,  1.0
);

mat3 back = mat3(
    -1.0,  0.0,  0.0,
     0.0,  1.0,  0.0,
     0.0,  0.0, -1.0
);

mat3 left = mat3(
     0.0,  0.0, -1.0,
     0.0,  1.0,  0.0,
     1.0,  0.0,  0.0
);

mat3 right = mat3(
     0.0,  0.0,  1.0,
     0.0,  1.0,  0.0,
    -1.0,  0.0,  0.0
);

mat3 up = mat3(
     1.0,  0.0,  0.0,
     0.0,  0.0,  1.0,
     0.0, -1.0,  0.0
);

mat3 down = mat3(
     1.0,  0.0,  0.0,
     0.0,  0.0, -1.0,
     0.0,  1.0,  0.0
);


float harmonics(vec3 normal){
    int index = int(gl_FragCoord.x);

    float x = normal.x;
    float y = normal.y;
    float z = normal.z;

    if(index==0){
        return 1.0;
    }
    else if(index==1){
        return x;
    }
    else if(index==2){
        return y;
    }
    else if(index==3){
        return z;
    }
    else if(index==4){
        return x*z;
    }
    else if(index==5){
        return y*z;
    }
    else if(index==6){
        return x*y;
    }
    else if(index==7){
        return 3.0*z*z - 1.0;
    }
    else{
        return x*x - y*y;
    }
}

vec3 sampleSide(mat3 rot)
{

    vec3 result = vec3(0.0);
    float divider = 0.0;
    for (int i = 0; i < TEXTURE_SIZE * TEXTURE_SIZE; i++) {
        float x = mod(float(i), float(TEXTURE_SIZE));
        float y = float(i / TEXTURE_SIZE);

        vec2 sidecoord = ((vec2(x, y) + vec2(0.5, 0.5)) / vec2(TEXTURE_SIZE)) * 2.0 - 1.0;
        vec3 normal = normalize(vec3(sidecoord, -1.0));
        vec3 fetchNormal = rot * normal;
        vec3 texel = textureCube(environmentMap, fetchNormal).rgb;

        // -normal.z equals cos(theta) of Lambertian
        result += harmonics(fetchNormal) * texel * -normal.z;

        divider += -normal.z;
    }

    return result / divider;
}

void main()
{
    vec3 result = (
        sampleSide(front) +
        sampleSide(back) +
        sampleSide(left) +
        sampleSide(right) +
        sampleSide(up) +
        sampleSide(down)
    ) / 6.0;
    gl_FragColor = vec4(result, 1.0);
}
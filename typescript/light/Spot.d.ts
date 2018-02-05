import { Light, ILightOption } from '../Light';

interface ISpotLightOption extends ILightOption {
    range?: number;
    umbraAngle?: number;
    penumbraAngle?: number;
    falloffFactor?: number;

    shadowBias?: number;
    shadowSlopeScale?: number;
}

export class Spot extends Light {

    constructor(option?: ISpotLightOption);

    range: number;

    umbraAngle: number;

    penumbraAngle: number;

    falloffFactor: number;

    shadowBias: number;

    shadowSlopeScale: number;

    type: 'SPOT_LIGHT';

    // uniformTemplates : {

    //     spotLightPosition: ILightUniformTemplate<number[]>;

    //     spotLightRange: ILightUniformTemplate<number>;

    //     spotLightUmbraAngleCosine: ILightUniformTemplate<number>;

    //     spotLightPenumbraAngleCosine: ILightUniformTemplate<number>;

    //     spotLightFalloffFactor: ILightUniformTemplate<number>;

    //     spotLightDirection: ILightUniformTemplate<number[]>;

    //     spotLightColor: ILightUniformTemplate<number[]>;
    // }
}
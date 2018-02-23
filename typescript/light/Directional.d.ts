import { Light, ILightOption } from '../Light';

interface IDirectionalLightOption extends ILightOption {
    shadowBias?: number;
    shadowSlopeScale?: number;
}

export class Directional extends Light {

    constructor(option?: IDirectionalLightOption);

    type: 'DIRECTIONAL_LIGHT';

    range: number;

    shadowBias: number;

    shadowSlopeScale: number;

    shadowCascade: number;

    cascadeSplitLogFactor: number;

    // uniformTemplates : {

    //     directionalLightColor: ILightUniformTemplate<number[]>;

    //     directionalLightDirection: ILightUniformTemplate<number[]>;
    // }
}
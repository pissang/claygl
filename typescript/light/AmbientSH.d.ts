import { Light, ILightOption } from '../Light';

interface IAmbientLightOption extends ILightOption {
    coefficients?: number[];
}

export class AmbientSH extends Light {

    constructor(option?: IAmbientLightOption);

    castShadow: false;

    type: 'AMBIENT_SH_LIGHT';

    coefficients: number[];
}
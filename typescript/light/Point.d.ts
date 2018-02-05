import { Light, ILightOption } from '../Light';

interface IPointLightOption extends ILightOption {
    range?: number;
}

export class Point extends Light {

    constructor(option?: IPointLightOption);

    type: 'POINT_LIGHT';

    range: number;

    // uniformTemplates : {

    //     pointLightColor: ILightUniformTemplate<number[]>;

    //     pointLightRange: ILightUniformTemplate<number>;

    //     pointLightPosition: ILightUniformTemplate<number[]>;
    // }
}
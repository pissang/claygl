import { Light, ILightOption } from '../Light';

interface IAmbientLightOption extends ILightOption {}

export class Ambient extends Light {

    constructor(option?: IAmbientLightOption);

    type: 'AMBIENT_LIGHT';

    castShadow: false;

    // uniformTemplates : {

    //     ambientLightColor: ILightUniformTemplate<number[]>;

    // }
}
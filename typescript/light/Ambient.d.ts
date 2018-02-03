import { Light, ILightOption } from '../Light';

interface IAmbientLightOption extends ILightOption {}

export class Ambient extends Light {

    constructor(option?: IAmbientLightOption);

    type: string;

    // uniformTemplates : {

    //     ambientLightColor: ILightUniformTemplate<number[]>;

    // }
}
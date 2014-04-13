///<reference path="../Light.d.ts" />
declare module qtek {

    export module light {

        interface IAmbientLightOption extends ILightOption {}

        export class Ambient extends Light {

            constructor(option?: IAmbientLightOption);

            type: string;

            uniformTemplates : {

                ambientLightColor: ILightUniformTemplate<number[]>;

            }
        }
    }
}
///<reference path="../Light.d.ts" />
declare module qtek {

    export module light {

        interface IDirectionalLightOption extends ILightOption {
            shadowBias?: number;
            shadowSlopeScale?: number;
        }

        export class Directional extends Light {

            constructor(option?: IDirectionalLightOption);

            type: string;

            range: number;

            shadowBias: number;

            shadowSlopeScale: number;

            uniformTemplates : {

                directionalLightColor: ILightUniformTemplate<number[]>;

                directionalLightDirection: ILightUniformTemplate<number[]>;
            }
        }
    }
}
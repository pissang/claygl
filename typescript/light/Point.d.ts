///<reference path="../Light.d.ts" />
declare module qtek {

    export module light {

        interface IPointLightOption extends ILightOption {
            range?: number;
        }

        export class Point extends Light {

            constructor(option?: IPointLightOption);

            type: string;

            range: number;

            uniformTemplates : {

                pointLightColor: ILightUniformTemplate<number[]>;
                
                pointLightRange: ILightUniformTemplate<number>;

                pointLightPosition: ILightUniformTemplate<number[]>;
            }
        }
    }
}
///<reference path="Node.d.ts" />
declare module qtek {

    interface ILightOption extends INodeOption {}

    interface ILightUniformTemplate<T> {
        type: string;
        value: (instance: Light) => T
    }

    export class Light extends Node {

        constructor(option?: ILightOption);

        color: number[];

        intensity: number;

        castShadow: boolean;

        shadowResolution: number;
    }
}
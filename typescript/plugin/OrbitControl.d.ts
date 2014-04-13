///<reference path="../Node.d.ts" />
///<reference path="../math/Vector3.d.ts" />
declare module qtek {

    export module plugin {

        interface IOrbitControlOption {
            target?: Node;
            domElement?: HTMLElement;
            sensitivity?: number;
            origin?: math.Vector3;
            up?: math.Vector3;
            minDistance?: number;
            maxDistance?: number;
            minPolarAngle?: number;
            maxPolarAngle?: number;
        }

        export class OrbitControl {

            constructor(option?: IOrbitControlOption);

            target: Node;

            domElement: HTMLElement;

            sensitivity: number;

            origin: math.Vector3;

            up: math.Vector3;

            minDistance: number;

            maxDistance: number;

            minPolarAngle: number;

            maxPolarAngle: number;

            enable(): void;

            disable(): void;

            update(deltaTime: number): void;
        }
    }
}
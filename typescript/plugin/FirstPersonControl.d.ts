///<reference path="../Node.d.ts" />
///<reference path="../math/Vector3.d.ts" />
declare module qtek {

    export module plugin {

        interface IFirstPersonControlOption {
            target?: Node;
            domElement?: HTMLElement;
            sensitivity?: number;
            speed?: number;
            up?: math.Vector3;
            verticalMoveLock?: boolean
        }

        export class FirstPersonControl {

            constructor(option?: IFirstPersonControlOption);

            target: Node;

            domElement: HTMLElement;

            sensitivity: number;

            speed: number;

            up: math.Vector3;
            
            verticalMoveLock: boolean;

            enable(): void;

            disable(): void;

            update(deltaTime: number): void;
        }
    }
}
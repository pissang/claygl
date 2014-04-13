///<reference path="core/mixin/notifier.d.ts" />

declare module qtek {

    export module async {

        interface IRequestTaskOption {
            url: string;
            responseType?: string;
        }

        export class Task implements notifier{

            resolve(data?: any): void;

            reject(err?: any): void;

            isFulfilled(): boolean;

            isRejected(): boolean;

            isSettled(): boolean;

            static makeTask(): Task;

            static makeRequestTask(url: string): Task;
            static makeRequestTask(url: string, responseType: string): Task;
            static makeRequestTask(obj: IRequestTaskOption): Task;
            static makeRequestTask(obj: IRequestTaskOption[]): Task[];
        }
    }
}
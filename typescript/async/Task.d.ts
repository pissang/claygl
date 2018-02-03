import { notifier } from '../core/mixin/notifier';

interface IRequestTaskOption {
    url: string;
    responseType?: string;
}

export class Task implements notifier {

    resolve(data?: any): void;

    reject(err?: any): void;

    isFulfilled(): boolean;

    isRejected(): boolean;

    isSettled(): boolean;

    trigger(name: string, ...args): void;

    on(name: string, action: Function, context?:any): void;

    once(name: string, action: Function, context?:any): void;

    off(name: string, action?: Function): void;

    has(name: string, action: Function): void;

    static makeTask(): Task;

    static makeRequestTask(url: string): Task;
    static makeRequestTask(url: string, responseType: string): Task;
    static makeRequestTask(obj: IRequestTaskOption): Task;
    static makeRequestTask(obj: IRequestTaskOption[]): Task[];
}
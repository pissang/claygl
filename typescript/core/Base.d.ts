import { notifier } from './mixin/notifier';

export class Base implements notifier {
    __GUID__ : number

    trigger(name: string, ...args): void;

    on(name: string, action: Function, context?:any): void;

    once(name: string, action: Function, context?:any): void;

    off(name: string, action?: Function): void;

    has(name: string, action: Function): void;
}
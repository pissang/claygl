declare module qtek{

    export module core {

        export module mixin {

            interface IHandler {
                action: Function;
                context: any;
            }

            export class notifier {
                
                trigger(name: string, ...args): void;

                on(name: string, action: Function, context?:any): IHandler;

                once(name: string, action: Function, context?:any): IHandler;

                before(name: string, action: Function, context?:any): IHandler;

                after(name: string, action: Function, context?:any): IHandler;

                success(action: Function, context?:any): IHandler;

                error(action: Function, context?:any): IHandler;

                off(name: string, action?: Function): void;

                has(name: string, action: Function): void;
            }
        }
    }
}
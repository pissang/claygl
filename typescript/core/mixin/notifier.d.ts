declare module qtek{

    interface INotifierEventHandler {
        action: Function;
        context: any;
    }

    export module core {

        export module mixin {

            export interface notifier {
                
                trigger?(name: string, ...args): void;

                on?(name: string, action: Function, context?:any): void;

                once?(name: string, action: Function, context?:any): void;

                before?(name: string, action: Function, context?:any): void;

                after?(name: string, action: Function, context?:any): void;

                success?(action: Function, context?:any): void;

                error?(action: Function, context?:any): void;

                off?(name: string, action?: Function): void;

                has?(name: string, action: Function): void;
            }
        }
    }
}
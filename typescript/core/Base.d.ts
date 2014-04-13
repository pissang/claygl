///<reference path="mixin/notifier.d.ts" />

declare module qtek {

    export module core {

        export class Base implements mixin.notifier {
            __GUID__ : number
        }
    }
}
///<reference path="../webgl.d.ts" />
declare module qtek {

    export module core {

        export module glinfo {

            export function initialize(gl: WebGLRenderingContext): void;

            export function getExtension(gl: WebGLRenderingContext, name: String): any;
        }
    }
}
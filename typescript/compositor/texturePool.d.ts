///<reference path="../Texture.d.ts" />
declare module qtek.compositor.texturePool {

    export function get(parameters: ITextureOption): Texture;

    export function put(parameters: ITextureOption): void;

    export function clear(gl: WebGLRenderingContext): void;
}
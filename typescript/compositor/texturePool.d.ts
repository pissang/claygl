///<reference path="../Texture.d.ts" />
export namespace clay.compositor.texturePool {

    export function get(parameters: ITextureOption): Texture;

    export function put(parameters: ITextureOption): void;

    export function clear(gl: WebGLRenderingContext): void;
}
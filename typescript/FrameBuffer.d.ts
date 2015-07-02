///<reference path="core/Base.d.ts" />
///<reference path="core/Cache.d.ts" />
///<reference path="Texture2D.d.ts" />
///<reference path="TextureCube.d.ts" />
///<reference path="Renderer.d.ts" />
declare module qtek {

    export class FrameBuffer {

        depthBuffer: boolean;

        cache: core.Cache;

        bind(renderer: Renderer): void;

        unbind(renderer: Renderer): void;

        getFrameBuffer(gl: WebGLRenderingContext): WebGLFramebuffer;

        attach(gl: WebGLRenderingContext, texture: texture.Texture2D): void;
        attach(gl: WebGLRenderingContext, texture: texture.Texture2D, attachment: number): void;
        attach(gl: WebGLRenderingContext, texture: texture.Texture2D, attachment: number, target: number): void;
        attach(gl: WebGLRenderingContext, texture: texture.Texture2D, attachment: number, target: number, mipmapLevel: number): void;

        attach(gl: WebGLRenderingContext, texture: texture.TextureCube, attachment: number, target: number): void;
        attach(gl: WebGLRenderingContext, texture: texture.TextureCube, attachment: number, target: number, mipmapLevel: number): void;

        dispose(gl: WebGLRenderingContext): void;

        static COLOR_ATTACHMENT0: number;
        static DEPTH_ATTACHMENT: number;
        static STENCIL_ATTACHMENT: number;
        static DEPTH_STENCIL_ATTACHMENT: number;
    }
}
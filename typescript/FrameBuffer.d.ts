///<reference path="core/Base.d.ts" />
///<reference path="core/Cache.d.ts" />
///<reference path="Texture2D.d.ts" />
///<reference path="TextureCube.d.ts" />
///<reference path="Renderer.d.ts" />


export class FrameBuffer {

    depthBuffer: boolean;

    cache: core.Cache;

    bind(renderer: Renderer): void;

    unbind(renderer: Renderer): void;

    attach(texture: texture.Texture2D): void;
    attach(texture: texture.Texture2D, attachment: number): void;
    attach(texture: texture.Texture2D, attachment: number, target: number): void;
    attach(texture: texture.Texture2D, attachment: number, target: number, mipmapLevel: number): void;

    attach(texture: texture.TextureCube, attachment: number, target: number): void;
    attach(texture: texture.TextureCube, attachment: number, target: number, mipmapLevel: number): void;

    dispose(renderer: Renderer): void;

    static COLOR_ATTACHMENT0: number;
    static DEPTH_ATTACHMENT: number;
    static STENCIL_ATTACHMENT: number;
    static DEPTH_STENCIL_ATTACHMENT: number;
}
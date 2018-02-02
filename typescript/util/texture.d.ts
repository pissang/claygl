///<reference path="../Texture2D.d.ts" />
///<reference path="../TextureCube.d.ts" />
///<reference path="../Renderer.d.ts" />
export namespace clay.util.texture {

    interface ITextureCubeImageSrc {
        px: string;
        py: string;
        pz: string;
        nx: string;
        ny: string;
        nz: string;
    }

    export function loadTexture(path: string, onsuccess: (texture?: clay.texture.Texture2D) => any, onerror: Function): clay.texture.Texture2D;

    export function loadTexture(path: ITextureCubeImageSrc, onsuccess: (texture?: clay.texture.TextureCube) => any, onerror: Function): clay.texture.TextureCube;

    export function loadPanorama(path: string, cubeMap: clay.texture.TextureCube, renderer: Renderer, onsuccess: (texture: clay.texture.TextureCube) => any, onerror: Function): void;

    export function panoramaToCubeMap(panoramaMap: clay.texture.Texture2D, cubeMap: clay.texture.TextureCube, renderer: Renderer): void;

    export function createChessboard(size: number, unitSize: number, color1: string, color2: string): clay.texture.Texture2D;
    export function createChessboard(size: number, unitSize: number, color1: string): clay.texture.Texture2D;
    export function createChessboard(size: number, unitSize: number): clay.texture.Texture2D;
    export function createChessboard(size: number): clay.texture.Texture2D;
    export function createChessboard(): clay.texture.Texture2D;

    export function createBlank(color?: string): clay.texture.Texture2D;
}
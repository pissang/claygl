///<reference path="../Texture2D.d.ts" />
///<reference path="../TextureCube.d.ts" />
///<reference path="../Renderer.d.ts" />
declare module qtek.util.texture {

    interface ITextureCubeImageSrc {
        px: string;
        py: string;
        pz: string;
        nx: string;
        ny: string;
        nz: string;
    }

    export function loadTexture(path: string, onsuccess: (texture?: qtek.texture.Texture2D) => any, onerror: Function): qtek.texture.Texture2D;

    export function loadTexture(path: ITextureCubeImageSrc, onsuccess: (texture?: qtek.texture.TextureCube) => any, onerror: Function): qtek.texture.TextureCube;

    export function loadPanorama(path: string, cubeMap: qtek.texture.TextureCube, renderer: Renderer, onsuccess: (texture: qtek.texture.TextureCube) => any, onerror: Function): void;

    export function panoramaToCubeMap(panoramaMap: qtek.texture.Texture2D, cubeMap: qtek.texture.TextureCube, renderer: Renderer): void;

    export function createChessboard(size: number, unitSize: number, color1: string, color2: string): qtek.texture.Texture2D;
    export function createChessboard(size: number, unitSize: number, color1: string): qtek.texture.Texture2D;
    export function createChessboard(size: number, unitSize: number): qtek.texture.Texture2D;
    export function createChessboard(size: number): qtek.texture.Texture2D;
    export function createChessboard(): qtek.texture.Texture2D;

    export function createBlank(color?: string): qtek.texture.Texture2D;
}
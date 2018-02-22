import { Texture2D } from '../Texture2D';
import { TextureCube } from '../TextureCube';
import { Renderer } from '../Renderer';

export namespace texture {

    interface ITextureCubeImageSrc {
        px: string;
        py: string;
        pz: string;
        nx: string;
        ny: string;
        nz: string;
    }

    export function loadTexture(path: string, onsuccess: (texture?: clay.texture.Texture2D) => any, onerror: Function): clay.texture.Texture2D;
    export function loadTexture(path: string, option: Object, onsuccess: (texture?: clay.texture.Texture2D) => any, onerror: Function): clay.texture.Texture2D;

    export function loadTexture(path: ITextureCubeImageSrc, onsuccess: (texture?: clay.texture.TextureCube) => any, onerror: Function): clay.texture.TextureCube;
    export function loadTexture(path: ITextureCubeImageSrc, option: Object, onsuccess: (texture?: clay.texture.TextureCube) => any, onerror: Function): clay.texture.TextureCube;

    export function loadPanorama(path: string, cubemap: clay.texture.TextureCube, renderer: Renderer, onsuccess: (texture: clay.texture.TextureCube) => any, onerror: Function): void;

    export function panoramaToCubeMap(panoramaMap: clay.texture.Texture2D, cubemap: clay.texture.TextureCube, renderer: Renderer): void;

    export function createChessboard(size: number, unitSize: number, color1: string, color2: string): clay.texture.Texture2D;
    export function createChessboard(size: number, unitSize: number, color1: string): clay.texture.Texture2D;
    export function createChessboard(size: number, unitSize: number): clay.texture.Texture2D;
    export function createChessboard(size: number): clay.texture.Texture2D;
    export function createChessboard(): clay.texture.Texture2D;

    export function createBlank(color?: string): clay.texture.Texture2D;
}
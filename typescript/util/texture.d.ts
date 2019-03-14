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

    export function loadTexture(path: string, onsuccess: (texture?: Texture2D) => any, onerror: Function): Texture2D;
    export function loadTexture(path: string, option: Object, onsuccess: (texture?: Texture2D) => any, onerror: Function): Texture2D;

    export function loadTexture(path: ITextureCubeImageSrc, onsuccess: (texture?: TextureCube) => any, onerror: Function): TextureCube;
    export function loadTexture(path: ITextureCubeImageSrc, option: Object, onsuccess: (texture?: TextureCube) => any, onerror: Function): TextureCube;

    export function loadPanorama(path: string, cubemap: TextureCube, renderer: Renderer, onsuccess: (texture: TextureCube) => any, onerror: Function): void;

    export function panoramaToCubeMap(panoramaMap: Texture2D, cubemap: TextureCube, renderer: Renderer): void;

    export function createChessboard(size: number, unitSize: number, color1: string, color2: string): Texture2D;
    export function createChessboard(size: number, unitSize: number, color1: string): Texture2D;
    export function createChessboard(size: number, unitSize: number): Texture2D;
    export function createChessboard(size: number): Texture2D;
    export function createChessboard(): Texture2D;

    export function createBlank(color?: string): Texture2D;
}

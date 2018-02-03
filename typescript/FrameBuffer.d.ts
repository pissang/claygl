import { Base } from './core/Base';
import { Texture2D } from './Texture2D';
import { TextureCube } from './TextureCube';
import { Renderer } from './Renderer'


export class FrameBuffer {

    depthBuffer: boolean;

    bind(renderer: Renderer): void;

    unbind(renderer: Renderer): void;

    attach(texture: Texture2D): void;
    attach(texture: Texture2D, attachment: number): void;
    attach(texture: Texture2D, attachment: number, target: number): void;
    attach(texture: Texture2D, attachment: number, target: number, mipmapLevel: number): void;

    attach(texture: TextureCube, attachment: number, target: number): void;
    attach(texture: TextureCube, attachment: number, target: number, mipmapLevel: number): void;

    dispose(renderer: Renderer): void;

    static COLOR_ATTACHMENT0: number;
    static DEPTH_ATTACHMENT: number;
    static STENCIL_ATTACHMENT: number;
    static DEPTH_STENCIL_ATTACHMENT: number;
}
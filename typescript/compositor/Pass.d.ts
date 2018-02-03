import { Material } from '../Material';
import { Texture } from '../Texture';
import { Renderer } from '../Renderer';
import { FrameBuffer } from '../FrameBuffer';
import { IDictionary } from '../core/container';
import { Base } from '../core/Base';

export class Pass extends Base {

    fragment: string;

    outputs: IDictionary<Texture>;

    material: Material;

    setUniform(name: string, value: any): void;

    getUniform(name: string): any;

    attachOutput(texture: Texture, attachment?: number): void;

    detachOutput(texture: Texture): void;

    render(renderer: Renderer, frameBuffer: FrameBuffer): void;

    bind(renderer: Renderer, frameBuffer: FrameBuffer): void;

    unbind(renderer: Renderer, frameBuffer: FrameBuffer): void;
}
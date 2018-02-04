import { Graph } from './Graph';
import { CompositorNode } from './CompositorNode';
import { Renderer } from '../Renderer';

export class Compositor extends Graph {

    render(renderer: Renderer): void;

    addOutput(node: CompositorNode): void;

    removeOutput(node: CompositorNode): void;
}
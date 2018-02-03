import { Graph } from './Graph';
import { Node } from './Node';
import { Renderer } from '../Renderer';

export class Compositor extends Graph {

    render(renderer: Renderer): void;

    addOutput(node: Node): void;

    removeOutput(node: Node): void;
}
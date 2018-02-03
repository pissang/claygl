import { CompositorNode } from './CompositorNode';

export class Graph {

    nodes: CompositorNode[];

    addNode(node: CompositorNode): void;

    removeNode(node: CompositorNode): void;

    findNode(name: string): CompositorNode;

    update(): void;
}
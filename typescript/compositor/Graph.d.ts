///<reference path="Node.d.ts" />
export namespace clay {

    export module compositor {

        export class Graph {

            nodes: Node[];

            addNode(node: Node): void;

            removeNode(node: Node): void;

            findNode(name: string): Node;

            update(): void;

            findPin(input: ICompositorNodeInput): void;
        }
    }
}
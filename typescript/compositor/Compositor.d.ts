///<reference path="Graph.d.ts" />
///<reference path="Node.d.ts" />
///<reference path="../Renderer.d.ts" />
declare module qtek {

    export module compositor {

        export class Compositor extends Graph {

            render(renderer: Renderer): void;

            addOutput(node: Node): void;

            removeOutput(node: Node): void;
        }
    }
}
///<reference path="Node.d.ts" />
///<reference path="core/Base.d.ts" />

export class Joint extends core.Base{

    name: string;

    index: number;

    parentIndex: number;

    node: Node;

    rootNode: Node;
}
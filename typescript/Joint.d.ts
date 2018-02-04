import { Node } from './Node';
import { Base } from './core/Base';

export class Joint extends Base{

    name: string;

    index: number;

    parentIndex: number;

    node: Node;
}
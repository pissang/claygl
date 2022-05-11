import { optional } from './core/util';
import type ClayNode from './Node';

/**
 * @constructor clay.Joint
 * @extends clay.core.Base
 */

export class Joint {
  /**
   * Joint name
   */
  name: string;
  /**
   * Index of joint in the skeleton
   */
  index: number;
  /**
   * Scene node attached to
   */
  node?: ClayNode;

  constructor(name?: string, index?: number, node?: ClayNode) {
    this.name = name || '';
    this.index = optional(index, -1);
    this.node = node;
  }
}

export default Joint;

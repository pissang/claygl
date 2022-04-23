import * as util from './util';

/**
 * Base class of all objects
 * @constructor
 * @alias clay.core.Base
 * @mixes clay.core.mixin.notifier
 */

class Base {
  __uid__: number;
  constructor() {
    this.__uid__ = util.genGUID();
  }
}

export default Base;

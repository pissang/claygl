import extendMixin from './mixin/extend';
import notifierMixin from './mixin/notifier';
import util from './util';

/**
 * Base class of all objects
 * @constructor
 * @alias clay.core.Base
 * @mixes clay.core.mixin.notifier
 */
var Base = function () {
    /**
     * @type {number}
     */
    this.__uid__ = util.genGUID();
};

Base.__initializers__ = [
    function (opts) {
        util.extend(this, opts);
    }
];

util.extend(Base, extendMixin);
util.extend(Base.prototype, notifierMixin);

export default Base;

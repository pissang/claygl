define(function(require){

    'use strict';

    var deriveMixin = require('./mixin/derive');
    var notifierMixin = require('./mixin/notifier');
    var util = require('./util');

    /**
     * Base class of all objects
     * @constructor
     * @alias qtek.core.Base
     * @mixes qtek.core.mixin.notifier
     */
    var Base = function() {
        /**
         * @type {number}
         */
        this.__GUID__ = util.genGUID();
    };

    Base.__initializers__ = [
        function(opts) {
            util.extend(this, opts);
        }
    ];
    
    util.extend(Base, deriveMixin);
    util.extend(Base.prototype, notifierMixin);

    return Base;
});
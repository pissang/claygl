define(function(require){

    var deriveMixin = require("./mixin/derive");
    var notifierMixin = require("./mixin/notifier");
    var util = require("./util");
    var _ = require("_");

    var Base = function(){
        this.__GUID__ = util.genGUID();
    }
    _.extend(Base, deriveMixin);
    _.extend(Base.prototype, notifierMixin);

    return Base;
})
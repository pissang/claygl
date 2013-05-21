define(function(require){

    var deriveMixin = require("./mixin/derive");
    var notifierMixin = require("./mixin/notifier");
    var dirtyMixin = require("./mixin/dirty");
    var Cache = require("./cache");
    var _ = require("_");

    var Base = function(){
        this.cache = new Cache();
    }
    _.extend(Base, deriveMixin);
    _.extend(Base.prototype, notifierMixin);
    _.extend(Base.prototype, dirtyMixin);

    return Base;
})
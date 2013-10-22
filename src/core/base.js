define(function(require){

    var deriveMixin = require("./mixin/derive");
    var notifierMixin = require("./mixin/notifier");
    var Cache = require("./Cache");
    var _ = require("_");

    var Base = function(){
        this.cache = new Cache();
    }
    _.extend(Base, deriveMixin);
    _.extend(Base.prototype, notifierMixin);

    return Base;
})
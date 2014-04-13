define(function(require){

    var deriveMixin = require("./mixin/derive");
    var notifierMixin = require("./mixin/notifier");
    var util = require("./util");

    var Base = function(options){
        
        this.__GUID__ = util.genGUID();

        // PENDING
        if (options) { 
            for (var name in options) {
                if (name.indexOf('_') >= 0) {
                    console.warn(name + ' is a private property');
                    delete options[name];
                }
            }
        }
    }
    util.extend(Base, deriveMixin);
    util.extend(Base.prototype, notifierMixin);

    return Base;
})
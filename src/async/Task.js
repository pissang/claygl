define(function(require) {

    var notifier = require('../core/mixin/notifier');
    var request = require('../core/request');
    var util  = require('../core/util');
    
    var Task = function() {
        this._fullfilled = false;
        this._rejected = false;
    }
    Task.prototype.resolve = function(data) {
        this._fullfilled = true;
        this._rejected = false;
        this.trigger('success', data);
    }
    Task.prototype.reject = function(err) {
        this._rejected = true;
        this._fullfilled = false;
        this.trigger('error', err);
    }
    Task.prototype.isFullfilled = function() {
        return this._fullfilled;
    }
    Task.prototype.isRejected = function() {
        return this._rejected;
    }
    Task.prototype.isSettled = function() {
        return this._fullfilled || this._rejected;
    }
    
    util.extend(Task.prototype, notifier);

    function makeRequestTask(url, responseType) {
        var task = new Task();
        request.get({
            url : url,
            responseType : responseType,
            onload : function(res) {
                task.resolve(res);
            },
            onerror : function() {
                self.reject(error);
            }
        });
        return task;
    };

    Task.makeRequestTask = function(url, responseType) {
        var self = this;
        if (typeof url === 'string') {
            return makeRequestTask(url, responseType);
        } else if (url.url) {   //  Configure object
            var obj = url;
            return makeRequestTask(obj.url, obj.responseType);
        } else if (url instanceof Array) {  // Url list
            var count = 0;
            var urlList = url;
            var tasks = [];
            urlList.forEach(function(obj) {
                var url, responseType;
                if (typeof obj === 'string') {
                    url = obj;
                } else if (Object(obj) === obj) {
                    url = obj.url;
                    responseType = obj.responseType;
                }
                tasks.push(makeRequestTask(url, responseType));
            });
            return tasks;
        }
    }

    Task.makeTask = function(obj) {
        return new Task(obj);
    }

    util.extend(Task.prototype, notifier);

    return Task;
});
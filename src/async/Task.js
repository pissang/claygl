define(function(require) {

    'use strict';

    var notifier = require('../core/mixin/notifier');
    var request = require('../core/request');
    var util  = require('../core/util');

    /**
     * @constructor
     * @alias qtek.async.Task
     * @mixes qtek.core.mixin.notifier
     */
    var Task = function() {
        this._fullfilled = false;
        this._rejected = false;
    };
    /**
     * Task successed
     * @param {} data
     */
    Task.prototype.resolve = function(data) {
        this._fullfilled = true;
        this._rejected = false;
        this.trigger('success', data);
    };
    /**
     * Task failed
     * @param {} err
     */
    Task.prototype.reject = function(err) {
        this._rejected = true;
        this._fullfilled = false;
        this.trigger('error', err);
    };
    /**
     * If task successed
     * @return {boolean}
     */
    Task.prototype.isFullfilled = function() {
        return this._fullfilled;
    };
    /**
     * If task failed
     * @return {boolean}
     */
    Task.prototype.isRejected = function() {
        return this._rejected;
    };
    /**
     * If task finished, either successed or failed
     * @return {boolean}
     */
    Task.prototype.isSettled = function() {
        return this._fullfilled || this._rejected;
    };
    
    util.extend(Task.prototype, notifier);

    function makeRequestTask(url, responseType) {
        var task = new Task();
        request.get({
            url: url,
            responseType: responseType,
            onload: function(res) {
                task.resolve(res);
            },
            onerror: function(error) {
                task.reject(error);
            }
        });
        return task;
    }
    /**
     * Make a request task
     * @param  {string|object|object[]|string[]} url
     * @param  {string} [responseType]
     * @example
     *     var task = Task.makeRequestTask('./a.json');
     *     var task = Task.makeRequestTask({
     *         url: 'b.bin',
     *         responseType: 'arraybuffer'
     *     });
     *     var tasks = Task.makeRequestTask(['./a.json', './b.json']);
     *     var tasks = Task.makeRequestTask([
     *         {url: 'a.json'},
     *         {url: 'b.bin', responseType: 'arraybuffer'}
     *     ]);
     * @return {qtek.async.Task|qtek.async.Task[]}
     */
    Task.makeRequestTask = function(url, responseType) {
        if (typeof url === 'string') {
            return makeRequestTask(url, responseType);
        } else if (url.url) {   //  Configure object
            var obj = url;
            return makeRequestTask(obj.url, obj.responseType);
        } else if (url instanceof Array) {  // Url list
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
    };
    /**
     * @return {qtek.async.Task}
     */
    Task.makeTask = function() {
        return new Task();
    };

    util.extend(Task.prototype, notifier);

    return Task;
});
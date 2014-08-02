define(function(require) {

    'use strict';

    function get(options) {

        var xhr = new XMLHttpRequest();

        xhr.open('get', options.url);
        // With response type set browser can get and put binary data
        // https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Sending_and_Receiving_Binary_Data
        // Default is text, and it can be set
        // arraybuffer, blob, document, json, text
        xhr.responseType = options.responseType || 'text';

        if (options.onprogress) {
            //https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Using_XMLHttpRequest
            xhr.onprogress = function(e) {
                if (e.lengthComputable) {
                    var percent = e.loaded / e.total;
                    options.onprogress(percent, e.loaded, e.total);
                } else {
                    options.onprogress(null);
                }
            };
        }
        xhr.onload = function(e) {
            options.onload && options.onload(xhr.response);
        };
        if (options.onerror) {
            xhr.onerror = options.onerror;
        }
        xhr.send(null);
    }

    return {
        get : get
    };
});
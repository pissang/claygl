import Base from '../core/Base';
import vendor from '../core/vendor';
import createCompositor from '../createCompositor';

/**
 * @constructor clay.loader.FX
 * @extends clay.core.Base
 */
var FXLoader = Base.extend(/** @lends clay.loader.FX# */ {
    /**
     * @type {string}
     */
    rootPath: '',
    /**
     * @type {string}
     */
    textureRootPath: '',
    /**
     * @type {string}
     */
    shaderRootPath: '',

    /**
     * @type {clay.Scene}
     */
    scene: null,

    /**
     * @type {clay.Camera}
     */
    camera: null
},
/** @lends clay.loader.FX.prototype */
{
    /**
     * @param  {string} url
     */
    load: function(url) {
        var self = this;

        if (!this.rootPath) {
            this.rootPath = url.slice(0, url.lastIndexOf('/'));
        }

        vendor.request.get({
            url: url,
            onprogress: function(percent, loaded, total) {
                self.trigger('progress', percent, loaded, total);
            },
            onerror: function(e) {
                self.trigger('error', e);
            },
            responseType: 'text',
            onload: function (data) {
                createCompositor(JSON.parse(data), {
                    textureRootPath: this.textureRootPath || this.rootPath,
                    camera: this.camera,
                    scene: this.scene
                });
            }
        });
    }
});

export default FXLoader;

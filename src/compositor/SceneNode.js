import CompositorNode from './CompositorNode';
import glenum from '../core/glenum';
import FrameBuffer from '../FrameBuffer';

/**
 * @constructor clay.compositor.SceneNode
 * @extends clay.compositor.CompositorNode
 */
var SceneNode = CompositorNode.extend(
/** @lends clay.compositor.SceneNode# */
{
    name: 'scene',
    /**
     * @type {clay.Scene}
     */
    scene: null,
    /**
     * @type {clay.Camera}
     */
    camera: null,
    /**
     * @type {boolean}
     */
    autoUpdateScene: true,
    /**
     * @type {boolean}
     */
    preZ: false

}, function() {
    this.frameBuffer = new FrameBuffer();
}, {
    render: function(renderer) {

        this._rendering = true;
        var _gl = renderer.gl;

        this.trigger('beforerender');

        var renderInfo;

        if (!this.outputs) {

            renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);

        }
        else {

            var frameBuffer = this.frameBuffer;
            for (var name in this.outputs) {
                var parameters = this.updateParameter(name, renderer);
                var outputInfo = this.outputs[name];
                var texture = this._compositor.allocateTexture(parameters);
                this._outputTextures[name] = texture;

                var attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
                if (typeof(attachment) == 'string') {
                    attachment = _gl[attachment];
                }
                frameBuffer.attach(texture, attachment);
            }
            frameBuffer.bind(renderer);

            // MRT Support in chrome
            // https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/ext-draw-buffers.html
            var ext = renderer.getGLExtension('EXT_draw_buffers');
            if (ext) {
                var bufs = [];
                for (var attachment in this.outputs) {
                    attachment = parseInt(attachment);
                    if (attachment >= _gl.COLOR_ATTACHMENT0 && attachment <= _gl.COLOR_ATTACHMENT0 + 8) {
                        bufs.push(attachment);
                    }
                }
                ext.drawBuffersEXT(bufs);
            }

            // Always clear
            // PENDING
            renderer.saveClear();
            renderer.clearBit = glenum.DEPTH_BUFFER_BIT | glenum.COLOR_BUFFER_BIT;
            renderInfo = renderer.render(this.scene, this.camera, !this.autoUpdateScene, this.preZ);
            renderer.restoreClear();

            frameBuffer.unbind(renderer);
        }

        this.trigger('afterrender', renderInfo);

        this._rendering = false;
        this._rendered = true;
    }
});

export default SceneNode;

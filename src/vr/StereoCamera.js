import Base from '../Node';
import Camera from '../camera/Perspective';
import Matrix4 from '../math/Matrix4';

var tmpProjectionMatrix = new Matrix4();

var StereoCamera = Base.extend(function () {
    return {

        aspect: 0.5,

        _leftCamera: new Camera(),

        _rightCamera: new Camera(),

        _eyeLeft: new Matrix4(),
        _eyeRight: new Matrix4(),

        _frameData: null
    };
}, {

    updateFromCamera: function (camera, focus, zoom, eyeSep) {
        if (camera.transformNeedsUpdate()) {
            console.warn('Node transform is not updated');
        }

        focus = focus == null ? 10 : focus;
        zoom = zoom == null ? 1 : zoom;
        eyeSep = eyeSep == null ? 0.064 : eyeSep;

        var fov = camera.fov;
        var aspect = camera.aspect * this.aspect;
        var near = camera.near;

        // Off-axis stereoscopic effect based on
        // http://paulbourke.net/stereographics/stereorender/

        tmpProjectionMatrix.copy(camera.projectionMatrix);
        var eyeSep = eyeSep / 2;
        var eyeSepOnProjection = eyeSep * near / focus;
        var ymax = (near * Math.tan(Math.PI / 180 * fov * 0.5 ) ) / zoom;
        var xmin, xmax;

        // translate xOffset
        this._eyeLeft.array[12] = - eyeSep;
        this._eyeRight.array[12] = eyeSep;

        // for left eye
        xmin = - ymax * aspect + eyeSepOnProjection;
        xmax = ymax * aspect + eyeSepOnProjection;

        tmpProjectionMatrix.array[0] = 2 * near / (xmax - xmin);
        tmpProjectionMatrix.array[8] = (xmax + xmin ) / (xmax - xmin);

        this._leftCamera.projectionMatrix.copy(tmpProjectionMatrix);

        // for right eye
        xmin = - ymax * aspect - eyeSepOnProjection;
        xmax = ymax * aspect - eyeSepOnProjection;

        tmpProjectionMatrix.array[0] = 2 * near / (xmax - xmin);
        tmpProjectionMatrix.array[8] = (xmax + xmin ) / (xmax - xmin);

        this._rightCamera.projectionMatrix.copy(tmpProjectionMatrix);

        this._leftCamera.worldTransform
            .copy(camera.worldTransform)
            .multiply(this._eyeLeft);

        this._rightCamera.worldTransform
            .copy(camera.worldTransform)
            .multiply(this._eyeRight);

        this._leftCamera.decomposeWorldTransform();
        this._leftCamera.decomposeProjectionMatrix();

        this._rightCamera.decomposeWorldTransform();
        this._rightCamera.decomposeProjectionMatrix();
    },

    updateFromVRDisplay: function (vrDisplay, parentNode) {

        if (typeof VRFrameData === 'undefined') {
            return;
        }

        var frameData = this._frameData || (this._frameData = new VRFrameData());
        vrDisplay.getFrameData(frameData);
        var leftCamera = this._leftCamera;
        var rightCamera = this._rightCamera;

        leftCamera.projectionMatrix.setArray(frameData.leftProjectionMatrix);
        leftCamera.decomposeProjectionMatrix();
        leftCamera.viewMatrix.setArray(frameData.leftViewMatrix);
        leftCamera.setViewMatrix(leftCamera.viewMatrix);

        rightCamera.projectionMatrix.setArray(frameData.rightProjectionMatrix);
        rightCamera.decomposeProjectionMatrix();
        rightCamera.viewMatrix.setArray(frameData.rightViewMatrix);
        rightCamera.setViewMatrix(rightCamera.viewMatrix);

        if (parentNode && parentNode.worldTransform) {
            if (parentNode.transformNeedsUpdate()) {
                console.warn('Node transform is not updated');
            }
            leftCamera.worldTransform.multiplyLeft(parentNode.worldTransform);
            leftCamera.decomposeWorldTransform();
            rightCamera.worldTransform.multiplyLeft(parentNode.worldTransform);
            rightCamera.decomposeWorldTransform();
        }
    },

    getLeftCamera: function () {
        return this._leftCamera;
    },

    getRightCamera: function () {
        return this._rightCamera;
    }
});

export default StereoCamera;

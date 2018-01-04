// https://github.com/googlevr/webvr-polyfill/blob/master/src/cardboard-distorter.js

// Use webvr may have scale problem.
// https://github.com/googlevr/webvr-polyfill/issues/140
// https://github.com/googlevr/webvr-polyfill/search?q=SCALE&type=Issues&utf8=%E2%9C%93
// https://github.com/googlevr/webvr-polyfill/issues/147


import Mesh from '../Mesh';
import Material from '../Material';
import Geometry from '../Geometry';
import Shader from '../Shader';
import Base from '../core/Base';
import PerspectiveCamera from '../camera/Perspective';

import outputEssl from './output.glsl.js';

Shader.import(outputEssl);

function lerp (a, b, t) {
    return a * (1 - t) + b * t;
}

var CardboardDistorter = Base.extend(function () {
    return {

        clearColor: [0, 0, 0, 1],

        _mesh: new Mesh({
            geometry: new Geometry({
                dynamic: true
            }),
            culling: false,
            material: new Material({
                // FIXME Why disable depthMask will be wrong
                // depthMask: false,
                depthTest: false,
                shader: new Shader({
                    vertex: Shader.source('clay.vr.disorter.output.vertex'),
                    fragment: Shader.source('clay.vr.disorter.output.fragment')
                })
            })
        }),
        _fakeCamera: new PerspectiveCamera()
    };
}, {

    render: function (renderer, sourceTexture) {
        var clearColor = this.clearColor;
        var gl = renderer.gl;
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.disable(gl.BLEND);

        this._mesh.material.set('texture', sourceTexture);

        // Full size?
        renderer.saveViewport();
        renderer.setViewport(0, 0, renderer.getWidth(), renderer.getHeight());
        renderer.renderPass([this._mesh], this._fakeCamera);
        renderer.restoreViewport();
        // this._mesh.material.shader.bind(renderer);
        // this._mesh.material.bind(renderer);
        // this._mesh.render(renderer.gl);
    },

    updateFromVRDisplay: function (vrDisplay) {

        // FIXME
        if (vrDisplay.deviceInfo_) {
            // Hardcoded mesh size
            this._updateMesh(20, 20, vrDisplay.deviceInfo_);
        }
        else {
            console.warn('Cant get vrDisplay.deviceInfo_, seems code changed');
        }
    },

    _updateMesh: function (width, height, deviceInfo) {

        var positionAttr = this._mesh.geometry.attributes.position;
        var texcoordAttr = this._mesh.geometry.attributes.texcoord0;
        positionAttr.init(2 * width * height);
        texcoordAttr.init(2 * width * height);

        var lensFrustum = deviceInfo.getLeftEyeVisibleTanAngles();
        var noLensFrustum = deviceInfo.getLeftEyeNoLensTanAngles();
        var viewport = deviceInfo.getLeftEyeVisibleScreenRect(noLensFrustum);
        var vidx = 0;

        var pos = [];
        var uv = [];

        // Vertices
        for (var e = 0; e < 2; e++) {
            for (var j = 0; j < height; j++) {
                for (var i = 0; i < width; i++, vidx++) {
                    var u = i / (width - 1);
                    var v = j / (height - 1);

                    // Grid points regularly spaced in StreoScreen, and barrel distorted in
                    // the mesh.
                    var s = u;
                    var t = v;
                    var x = lerp(lensFrustum[0], lensFrustum[2], u);
                    var y = lerp(lensFrustum[3], lensFrustum[1], v);
                    var d = Math.sqrt(x * x + y * y);
                    var r = deviceInfo.distortion.distortInverse(d);
                    var p = x * r / d;
                    var q = y * r / d;
                    u = (p - noLensFrustum[0]) / (noLensFrustum[2] - noLensFrustum[0]);
                    v = (q - noLensFrustum[3]) / (noLensFrustum[1] - noLensFrustum[3]);

                    // Convert u,v to mesh screen coordinates.
                    var aspect = deviceInfo.device.widthMeters / deviceInfo.device.heightMeters;

                    // FIXME: The original Unity plugin multiplied U by the aspect ratio
                    // and didn't multiply either value by 2, but that seems to get it
                    // really close to correct looking for me. I hate this kind of "Don't
                    // know why it works" code though, and wold love a more logical
                    // explanation of what needs to happen here.
                    u = (viewport.x + u * viewport.width - 0.5) * 2.0; //* aspect;
                    v = (viewport.y + v * viewport.height - 0.5) * 2.0;

                    pos[0] = u;
                    pos[1] = v;
                    pos[2] = 0;

                    uv[0] = s * 0.5 + e * 0.5;
                    uv[1] = t;

                    positionAttr.set(vidx, pos);
                    texcoordAttr.set(vidx, uv);
                }
            }

            var w = lensFrustum[2] - lensFrustum[0];
            lensFrustum[0] = -(w + lensFrustum[0]);
            lensFrustum[2] = w - lensFrustum[2];
            w = noLensFrustum[2] - noLensFrustum[0];
            noLensFrustum[0] = -(w + noLensFrustum[0]);
            noLensFrustum[2] = w - noLensFrustum[2];
            viewport.x = 1 - (viewport.x + viewport.width);
        }

        // Indices
        var indices = new Uint16Array(2 * (width - 1) * (height - 1) * 6);
        var halfwidth = width / 2;
        var halfheight = height / 2;
        var vidx = 0;
        var iidx = 0;
        for (var e = 0; e < 2; e++) {
            for (var j = 0; j < height; j++) {
                for (var i = 0; i < width; i++, vidx++) {
                    if (i === 0 || j === 0) {
                        continue;
                    }
                    // Build a quad.  Lower right and upper left quadrants have quads with
                    // the triangle diagonal flipped to get the vignette to interpolate
                    // correctly.
                    if ((i <= halfwidth) == (j <= halfheight)) {
                        // Quad diagonal lower left to upper right.
                        indices[iidx++] = vidx;
                        indices[iidx++] = vidx - width - 1;
                        indices[iidx++] = vidx - width;
                        indices[iidx++] = vidx - width - 1;
                        indices[iidx++] = vidx;
                        indices[iidx++] = vidx - 1;
                    }
                    else {
                        // Quad diagonal upper left to lower right.
                        indices[iidx++] = vidx - 1;
                        indices[iidx++] = vidx - width;
                        indices[iidx++] = vidx;
                        indices[iidx++] = vidx - width;
                        indices[iidx++] = vidx - 1;
                        indices[iidx++] = vidx - width - 1;
                    }
                }
            }
        }

        this._mesh.geometry.indices = indices;

        this._mesh.geometry.dirty();
    }
});

export default CardboardDistorter;

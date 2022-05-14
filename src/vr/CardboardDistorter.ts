// https://github.com/googlevr/webvr-polyfill/blob/master/src/cardboard-distorter.js

// Use webvr may have scale problem.
// https://github.com/googlevr/webvr-polyfill/issues/140
// https://github.com/googlevr/webvr-polyfill/search?q=SCALE&type=Issues&utf8=%E2%9C%93
// https://github.com/googlevr/webvr-polyfill/issues/147

import Mesh from '../Mesh';
import Material from '../Material';
import Geometry from '../Geometry';
import Shader from '../Shader';
import PerspectiveCamera from '../camera/Perspective';

import outputEssl from './output.glsl';
import { Color } from '../core/type';
import type Renderer from '../Renderer';
import type Texture2D from '../Texture2D';

Shader.import(outputEssl);

function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

class CardboardDistorter {
  clearColor: Color = [0, 0, 0, 1];

  private _mesh: Mesh;
  private _fakeCamera = new PerspectiveCamera();
  constructor() {
    this._mesh = new Mesh({
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
    });
  }

  render(renderer: Renderer, sourceTexture: Texture2D) {
    const clearColor = this.clearColor;
    const gl = renderer.gl;
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
  }

  updateFromVRDisplay(vrDisplay: any) {
    // FIXME
    if (vrDisplay.deviceInfo_) {
      // Hardcoded mesh size
      this._updateMesh(20, 20, vrDisplay.deviceInfo_);
    } else {
      console.warn('Cant get vrDisplay.deviceInfo_, seems code changed');
    }
  }

  _updateMesh(width: number, height: number, deviceInfo: any) {
    const positionAttr = this._mesh.geometry.attributes.position;
    const texcoordAttr = this._mesh.geometry.attributes.texcoord0;
    positionAttr.init(2 * width * height);
    texcoordAttr.init(2 * width * height);

    const lensFrustum = deviceInfo.getLeftEyeVisibleTanAngles();
    const noLensFrustum = deviceInfo.getLeftEyeNoLensTanAngles();
    const viewport = deviceInfo.getLeftEyeVisibleScreenRect(noLensFrustum);

    const pos = [];
    const uv = [];
    let vidx = 0;

    // Vertices
    for (let e = 0; e < 2; e++) {
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++, vidx++) {
          let u = i / (width - 1);
          let v = j / (height - 1);

          // Grid points regularly spaced in StreoScreen, and barrel distorted in
          // the mesh.
          const s = u;
          const t = v;
          const x = lerp(lensFrustum[0], lensFrustum[2], u);
          const y = lerp(lensFrustum[3], lensFrustum[1], v);
          const d = Math.sqrt(x * x + y * y);
          const r = deviceInfo.distortion.distortInverse(d);
          const p = (x * r) / d;
          const q = (y * r) / d;
          u = (p - noLensFrustum[0]) / (noLensFrustum[2] - noLensFrustum[0]);
          v = (q - noLensFrustum[3]) / (noLensFrustum[1] - noLensFrustum[3]);

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

      let w = lensFrustum[2] - lensFrustum[0];
      lensFrustum[0] = -(w + lensFrustum[0]);
      lensFrustum[2] = w - lensFrustum[2];
      w = noLensFrustum[2] - noLensFrustum[0];
      noLensFrustum[0] = -(w + noLensFrustum[0]);
      noLensFrustum[2] = w - noLensFrustum[2];
      viewport.x = 1 - (viewport.x + viewport.width);
    }

    // Indices
    const indices = new Uint16Array(2 * (width - 1) * (height - 1) * 6);
    const halfwidth = width / 2;
    const halfheight = height / 2;
    vidx = 0;
    let iidx = 0;
    for (let e = 0; e < 2; e++) {
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++, vidx++) {
          if (i === 0 || j === 0) {
            continue;
          }
          // Build a quad.  Lower right and upper left quadrants have quads with
          // the triangle diagonal flipped to get the vignette to interpolate
          // correctly.
          if (i <= halfwidth == j <= halfheight) {
            // Quad diagonal lower left to upper right.
            indices[iidx++] = vidx;
            indices[iidx++] = vidx - width - 1;
            indices[iidx++] = vidx - width;
            indices[iidx++] = vidx - width - 1;
            indices[iidx++] = vidx;
            indices[iidx++] = vidx - 1;
          } else {
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
}
export default CardboardDistorter;

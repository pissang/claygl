import OrthoCamera from '../camera/Orthographic';
import Plane from '../geometry/Plane';
import Shader, { FragmentShader, VertexShader } from '../Shader';
import Material from '../Material';
import Mesh from '../Mesh';
import * as constants from '../core/constants';
import { fullscreenQuadPassVertex } from '../shader/source/compositor/vertex.glsl';
import { isArray, optional } from '../core/util';
import Renderer, { RenderHooks } from '../Renderer';
import type FrameBuffer from '../FrameBuffer';
import Notifier from '../core/Notifier';
import { Color } from '../core/type';

const planeGeo = new Plane();
let mesh: Mesh;
const camera = new OrthoCamera();

interface FullscreenQuadPassOpts {
  clearColor?: Color;
  clearDepth?: boolean;
  blendWithPrevious?: boolean;
}

class FullscreenQuadPass<T extends FragmentShader = FragmentShader> extends Notifier {
  material: Material<Shader<typeof fullscreenQuadPassVertex, T>>;

  clearColor?: Color | boolean;
  clearDepth?: boolean;
  blendWithPrevious?: boolean;

  constructor(frag: T, opts?: Partial<FullscreenQuadPassOpts>) {
    super();

    const shader = new Shader(fullscreenQuadPassVertex, frag);
    const material = new Material(shader);
    material.enableTexturesAll();
    this.material = material;

    opts = opts || {};
    this.clearColor = opts.clearColor || false;
    this.blendWithPrevious = opts.blendWithPrevious || false;
    this.clearDepth = optional(opts.clearDepth, true);
  }

  render(renderer: Renderer, frameBuffer?: FrameBuffer) {
    this.trigger('beforerender', this, renderer);

    // FIXME Don't clear in each pass in default, let the color overwrite the buffer
    // FIXME pixels may be discard
    let clearBit = this.clearDepth ? constants.DEPTH_BUFFER_BIT : 0;
    const blendWithPrevious = this.blendWithPrevious;

    // Blend with previous rendered scene in the final output
    // FIXME Configure blend.
    // FIXME It will cause screen blink？

    this.renderQuad(renderer, frameBuffer, (gl) => {
      gl.depthMask(true);
      gl[blendWithPrevious ? 'enable' : 'disable'](constants.BLEND);
      this.material && (this.material.transparent = blendWithPrevious!);

      if (this.clearColor) {
        clearBit = clearBit | constants.COLOR_BUFFER_BIT;
        gl.colorMask(true, true, true, true);
        const cc = this.clearColor;
        if (isArray(cc)) {
          gl.clearColor(cc[0], cc[1], cc[2], cc[3]);
        }
      }
      gl.clear(clearBit);
    });

    this.trigger('afterrender', this, renderer);
  }

  /**
   * Simply do quad rendering
   */
  renderQuad(
    renderer: Renderer,
    frameBuffer?: FrameBuffer,
    prepare?: RenderHooks['prepare'],
    cleanup?: RenderHooks['cleanup']
  ) {
    const material = this.material;
    mesh =
      mesh ||
      new Mesh(planeGeo, material, {
        frustumCulling: false
      });
    mesh.material = material;
    renderer.renderPass([mesh], camera, frameBuffer, {
      prepare,
      cleanup
    });
  }

  /**
   * @param  {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {}
}

export default FullscreenQuadPass;

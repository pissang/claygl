import Shader, { FragmentShader } from './Shader';
import Material from './Material';
import * as constants from './core/constants';
import { fullscreenQuadPassVertex } from './shader/source/compositor/vertex.glsl';
import { isArray, optional } from './core/util';
import Notifier from './core/Notifier';
import type { Color } from './core/type';
import type Renderer from './Renderer';
import type { RenderHooks } from './Renderer';
import type FrameBuffer from './FrameBuffer';
import GeometryBase from './GeometryBase';

const planeGeo = new GeometryBase();
planeGeo.createAttribute('position', 'float', 3, 'POSITION');
planeGeo.attributes.position.fromArray([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);

interface FullscreenQuadPassOpts {
  clearColor?: Color;
  clearDepth?: boolean;
}

class FullscreenQuadPass<T extends FragmentShader = FragmentShader> extends Notifier {
  material: Material<Shader<typeof fullscreenQuadPassVertex, T>>;

  clearColor?: Color | boolean;
  clearDepth?: boolean;

  beforeRender?: (gl: WebGL2RenderingContext) => void;
  afterRender?: (gl: WebGL2RenderingContext) => void;

  constructor(frag: T, opts?: Partial<FullscreenQuadPassOpts>) {
    super();

    const shader = new Shader(fullscreenQuadPassVertex, frag);
    const material = new Material(shader);
    material.enableTexturesAll();
    this.material = material;

    opts = opts || {};
    this.clearColor = opts.clearColor || false;
    this.clearDepth = optional(opts.clearDepth, true);
  }

  render(renderer: Renderer, frameBuffer?: FrameBuffer) {
    // FIXME Don't clear in each pass in default, let the color overwrite the buffer
    // FIXME pixels may be discard
    let clearBit = this.clearDepth ? constants.DEPTH_BUFFER_BIT : 0;

    // Blend with previous rendered scene in the final output
    // FIXME Configure blend.
    // FIXME It will cause screen blink？

    this.renderQuad(
      renderer,
      frameBuffer,
      (gl) => {
        gl.depthMask(true);

        this.beforeRender?.(gl);

        if (this.clearColor) {
          clearBit = clearBit | constants.COLOR_BUFFER_BIT;
          gl.colorMask(true, true, true, true);
          const cc = this.clearColor;
          if (isArray(cc)) {
            gl.clearColor(cc[0], cc[1], cc[2], cc[3]);
          }
        }
        gl.clear(clearBit);
      },
      (gl) => {
        this.afterRender?.(gl);
      }
    );
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
    renderer.renderPass(
      [
        {
          geometry: planeGeo,
          material,
          mode: constants.TRIANGLE_FAN
        }
      ],
      undefined,
      frameBuffer,
      {
        prepare,
        cleanup
      }
    );
  }

  /**
   * @param  {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {}
}

export default FullscreenQuadPass;
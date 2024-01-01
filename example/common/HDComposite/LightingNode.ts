import {
  CompositeNode,
  constants,
  FrameBuffer,
  Renderer,
  Texture,
  Scene,
  Camera,
  DeferredRenderer,
  Texture2D,
  Shader,
  Material,
  vec3,
  mat3
} from 'claygl';
import GBufferCompositeNode from './GBufferNode';

import { lightVolumeVertex } from '../../../src/shader/source/deferred/lightvolume.glsl';
import { deferredAreaLightFragment } from './rectAreaLight.glsl';
import RectAreaLight, { RECT_AREA_LIGHT_TYPE } from './RectAreaLight';
import { LTC_MAT_1, LTC_MAT_2 } from './ltc';

const rectAreaLightShader = new Shader(lightVolumeVertex, deferredAreaLightFragment);

class LightingCompositeNode extends CompositeNode<
  'gBufferTexture1' | 'gBufferTexture2' | 'gBufferTexture3' | 'gBufferTexture4',
  'color'
> {
  private _scene: Scene;
  private _camera: Camera;

  private _deferredRenderer: DeferredRenderer;
  private _rectLightMaterial = new Material(rectAreaLightShader);

  constructor(scene: Scene, camera: Camera) {
    super();
    this._scene = scene;
    this._camera = camera;

    this._deferredRenderer = new DeferredRenderer();
    this._deferredRenderer.autoResize = false;

    const commonOpts = {
      minFilter: constants.NEAREST,
      magFilter: constants.LINEAR,
      wrapS: constants.CLAMP_TO_EDGE,
      wrapT: constants.CLAMP_TO_EDGE,
      flipY: false,
      sRGB: false
    };
    const ltc1Tex = new Texture2D({
      source: {
        width: 64,
        height: 64,
        data: new Float32Array(LTC_MAT_1)
      },
      ...commonOpts
    });
    const ltc2Tex = new Texture2D({
      source: {
        width: 64,
        height: 64,
        data: new Float32Array(LTC_MAT_2)
      },
      ...commonOpts
    });

    this._deferredRenderer.extendLightType<RectAreaLight>(RECT_AREA_LIGHT_TYPE, {
      fullQuad: true,
      getLightMaterial: (light) => {
        const material = this._rectLightMaterial;
        const lightHalfWidth = vec3.fromValues(light.width / 2, 0, 0);
        const lightHalfHeight = vec3.fromValues(0, light.height / 2, 0);
        const m4 = light.worldTransform.array;
        const m3 = mat3.fromMat4(mat3.create(), m4);
        vec3.transformMat3(lightHalfWidth, lightHalfWidth, m3);
        vec3.transformMat3(lightHalfHeight, lightHalfHeight, m3);

        material.set(
          'lightColor',
          vec3.scale(vec3.create(), light.color as vec3.Vec3Array, light.intensity)
        );
        material.set('lightPosition', light.getWorldPosition().array);

        material.set('ltc_1', ltc1Tex);
        material.set('ltc_2', ltc2Tex);
        material.set('lightHalfWidth', lightHalfWidth);
        material.set('lightHalfHeight', lightHalfHeight);

        return material;
      }
    });

    this.outputs = {
      color: {
        type: constants.HALF_FLOAT
      }
    };
  }

  fromGBufferNode(node: GBufferCompositeNode) {
    this.inputs = {
      gBufferTexture1: {
        node,
        output: 'texture1'
      },
      gBufferTexture2: {
        node,
        output: 'texture2'
      },
      gBufferTexture3: {
        node,
        output: 'texture3'
      },
      gBufferTexture4: {
        node,
        output: 'texture4'
      }
    };
  }

  prepare(renderer: Renderer): void {}
  render(
    renderer: Renderer,
    inputTextures?: Record<
      | 'gBufferTexture1'
      | 'gBufferTexture2'
      | 'gBufferTexture3'
      | 'gBufferTexture4'
      | 'gBufferTexture5',
      Texture2D
    >,
    outputTextures?: Record<'color', Texture2D>,
    frameBuffer?: FrameBuffer
  ): void {
    if (!(outputTextures && outputTextures.color)) {
      // Needs resize manually
      this._deferredRenderer.resize(
        inputTextures!.gBufferTexture1.width,
        inputTextures!.gBufferTexture1.height
      );
    }
    this._deferredRenderer.render(renderer, this._scene, this._camera, {
      notUpdateScene: true,
      gBufferTexture1: inputTextures!.gBufferTexture1,
      gBufferTexture2: inputTextures!.gBufferTexture2,
      gBufferTexture3: inputTextures!.gBufferTexture3,
      gBufferTexture4: inputTextures!.gBufferTexture4,
      targetTexture: outputTextures && outputTextures.color
    });
  }
}

export default LightingCompositeNode;

import type Geometry from '../Geometry';
import type AmbientCubemap from '../light/AmbientCubemap';
import type Material from '../Material';
import type Renderer from '../Renderer';
import type Scene from '../Scene';
import type Texture from '../Texture';

type Resource = Geometry | Texture;
const usedMap = new WeakMap<Resource, number>();

function markUnused(resourceList: Resource[]) {
  for (let i = 0; i < resourceList.length; i++) {
    usedMap.set(resourceList[i], 0);
  }
}

function checkAndDispose(renderer: Renderer, resourceList: Resource[]) {
  for (let i = 0; i < resourceList.length; i++) {
    if (!usedMap.get(resourceList[i])) {
      resourceList[i].dispose(renderer);
    }
  }
}

function updateUsed(resource: Resource, list: Resource[]) {
  const used = (usedMap.get(resource) || 0) + 1;
  usedMap.set(resource, used);
  if (used === 1) {
    // Don't push to the list twice.
    list.push(resource);
  }
}
function collectResources(
  scene: Scene,
  textureResourceList: Texture[],
  geometryResourceList: Geometry[]
) {
  let prevMaterial: Material;
  let prevGeometry: Geometry;
  scene.traverse(function (renderable) {
    if (renderable.isRenderable()) {
      const geometry = renderable.geometry;
      const material = renderable.material;

      // TODO optimize!!
      if (material !== prevMaterial) {
        const textureUniforms = material.getTextureUniforms();
        for (let u = 0; u < textureUniforms.length; u++) {
          const uniformName = textureUniforms[u];
          const val = material.uniforms[uniformName].value;
          const uniformType = material.uniforms[uniformName].type;
          if (!val) {
            continue;
          }
          if (uniformType === 't') {
            updateUsed(val, textureResourceList);
          } else if (uniformType === 'tv') {
            for (let k = 0; k < val.length; k++) {
              if (val[k]) {
                updateUsed(val[k], textureResourceList);
              }
            }
          }
        }
      }
      if (geometry !== prevGeometry) {
        updateUsed(geometry, geometryResourceList);
      }

      prevMaterial = material;
      prevGeometry = geometry;
    }
  });

  for (let k = 0; k < scene.lights.length; k++) {
    const cubemap = (scene.lights[k] as AmbientCubemap).cubemap;
    // Track AmbientCubemap
    cubemap && updateUsed(cubemap, textureResourceList);
  }
}

export default class GPUResourceManager {
  private _renderer: Renderer;
  private _texturesList: Texture[] = [];
  private _geometriesList: Geometry[] = [];

  constructor(renderer: Renderer) {
    this._renderer = renderer;
  }

  collect(scene: Scene) {
    const renderer = this._renderer;
    const texturesList = this._texturesList;
    const geometriesList = this._geometriesList;
    // Mark all resources unused;
    markUnused(texturesList);
    markUnused(geometriesList);

    // Collect resources used in this frame.
    const newTexturesList: Texture[] = [];
    const newGeometriesList: Geometry[] = [];
    collectResources(scene, newTexturesList, newGeometriesList);

    // Dispose those unsed resources.
    checkAndDispose(renderer, texturesList);
    checkAndDispose(renderer, geometriesList);

    this._texturesList = newTexturesList;
    this._geometriesList = newGeometriesList;
  }
}

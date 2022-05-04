import Timeline from './Timeline';

export { default as Renderer } from './Renderer';
export { default as Material } from './Material';
export { default as Shader } from './Shader';
export { default as Node } from './Node';
export { default as Renderable } from './Renderable';
export { default as Mesh } from './Mesh';
export { default as InstancedMesh } from './InstancedMesh';
export { default as GeometryBase } from './GeometryBase';
export { default as Geometry } from './Geometry';
export { default as StaticGeometry } from './StaticGeometry';
export { default as Skeleton } from './Skeleton';
export { default as Joint } from './Joint';
export { default as FrameBuffer } from './FrameBuffer';
export { default as Scene } from './Scene';

export { default as StandardMaterial } from './StandardMaterial';

export { Timeline };

export { default as Texture2D } from './Texture2D';
export { default as TextureCube } from './TextureCube';

export function startTimeline(onframe?: (deltaTime: number) => void) {
  const timeline = new Timeline();
  timeline.start();
  if (onframe) {
    timeline.on('frame', onframe);
  }
  return timeline;
}

export {
  Perspective as PerspectiveCamera,
  Orthographic as OrthographicCamera
} from './camera/index';

export {
  Ambient as AmbientLight,
  AmbientCubemap as AmbientCubemapLight,
  AmbientSH as AmbientSHLight,
  Directional as DirectionalLight,
  Point as PointLight,
  Sphere as SphereLight,
  Spot as SpotLight,
  Tube as TubeLight
} from './light/index';

export {
  Cone as ConeGeometry,
  Cube as CubeGeometry,
  Cylinder as CylinderGeometry,
  ParametricSurface as ParametricSurfaceGeometry,
  Plane as PlaneGeometry,
  Sphere as SphereGeometry
} from './geometry/index';

export * from './math';

export { color } from './core';

export * as easing from './animation/easing';

export {
  BasicShader,
  LambertShader,
  WireframeShader,
  StandardShader,
  StandardMRShader
} from './shader/index';

export { load as loadGLTF, parse as parseGLTF, parseBinary as parseGLB } from './loader/GLTF';

export { default as ShadowMapPass } from './prePass/ShadowMap';
export { default as EnvironmentMapPass } from './prePass/EnvironmentMap';

export { default as OrbitControl } from './plugin/OrbitControl';
export { default as FreeControl } from './plugin/FreeControl';
export { default as GamepadControl } from './plugin/GamepadControl';

export { default as Skybox } from './plugin/Skybox';

export * as meshUtil from './util/mesh';
export * as textureUtil from './util/texture';

export { default as App3D } from './App3D';

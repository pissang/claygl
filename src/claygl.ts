import Timeline from './Timeline';

// Core
export { default as Renderer } from './Renderer';
export { default as Material } from './Material';
export { default as Shader } from './Shader';
export { default as Node } from './Node';
export { default as Renderable } from './Renderable';
export { default as Mesh } from './Mesh';
export { default as InstancedMesh } from './InstancedMesh';
export { default as GeometryBase } from './GeometryBase';
export { default as Geometry } from './Geometry';
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

export * as constants from './core/constants';

// Camera
export {
  Perspective as PerspectiveCamera,
  Orthographic as OrthographicCamera
} from './camera/index';

// Light
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

// Procedural Geometry
export {
  Cone as ConeGeometry,
  Cube as CubeGeometry,
  Cylinder as CylinderGeometry,
  ParametricSurface as ParametricSurfaceGeometry,
  Plane as PlaneGeometry,
  Sphere as SphereGeometry
} from './geometry/index';

// Math
export * from './math';

// Utilities
export { color } from './core';

// Easing
export * as easing from './animation/easing';

// Bultin shader
export {
  BasicShader,
  LambertShader,
  WireframeShader,
  StandardShader,
  StandardMRShader
} from './shader/index';

// Picking
export { pick as pickByRay, pickAll as pickAllByRay } from './picking/rayPicking';
export { default as PixelPicking } from './picking/PixelPicking';

// GLTF Loader
export { load as loadGLTF, parse as parseGLTF, parseBinary as parseGLB } from './loader/GLTF';

// Rendering pass
export { default as ShadowMapPass } from './prePass/ShadowMap';
export { default as EnvironmentMapPass } from './prePass/EnvironmentMap';

// Controls
export { default as OrbitControl } from './plugin/OrbitControl';
export { default as FreeControl } from './plugin/FreeControl';
export { default as GamepadControl } from './plugin/GamepadControl';

export { default as Skybox } from './plugin/Skybox';

// Utilities
export * as meshUtil from './util/mesh';
export * as textureUtil from './util/texture';

export { default as App3D } from './App3D';

// Composite
export { default as FullscreenQuadPass } from './composite/Pass';
export { default as Compositor } from './composite/Compositor';
export { default as CompositeNode } from './composite/CompositeNode';
export { default as FilterCompositeNode } from './composite/FilterNode';
export { default as SceneCompositeNode } from './composite/SceneNode';
export { default as TextureCompositeNode } from './composite/TextureNode';
export { default as GroupCompositeNode } from './composite/GroupNode';

export { default as registerBuiltinCompositeShaders } from './shader/registerBuiltinCompositeShaders';

// Deferred renderer
export { default as DeferredGBuffer } from './deferred/GBuffer';
export { default as DeferredRenderer } from './deferred/Renderer';

// Particles
export { default as ParticleEmitter } from './particle/Emitter';
export { default as ParticleRenderable } from './particle/ParticleRenderable';
export { default as ForceField } from './particle/ForceField';

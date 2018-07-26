import { Renderer } from './Renderer';
import { Scene } from './Scene';
import { Timeline } from './Timeline';
import { Texture2D } from './Texture2D';
import { TextureCube } from './TextureCube';
import { Material } from './Material';
import { Geometry } from './Geometry';
import { Node } from './Node';
import { Mesh } from './Mesh';
import { Vector3 } from './math/Vector3';
import { Directional as DirectionalLight } from './light/Directional';
import { Ambient as AmbientLight } from './light/Ambient';
import { AmbientCubemap as AmbientCubemapLight } from './light/AmbientCubemap';
import { AmbientSH as AmbientSHLight } from './light/AmbientSH';
import { Spot as SpotLight } from './light/Spot';
import { Point as PointLight } from './light/Point';
import { Perspective as PerspectiveCamera } from './camera/Perspective';
import { Orthographic as OrthographicCamera } from './camera/Orthographic';
import { Point as PointLight } from './light/Point';
import { IGLTFLoaderResult } from './loader/GLTF';
import { ShadowMap } from './prePass/ShadowMap';
import { IDictionary } from './core/container';

interface IGraphicOption {

    shadow?: boolean;

    linear?: boolean;

    tonemapping?: boolean
}

interface ILoadTextureOpts {
    flipY?: boolean;
    convertToPOT?: boolean;

    anisotropic?: number;
    wrapS?: number;
    wrapT?: number;
    minFilter?: number;
    magFilter?: number;
    exposure?: number;
}

type ImageLike = HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|string;

type Texture2DLike = ImageLike|Texture2D;

interface ITextureCubeImageList {
    px: ImageLike;
    py: ImageLike;
    pz: ImageLike;
    nx: ImageLike;
    ny: ImageLike;
    nz: ImageLike;
}

interface IMaterialBasicConfig {
    name?: string,
    shader?: string;
    transparent?: boolean;
    textureConvertToPOT?: boolean;
    textureFlipY?: boolean;
}

interface IStandardMRMaterialConfig {
    name?: string,
    shader: 'clay.standardMR';
    color?: RGBLike;
    emission?: RGBLike;

    alpha?: number;
    roughness?: number;
    metalness?: number;
    emissionIntensity?: number;
    alphaCutoff?: number;

    diffuseMap?: Texture2DLike;
    metalnessMap?: Texture2DLike;
    roughnessMap?: Texture2DLike;
    normalMap?: Texture2DLike;
    emissiveMap?: Texture2DLike;

    texturesReady?: (textures: Texture2D[]) => void;
    textureLoaded?: (textureName: string, texture: Texture2D) => void;
}

type MaterialConfig = IMaterialBasicConfig|IStandardMRMaterialConfig;
type MaterialLike = MaterialConfig|Material;

type Vector3Like = Vector3|[number, number, number]|Float32Array|Float64Array;

type RGBLike = [number, number, number]|string;

export namespace application {

    interface IAppNS {
        init: (app: App3D) => PromiseLike;

        loop?: (app: App3D) => void;

        beforeRender?: (app: App3D) => void;
        afterRender ?: (app: App3D) => void;

        width?: number;

        height?: number;

        devicePixelRatio?: number;

        graphic?: IGraphicOption;

        event?: boolean;

        autoRender?: boolean;

        methods?: IDictionary<Function>;
    }

    export class App3D {
        constructor(dom: HTMLElement|string, appNS: IAppNS);

        readonly container: HTMLElement;

        readonly renderer: Renderer;

        readonly scene: Scene;

        readonly timeline: Timeline;

        readonly frameTime: number;

        readonly elapsedTime: number;

        readonly width: number;
        readonly height: number;

        readonly methods: IDictionary<Function>;

        render(): void;

        resize(width: number, height: number): void;

        dispose(): void;

        loadTexture(img: ImageLike, opts?: ILoadTextureOpts, useCache?: boolean): Promise<Texture2D>;
        loadTextureSync(img: ImageLike, opts?: ILoadTextureOpts, useCache?: boolean): Texture2D;

        loadTextureCube(imgList: ITextureCubeImageList, opts?: ILoadTextureOpts): Promise<TextureCube>;
        loadTextureCubeSync(imgList: ITextureCubeImageList, opts?: ILoadTextureOpts): TextureCube;

        createMaterial(matConfig: MaterialConfig): Material;
        createMesh(geometry: Geometry, material?: MaterialLike, parentNode?: Node): Mesh;
        createNode(parentNode?: Node): Node;

        createCube(material?: MaterialLike, parentNode?: Node, subdiv?: number|number[]): Mesh;
        createCubeInside(material?: MaterialLike, parentNode?: Node, subdiv?: number|number[]): Mesh;
        createSphere(material?: MaterialLike, parentNode?: Node, subdiv?: number|number[]): Mesh;
        createPlane(material?: MaterialLike, parentNode?: Node, subdiv?: number|number[]): Mesh;
        createParametricSurface(material?: MaterialLike, parentNode?: Node, subdiv?: number|number[]): Mesh;

        createCamera(position?: Vector3Like, target?: Vector3Like, type?: 'orthographic'|'ortho'|'perspective'): PerspectiveCamera|OrthographicCamera;
        createCamera(position?: Vector3Like, target?: Vector3Like, type?: 'orthographic'|'ortho', extent?: Vector3Like): PerspectiveCamera|OrthographicCamera;

        createDirectionalLight(direction?: Vector3Like, color?: RGBLike, intensity?: number): DirectionalLight;
        createSpotLight(position?: Vector3Like, target?: Vector3Like, range?: number, color?: RGBLike, intensity?: number): SpotLight;
        createPointLight(position?: Vector3Like, range?: number, color?: RGBLike, intensity?: number): PointLight;
        createAmbientLight(color?: RGBLike, intensity?: number): AmbientLight;
        createAmbientCubemapLight(envImage: ImageLike|TextureCube, specularIntensity?: number, diffuseIntensity?: number, exposure?: number, prefilteredCubemapSize?: number): {
            specular: AmbientCubemapLight,
            diffuse: AmbientSHLight,
            environmentMap: TextureCube|Texture2D
        }

        loadModel(url: string, opts: {
            shader?: string;
            waitTextureLoaded?: boolean;
            autoPlayAnimation?: boolean;
            upAxis?: 'y'|'z';
            textureFlipY?: boolean;
            textureConvertToPOT?: boolean;
            textureRootPath?: string
        }, parentNode?: Node): Promise<IGLTFLoaderResult>

        cloneNode(node: Node, parentNode?: Node): Node;
    }

    export function create(dom: HTMLElement|string, appNS: IAppNS): App3D;
}

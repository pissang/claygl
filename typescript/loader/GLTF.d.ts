import { Base} from '../core/Base';
import { Mesh} from '../Mesh';
import { Texture} from '../Texture';
import { TrackClip} from '../animation/TrackClip';
import { Material} from '../Material';
import { Skeleton} from '../Skeleton';
import { Scene} from '../Scene';
import { Camera} from '../Camera';
import { Node } from '../Node';

interface IGLTFLoaderOption {
    rootPath?: string;
    textureRootPath?: string;
    bufferRootPath?: string;

    shader?: string;
    crossOrigin?: string;
    textureFlipY?: boolean;
    textureConvertToPOT?: boolean;

    includeMaterial?: boolean;
    includeCamera?: boolean;
    includeMesh?: boolean;
    includeTexture?: boolean;

    shaderName?: string;
}

export interface IGLTFLoaderResult {
    scene?: Scene;
    rootNode?: Node;
    nodes: Nodes[];
    cameras: Camera[];
    textures: Texture[];
    materials: Material[];
    skeletons: Skeleton[];
    clips: TrackClip[];
    meshes: Mesh[];
    json: Object
}

export class GLTF extends Base {

    constructor(option?: IGLTFLoaderOption);

    rootPath: string;
    textureRootPath: string;
    bufferRootPath: string;

    shader: string;
    crossOrigin: string;
    textureFlipY: boolean;
    textureConvertToPOT: boolean;

    includeMaterial: boolean;
    includeCamera: boolean;
    includeMesh: boolean;
    includeTexture: boolean;


    load(url: string): void;

    parseBinary(buffer:ArrayBuffer): IGLTFLoaderResult;

    parse(json: Object, buffers?: ArrayBuffer[]): IGLTFLoaderResult;

    once(name: "success", handler: (result?: IGLTFLoaderResult) => void, context?: any): void;
    once(name: string, handler: Function, context?: any): void;
    success(handler: (result: IGLTFLoaderResult)=> void, context?: any);
}
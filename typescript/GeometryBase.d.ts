import { BoundingBox } from './math/BoundingBox';
import { Base } from './core/Base';
import { Matrix4 } from './math/Matrix4';
import { Renderer } from './Renderer';


export interface IGeometryAttributeBuffer {
    name: string;
    type: string;
    size: number;
    semantic?: string;
    symbol: string;
    buffer: WebGLBuffer;
}

export interface IGeometryBufferChunk {
    attributeBuffers : IGeometryAttributeBuffer[];
    indicesBuffer: WebGLBuffer;
}

export interface IStaticGeometryAttribute {
    name: string;
    type: string;
    size: number;
    value: ArrayBufferView;

    init(nVertex: number): void;
}

export interface IDefaultStaticGeometryAttributes {
    position: IStaticGeometryAttribute;
    texcoord0: IStaticGeometryAttribute;
    texcoord1: IStaticGeometryAttribute;
    normal: IStaticGeometryAttribute;
    tangent: IStaticGeometryAttribute;
    color: IStaticGeometryAttribute;
    weight: IStaticGeometryAttribute;
    joint: IStaticGeometryAttribute;
    barycentric: IStaticGeometryAttribute;
}

export class GeometryBase extends Base {

    attributes: IDefaultStaticGeometryAttributes;

    indices: Uint16Array | Uint32Array;

    dynamic: boolean;

    vertexCount: number;

    triangleCount: number;

    dirty(): void;

    isUseIndices(): boolean;

    initIndicesFromArray(array: Array): void;

    setTriangleIndices(idx, arr: number[]): void;

    getTriangleIndices(idx, out: number[]): number[];

    createAttribute(name: string, type: string, size: number, semantic?: string): IStaticGeometryAttribute;

    removeAttribute(name: string): boolean;

    getEnabledAttributes(): string[];

    dispose(renderer: Renderer): void;

    static STATIC_DRAW: number;
    static DYNAMIC_DRAW: number;
    static STREAM_DRAW: number;
}
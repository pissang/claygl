import { BoundingBox } from './math/BoundingBox';
import { Base } from './core/Base';
import { Matrix4 } from './math/Matrix4';
import { Renderer } from './Renderer';


interface IGeometryAttributeBuffer {
    name: string;
    type: string;
    size: number;
    semantic?: string;
    symbol: string;
    buffer: WebGLBuffer;
}

interface IGeometryBufferChunk {
    attributeBuffers : IGeometryAttributeBuffer[];
    indicesBuffer: WebGLBuffer;
}

interface IStaticGeometryAttribute {
    name: string;
    type: string;
    size: number;
    value: ArrayBufferView;

    init(nVertex: number): void;
}

interface IDefaultStaticGeometryAttributes {
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

export class Geometry extends Base {

    attributes: IDefaultStaticGeometryAttributes;

    indices: Uint16Array | Uint32Array;

    dynamic: boolean;

    boundingBox: BoundingBox;

    dirty(): void;

    getVertexNumber(): number;

    getFaceNumber(): number;

    isUseFace(): boolean;

    isStatic(): boolean;

    isUniqueVertex(): boolean;

    createAttribute(name: string, type: string, size: number, semantic?: string): IStaticGeometryAttribute;

    removeAttribute(name: string): boolean;

    getEnabledAttributes(): string[];

    generateTangents(): void;

    generateUniqueVertex(): void;

    generateBarycentric(): void;

    applyTransform(matrix: Matrix4): void;

    dispose(renderer: Renderer): void;

    static STATIC_DRAW: number;
    static DYNAMIC_DRAW: number;
    static STREAM_DRAW: number;

    static AttributeBuffer: number;
    static IndicesBuffer: number;
    static Attribute: number;
}
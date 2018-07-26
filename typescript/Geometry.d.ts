import {
    GeometryBase, IGeometryAttributeBuffer, IGeometryBufferChunk,
    IStaticGeometryAttribute, IDefaultStaticGeometryAttributes
} from './GeometryBase';
import { Base } from './core/Base';
import { Matrix4 } from './math/Matrix4';


export class Geometry extends GeometryBase {

    boundingBox: BoundingBox;

    isUniqueVertex(): boolean;

    getEnabledAttributes(): string[];

    generateVertexNormals(): void;

    generateFaceNormals(): void;

    generateTangents(): void;

    generateUniqueVertex(): void;

    generateBarycentric(): void;

    applyTransform(matrix: Matrix4): void;

    static STATIC_DRAW: number;
    static DYNAMIC_DRAW: number;
    static STREAM_DRAW: number;
}
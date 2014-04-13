///<reference path="Geometry.d.ts" />
///<reference path="StaticGeometry.d.ts" />
///<reference path="math/Matrix4.d.ts" />
declare module qtek {

    interface IDynamicGeometryAttribute {
        name: string;
        type: string;
        size: number;
        value: any[];

        init(nVertex: number): void;
    }

    interface IDefaultDynamicGeometryAttributes {
        position: IDynamicGeometryAttribute;
        texcoord0: IDynamicGeometryAttribute;
        texcoord1: IDynamicGeometryAttribute;
        normal: IDynamicGeometryAttribute;
        tangent: IDynamicGeometryAttribute;
        color: IDynamicGeometryAttribute;
        weight: IDynamicGeometryAttribute;
        joint: IDynamicGeometryAttribute;
        barycentric: IDynamicGeometryAttribute;
    }

    export class DynamicGeometry extends Geometry {

        attributes: IDefaultDynamicGeometryAttributes;

        hint: number;

        faces: number[][];

        updateBoundingBox(): void;

        dirty(): void;

        getVertexNumber(): number;

        getFaceNumber(): number;

        getChunkNumber(): number;

        isUseFace(): boolean;

        isStatic(): boolean;

        isUniqueVertex(): boolean;

        createAttribute(name: string, type: string, size: number, semantic?: string): IDynamicGeometryAttribute;

        removeAttribute(name: string): boolean;

        getEnabledAttributes(): string[];

        getBufferChunks(gl: WebGLRenderingContext) : IGeometryBufferChunk[];

        generateVertexNormals(): void;

        generateFaceNormals(): void;

        generateTangents(): void;

        generateUniqueVertex(): void;

        generateBarycentric(): void;

        convertToStatic(geometry: StaticGeometry): StaticGeometry;

        applyTransform(matrix: math.Matrix4): void;

        dispose(gl: WebGLRenderingContext): void;
    }
}
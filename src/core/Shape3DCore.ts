import * as THREE from 'three';
import { type Vertex, type SupportedShapes, type Shape3DParams, SUPPORTED_SHAPES } from '../types';

export default class Shape3DCore extends THREE.Object3D {
    protected vertices: Vertex[] = [];

    protected shape!: SupportedShapes;

    constructor(params?: Partial<Shape3DParams>) {
        super();
        const { shape = SUPPORTED_SHAPES.LINE, vertices = [] } = params || {};

        this.setShape(shape);
        this.setVertices(vertices);
        this.update();
    }

    public setShape(shape: SupportedShapes): void {
        this.shape = shape;
    }

    public getShape(): SupportedShapes {
        return this.shape;
    }

    public setVertices(vertices: Vertex[]): void {
        this.vertices = vertices;
    }

    public getVertices(): Vertex[] {
        return this.vertices;
    }

    public update(): void {
        throw new Error('Method not implemented.');
    }
}

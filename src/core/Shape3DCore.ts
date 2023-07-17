import * as THREE from 'three';
import { type Vertex, type SupportedShapes, type Shape3DParams, SUPPORTED_SHAPES } from '../types';
import { getMidpoint } from '../utils';

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

    public updateVertex(index: number, vertex: Vertex): void {
        if (index < 0 || index >= this.vertices.length) throw new Error('Invalid index');
        this.vertices[index] = vertex;
        this.updateGeometry();
    }

    /**
     * Split the edge at the given index
     * I.e. `index - (index - 1)`
     *
     * N.B: Midpoints start at index 1.
     */
    public splitEdge(index: number): void {
        if (index < 0 || index >= this.vertices.length) throw new Error('Invalid index');
        const midpoint: Vertex = getMidpoint(this.vertices[index - 1], this.vertices[index]);

        // Insert the midpoint at index and shift the rest of the vertices
        this.vertices.splice(index, 0, midpoint);

        this.updateGeometry();
    }

    public removeVertex(index: number) {
        if (index < 0 || index >= this.vertices.length) throw new Error('Invalid index');
        if (this.vertices.length === 2) {
            console.warn('Cannot remove vertex. Shape must have at least 2 vertices');
            return;
        }
        this.vertices.splice(index, 1);
        this.updateGeometry();
    }

    public update(): void {
        throw new Error('Method not implemented.');
    }

    public updateGeometry(): void {}

    public updateMaterial(): void {}
}

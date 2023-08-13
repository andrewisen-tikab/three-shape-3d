import type { ColorRepresentation, Shape3DParams, Vertex } from '../types';

import * as THREE from 'three';

import Line from '../shapes/line';

import { getMidpoint } from '../utils';
import Area from '../shapes/area';

/**
 * Extract the shape's TYPE static property.
 */
export type ExtractShapeType<T = any> = {
    // @ts-ignore
    [K in keyof T]: T[K]['TYPE'];
};

/**
 * This is the base class for {@link Shape}s.
 *
 * Shapes are treaded as building blocks and are added as children to this object.
 *
 * A factory decides which {@link Shape3D.SUPPORTED_SHAPES} to add based on the {@link Shape3D.shapeType}.
 */
export default class Shape3D extends THREE.Object3D {
    /**
     * The supported shapes.
     *
     * Modify this array to add/remove shapes.
     * TypeScript will automatically infer the type of the array.
     */
    public static readonly SUPPORTED_SHAPES = [Line, Area] as const;

    /**
     * Helper property to check if an object is a {@link Shape3D}.
     */
    public isShape3D: boolean;

    /**
     * The type that {@link Shape3D} represents.
     */
    private shapeType: SupportedShapes;

    /**
     * The {@links Shape}s that make up the {@link Shape3D} object.
     */
    private shapes: Shape[] = [];

    /**
     * Ordered list of vertices.
     * First item is the start point, last item is the end point.
     */
    protected vertices: Vertex[];

    /**
     * Whether the line should be closed or not.
     * Some shapes will ignore this property and close the line anyway.
     */
    private closeLine: boolean;

    /**
     * Setup an empty {@link Shape3D} object.
     * Use a factory method to create a {@link Shape3D} object.
     * @param _params
     */
    constructor(_params?: Partial<Shape3DParams>) {
        super();
        this.isShape3D = true;
        this.vertices = [];
        this.shapes = [];
        this.shapeType = Line.TYPE;
        this.closeLine = false;
    }

    /**
     * Overrides the {@link Shape3D.vertices} with the given vertices.
     * @param vertices {@link Vertex}
     */
    public setVertices(vertices: Vertex[]): Shape3D {
        this.vertices = vertices;
        this.update();

        this.dispatchEvent({ type: 'vertices-updated', vertices });

        return this;
    }

    /**
     * @returns Readonly {@link Shape3D.vertices}
     */
    public getVertices(): Readonly<Vertex[]> {
        return this.vertices;
    }

    /**
     * Update a single vertex at the given index.
     * @param index The index of the {@link Vertex} to update. First item is the start point, last item is the end point.
     * @param vertex The new {@link Vertex}.
     */
    public updateVertex(index: number, vertex: Vertex): Shape3D {
        if (index < 0 || index >= this.vertices.length) throw new Error('Invalid index');
        this.vertices[index] = vertex;
        this.update();

        this.dispatchEvent({ type: 'vertex-updated', index });

        return this;
    }

    /**
     * Split the **edge (!)** at the given index
     * I.e. `index - (index - 1)`
     *
     * @param index N.B: Midpoints start at index 1.
     */
    public splitEdge(index: number): Shape3D {
        if (index < 0 || index >= this.vertices.length) throw new Error('Invalid index');
        const midpoint: Vertex = getMidpoint(this.vertices[index - 1], this.vertices[index]);

        // Insert the midpoint at index and shift the rest of the vertices
        this.vertices.splice(index, 0, midpoint);

        this.update();

        this.dispatchEvent({ type: 'edge-splitted', index });

        return this;
    }

    /**
     * Remove the vertex at the given index.
     * @param index The index of the {@link Vertex} to remove. First item is the start point, last item is the end point.
     */
    public removeVertex(index: number): Shape3D {
        if (index < 0 || index >= this.vertices.length) throw new Error('Invalid index');
        this.vertices.splice(index, 1);

        this.update();

        this.dispatchEvent({ type: 'vertex-removed', index });

        return this;
    }

    /**
     * Set the {@link Shape3D.shapeType} of the {@link Shape3D} object.
     * @param newShapeType The new {@link Shape3D.shapeType}.
     */
    public setShapeType(newShapeType: SupportedShapes): Shape3D {
        if (this.shapeType === newShapeType) return this;
        this.shapeType = newShapeType;

        this.update();

        this.dispatchEvent({ type: 'shape-type-updated', shapeType: newShapeType });

        return this;
    }

    /**
     * @returns Readonly {@link Shape3D.shapeType}
     */
    public getShapeType(): Readonly<SupportedShapes> {
        return this.shapeType;
    }

    /**
     * Dispose entire object.
     */
    public dispose(): void {
        // Clear first, then dispose.
        this.clear();
        this.disposeShapes();
    }

    /**
     * Set the vertices of the shape from an array of {@link THREE.Vector3}.
     * @param points The vertices of the shape as {@link THREE.Vector3} array.
     */
    setFromPoints(points: THREE.Vector3[]): Shape3D {
        const vertices: Vertex[] = points.map((point) => point.toArray());
        this.vertices = vertices;

        this.update();

        this.dispatchEvent({ type: 'vertices-updated', vertices });

        return this;
    }

    /**
     * Add a vertex to the end of the vertex list.
     * @param point A single {@link THREE.Vector3}.
     */
    addPoint(point: THREE.Vector3): Shape3D {
        const vertices = point.toArray();
        this.vertices = [...this.vertices, vertices];

        this.update();

        this.dispatchEvent({ type: 'point-added', point });

        return this;
    }

    /**
     * Add a {@link Shape} to the {@link Shape3D} object.
     * @param shape The {@link Shape} to add.
     */
    addShape(shape: Shape): Shape3D {
        const { object } = shape;
        this.add(object);
        this.shapes.push(shape);

        this.dispatchEvent({ type: 'shape-added', shape });

        return this;
    }

    /**
     * Rebuild the shape from the vertices.
     */
    public update(): void {
        if (this.vertices.length === 0) return;
        this.updateShapes();
    }

    /**
     * Internal method to update all shapes.
     * Each shape has its own update method.
     */
    private updateShapes(): void {
        for (let i = 0; i < this.shapes.length; i++) {
            this.shapes[i].update();
        }
    }

    /**
     * Dispose all shapes.
     */
    private disposeShapes(): void {
        for (let i = 0; i < this.shapes.length; i++) {
            this.disposeShape(this.shapes[i]);
        }
        this.shapes = [];
    }

    /**
     * Dispose a single {@link Shape}.
     */
    private disposeShape(shape: Shape): void {
        const { object } = shape;
        if (object) this.remove(object);
        shape.dispose();
    }

    /**
     * Set the {@link Shape3D.closeLine} property and update the shape.
     */
    setCloseLine(closeLine: boolean): Shape3D {
        this.closeLine = closeLine;

        this.update();

        this.dispatchEvent({ type: 'close-line-changed' });

        return this;
    }

    /**
     *
     * @returns Readonly {@link Shape3D.closeLine}
     */
    getCloseLine(): Readonly<boolean> {
        return this.closeLine;
    }
}

export interface Shape {
    parent: Shape3D;
    object: THREE.Object3D;
    setColor(color: ColorRepresentation): void;
    create(): void;
    update(): void;
    dispose(): void;
}

type SupportedShapes = ExtractShapeType<typeof Shape3D.SUPPORTED_SHAPES>[number];

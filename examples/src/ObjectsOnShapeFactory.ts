import * as THREE from 'three';
import Shape3D from '../../src/core/Shape3D';
import { AddObjectsOnShapeParams, Vertex } from '../../src/types';
import InstancedGLTF from './InstancedGLTF';

const _previousVertex = /* @__PURE__ */ new THREE.Vector3();
const _currentVertex = /* @__PURE__ */ new THREE.Vector3();
const _line = /* @__PURE__ */ new THREE.Vector3();
const _position = /* @__PURE__ */ new THREE.Vector3();
const _quaternion = /* @__PURE__ */ new THREE.Quaternion();
const scale = /* @__PURE__ */ 1;
const _scale = /* @__PURE__ */ new THREE.Vector3(scale, scale, scale);
const _matrix = /* @__PURE__ */ new THREE.Matrix4();
const _up = /* @__PURE__ */ new THREE.Vector3(0, 0, 1);
let _objectIndex = /* @__PURE__ */ 0;

/**
 * Special factory that allows objects to be placed on a shape.
 * Objects are placed on the shape by creating a line between two vertices and placing objects along that line.
 */
export default class ObjectsOnShapeFactory extends THREE.EventDispatcher {
    /**
     * Pool size for the objects.
     * @default 1_0000
     */
    private poolPosition: THREE.Vector3;

    private object?: InstancedGLTF;

    constructor() {
        super();
        this.poolPosition = new THREE.Vector3(0, -1_000_000, 0);
    }

    public setPoolPosition(position: THREE.Vector3Tuple): void {
        this.poolPosition.set(...position);
    }

    public getPoolPosition(): Readonly<THREE.Vector3> {
        return this.poolPosition;
    }

    public setPoolObject(parent: THREE.Object3D, object: THREE.Object3D): void {
        const instancedGLTF = new InstancedGLTF(object, this.poolPosition);
        this.object = instancedGLTF;
        parent.add(instancedGLTF);
    }

    private getEstimatedPoolSize(totalNumberOfObjects: number): Readonly<number> {
        return totalNumberOfObjects ^ 100;
    }

    public getPoolObject(): Readonly<THREE.Object3D | undefined> {
        return this.object;
    }

    public beginPool(
        parent: THREE.Object3D,
        object: THREE.Object3D,
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<AddObjectsOnShapeParams> = {},
    ): void {
        const totalNumberOfObjects = this.getTotalObjects(shape3D, params);
        const count = this.getEstimatedPoolSize(totalNumberOfObjects);

        parent.children.forEach((_child) => {
            const child = _child as InstancedGLTF;
            child?.dispose();
            parent.remove(child);
        });

        this.setPoolObject(parent, object);

        this.object!.setCount(count);
        this.object!.generate();

        this.addObjectsOnShape(shape3D, params);
    }

    public adjustPool(
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<AddObjectsOnShapeParams> = {},
    ) {
        this.addObjectsOnShape(shape3D, params);
        this.object!.updateRest(_objectIndex);
    }

    public endPool(): void {
        if (!this.object) throw new Error('No object to pool');
        this.object!.setCount(_objectIndex);
        this.object!.generate();
    }

    /**
     * Add objects on a `parent` using the `shape3D` as a base.
     * @param parent Parent object to add the objects on.
     * @param object Object to add on the parent.
     * @param shape3D Shape that holds the vertices.
     * @param params {@link AddObjectsOnShapeParams}
     */
    private getTotalObjects(
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<AddObjectsOnShapeParams> = {},
    ): number {
        const vertices = shape3D.getVertices();
        let totalNumberOfObjects = 0;
        for (let i = 1; i < vertices.length; i++) {
            const previousVertex = vertices[i - 1];
            const currentVertex = vertices[i];
            const numberOfObjects = this.getNumberOfObjects(previousVertex, currentVertex, params);
            totalNumberOfObjects += numberOfObjects;
        }
        return totalNumberOfObjects;
    }

    /**
     * Add objects on a `parent` using the `shape3D` as a base.
     * @param parent Parent object to add the objects on.
     * @param object Object to add on the parent.
     * @param shape3D Shape that holds the vertices.
     * @param params {@link AddObjectsOnShapeParams}
     */
    public addObjectsOnShape(
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<AddObjectsOnShapeParams> = {},
    ): void {
        _objectIndex = 0;
        const vertices = shape3D.getVertices();

        for (let i = 1; i < vertices.length; i++) {
            const previousVertex = vertices[i - 1];
            const currentVertex = vertices[i];
            this.addObjectsAlongLine(previousVertex, currentVertex, params);
        }
    }

    private getNumberOfObjects(
        previousVertex: Vertex,
        currentVertex: Vertex,
        params: Partial<AddObjectsOnShapeParams>,
    ): number {
        _previousVertex.fromArray(previousVertex);
        _currentVertex.fromArray(currentVertex);

        _line.subVectors(_currentVertex, _previousVertex);
        const distance = _line.length();
        const width = params?.width ?? 1;
        const numberOfObjects = Math.floor(distance / width);
        return numberOfObjects;
    }

    /**
     * Add multiple objects on a line.s
     * @param shape3D Shape that holds the vertices.
     * @param params {@link AddObjectsOnShapeParams}
     */
    private addObjectsAlongLine(
        previousVertex: Vertex,
        currentVertex: Vertex,
        params: Partial<AddObjectsOnShapeParams>,
    ): void {
        const numberOfObjects = this.getNumberOfObjects(previousVertex, currentVertex, params);
        for (let j = 0; j < numberOfObjects; j++) {
            this.addObjectOnLine(j, numberOfObjects);
        }
        _objectIndex += numberOfObjects;
    }

    /**
     * Add a single object on a line.
     * @param index Current object index.
     * @param numberOfObjects Total number of objects.
     */
    private addObjectOnLine(index: number, numberOfObjects: number): void {
        _position.copy(_previousVertex).addScaledVector(_line, index / numberOfObjects);
        _quaternion.setFromUnitVectors(_up, _line.clone().normalize());
        _matrix.compose(_position, _quaternion, _scale);
        this.object!.updateAt(_objectIndex + index, _matrix);
    }
}

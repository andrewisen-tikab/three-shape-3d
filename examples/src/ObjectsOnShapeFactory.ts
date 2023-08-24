import * as THREE from 'three';
import Shape3D from '../../src/core/Shape3D';
import { AddObjectsOnShapeParams, Vertex } from '../../src/types';
import InstancedGLTF from './InstancedGLTF';

const _previousVertex = /* @__PURE__ */ new THREE.Vector3();
const _currentVertex = /* @__PURE__ */ new THREE.Vector3();
const _line = /* @__PURE__ */ new THREE.Vector3();
const _position = /* @__PURE__ */ new THREE.Vector3();
const _quaternion = /* @__PURE__ */ new THREE.Quaternion();
const scaleScalar = /* @__PURE__ */ 1;
const _scale = /* @__PURE__ */ new THREE.Vector3(scaleScalar, scaleScalar, scaleScalar);
const _matrix = /* @__PURE__ */ new THREE.Matrix4();
const _up = /* @__PURE__ */ new THREE.Vector3(0, 0, 1);
/**
 * Helper variable to keep track of the index of the object in the pool.
 */
let _objectIndex = /* @__PURE__ */ 0;

/**
 * Special factory that allows objects to be placed on a shape.
 * Objects are placed on the shape by creating a line between two vertices and placing objects along that line.
 */
export default class ObjectsOnShapeFactory extends THREE.EventDispatcher {
    /**
     * The position of the pool.
     * Place the pool far away from the scene, so it does not interfere with the scene.
     */
    private poolPosition: THREE.Vector3;

    /**
     * The instanced object that is used to place objects on the shape.
     */
    private instancedGLTF?: InstancedGLTF;

    constructor() {
        super();
        this.poolPosition = new THREE.Vector3(0, -1_000_000, 0);
    }

    /**
     * Set the position of the pool.
     * @param position The position of the pool.
     */
    public setPoolPosition(position: THREE.Vector3Tuple): void {
        this.poolPosition.set(...position);
    }

    /**
     * @returns Read-only access to the position of the pool.
     */
    public getPoolPosition(): Readonly<THREE.Vector3> {
        return this.poolPosition;
    }

    /**
     * Set the instanced object that is used to place objects on the shape.
     * Also add the instanced object to the parent.
     * @param parent
     * @param object
     */
    public setInstancedGLTF(parent: THREE.Object3D, object: THREE.Object3D): void {
        const instancedGLTF = new InstancedGLTF(object, this.poolPosition);
        this.instancedGLTF = instancedGLTF;
        parent.add(instancedGLTF);
    }

    /**
     * @param totalNumberOfObjects Actual number of objects that will be placed on the shape.
     * @returns An estimated of pool size.
     */
    private getEstimatedPoolSize(totalNumberOfObjects: number): Readonly<number> {
        // TODO: Improve this estimation.
        return totalNumberOfObjects ^ 100;
    }

    /**
     * @returns Read-only access to the instanced object that is used to place objects on the shape.
     */
    public getInstancedGLTF(): Readonly<THREE.Object3D | undefined> {
        return this.instancedGLTF;
    }

    /**
     * Prepare the pool to add objects on a `parent` using the `shape3D` as a base.
     * This will add lots of objects on the pool, so it is recommended to call `endPool` after this.
     * @param parent Parent object to add the objects on.
     * @param object Object to add on the parent.
     * @param shape3D Shape that holds the vertices.
     * @param params {@link AddObjectsOnShapeParams}
     */
    public preparePool(
        parent: THREE.Object3D,
        object: THREE.Object3D,
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<AddObjectsOnShapeParams> = {},
    ): void {
        const totalNumberOfObjects = this.getTotalObjects(shape3D, params);
        const count = this.getEstimatedPoolSize(totalNumberOfObjects);

        // Clear parent just in case.
        parent.children.forEach((_child) => {
            const child = _child as InstancedGLTF;
            child?.dispose();
            parent.remove(child);
        });

        this.setInstancedGLTF(parent, object);

        this.instancedGLTF!.setCount(count);
        this.instancedGLTF!.generate();

        this.addObjectsOnShape(shape3D, params);
    }

    /**
     * Adjust the {@link THREE.Matrix4} (mainly the position) of the objects on the pool.
     * @param shape3D
     * @param params
     */
    public adjustPoolMatrices(
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<AddObjectsOnShapeParams> = {},
    ) {
        this.addObjectsOnShape(shape3D, params);
        this.instancedGLTF!.updateRest(_objectIndex);
    }

    /**
     * Remove unnecessary objects from the pool.
     */
    public endPool(): void {
        if (!this.instancedGLTF) throw new Error('No object to pool');
        this.instancedGLTF!.setCount(_objectIndex);
        this.instancedGLTF!.generate();
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

    /**
     * Get the number of objects that will be added on a line.
     * @param previousVertex Previous {@link Vertex}
     * @param currentVertex Current {@link Vertex}
     * @param params {@link AddObjectsOnShapeParams}
     * @returns
     */
    private getNumberOfObjects(
        previousVertex: Vertex,
        currentVertex: Vertex,
        params: Partial<AddObjectsOnShapeParams>,
    ): number {
        _previousVertex.fromArray(previousVertex);
        _currentVertex.fromArray(currentVertex);

        _line.subVectors(_currentVertex, _previousVertex);
        const distance = _line.length();
        const spacing = params?.spacing ?? 0;
        const width = params?.width ?? 1;
        const actualWidth = width + spacing;
        const numberOfObjects = Math.floor(distance / actualWidth);
        return numberOfObjects;
    }

    /**
     * Add **multiple (!)** objects on a line.
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
     * Add **a single (!)** object on a line.
     * @param index Current object index.
     * @param numberOfObjects Total number of objects.
     */
    private addObjectOnLine(index: number, numberOfObjects: number): void {
        _position.copy(_previousVertex).addScaledVector(_line, index / numberOfObjects);
        _quaternion.setFromUnitVectors(_up, _line.clone().normalize());
        _matrix.compose(_position, _quaternion, _scale);
        this.instancedGLTF!.updateAt(_objectIndex + index, _matrix);
    }
}

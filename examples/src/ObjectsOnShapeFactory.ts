import * as THREE from 'three';
import Shape3D from '../../src/core/Shape3D';
import { AddObjectsOnShapeParams, Vertex } from '../../src/types';

const _previousVertex = /* @__PURE__ */ new THREE.Vector3();
const _currentVertex = /* @__PURE__ */ new THREE.Vector3();
const _line = /* @__PURE__ */ new THREE.Vector3();
const _quaternion = /* @__PURE__ */ new THREE.Quaternion();
const _up = /* @__PURE__ */ new THREE.Vector3(0, 0, 1);

/**
 * Special factory that allows objects to be placed on a shape.
 * Objects are placed on the shape by creating a line between two vertices and placing objects along that line.
 */
export default class ObjectsOnShapeFactory extends THREE.EventDispatcher {
    /**
     * Add objects on a `parent` using the `shape3D` as a base.
     * @param parent Parent object to add the objects on.
     * @param object Object to add on the parent.
     * @param shape3D Shape that holds the vertices.
     * @param params {@link AddObjectsOnShapeParams}
     */
    public addObjectsOnShape(
        parent: THREE.Object3D,
        object: THREE.Object3D,
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<AddObjectsOnShapeParams> = {},
    ): void {
        parent.clear();
        const vertices = shape3D.getVertices();

        for (let i = 1; i < vertices.length; i++) {
            const previousVertex = vertices[i - 1];
            const currentVertex = vertices[i];
            this.addObjectsAlongLine(parent, object, previousVertex, currentVertex, params);
        }
    }

    /**
     * Add multiple objects on a line.s
     * @param parent Parent object to add the objects on.
     * @param object Object to add on the parent.
     * @param shape3D Shape that holds the vertices.
     * @param params {@link AddObjectsOnShapeParams}
     */
    private addObjectsAlongLine(
        parent: THREE.Object3D,
        object: THREE.Object3D,
        previousVertex: Vertex,
        currentVertex: Vertex,
        params: Partial<AddObjectsOnShapeParams>,
    ): void {
        _previousVertex.fromArray(previousVertex);
        _currentVertex.fromArray(currentVertex);

        _line.subVectors(_currentVertex, _previousVertex);
        const distance = _line.length();
        const width = params?.width ?? 1;
        const numberOfObjects = Math.floor(distance / width);

        for (let j = 0; j < numberOfObjects; j++) {
            this.addObjectOnLine(parent, object, j, numberOfObjects);
        }
    }

    /**
     * Add a single object on a line.
     * @param parent Parent object to add the objects on.
     * @param object Object to add on the parent.
     * @param index Current object index.
     * @param numberOfObjects Total number of objects.
     */
    private addObjectOnLine(
        parent: THREE.Object3D,
        object: THREE.Object3D,
        index: number,
        numberOfObjects: number,
    ): void {
        const objectClone = object.clone();
        const position = _previousVertex.clone().addScaledVector(_line, index / numberOfObjects);
        objectClone.position.copy(position);

        // Rotate object to match the line
        _quaternion.setFromUnitVectors(_up, _line.clone().normalize());
        objectClone.quaternion.copy(_quaternion);
        objectClone.rotateY(Math.PI / 2);
        parent.add(objectClone);
    }
}

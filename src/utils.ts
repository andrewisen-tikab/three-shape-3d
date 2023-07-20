import * as THREE from 'three';
import type { Vertex } from './types';

export const getMidpoint = (firstVertex: Vertex, secondVertex: Vertex): Vertex => [
    (firstVertex[0] + secondVertex[0]) / 2,
    (firstVertex[1] + secondVertex[1]) / 2,
    (firstVertex[2] + secondVertex[2]) / 2,
];

const _midpoint = new THREE.Vector3();
const _center = new THREE.Vector3();

/**
 * Offset a midpoint from a center.
 * @param midpoint
 * @param center
 * @param offsetDistance
 * @returns
 */
export const getMidpointOffsetFromCenter = (
    midpoint: Vertex,
    center: Vertex,
    offsetDistance = 1,
): Vertex => {
    _midpoint.fromArray(midpoint);
    _center.fromArray(center);
    const displacement = _midpoint.clone().sub(_center).normalize().multiplyScalar(offsetDistance);
    return _midpoint.clone().add(displacement).toArray();
};

const _firstVertex = new THREE.Vector3();
const _secondVertex = new THREE.Vector3();
const _line = new THREE.Vector3();
const _perpendicular = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export const getMidpointOffsetFromLine = (
    firstVertex: Vertex,
    secondVertex: Vertex,
    center: Vertex,
    offsetDistance = 1,
) => {
    _firstVertex.fromArray(firstVertex);
    _secondVertex.fromArray(secondVertex);
    _center.fromArray(center);

    _line.subVectors(_secondVertex, _firstVertex);
    _midpoint.addVectors(_firstVertex, _secondVertex).multiplyScalar(0.5);

    _perpendicular.crossVectors(_up, _line).normalize();

    const distance1 = _center.distanceTo(
        _midpoint.clone().add(_perpendicular.multiplyScalar(offsetDistance)),
    );

    const distance2 = _center.distanceTo(
        _midpoint.clone().add(_perpendicular.multiplyScalar(-offsetDistance)),
    );

    _midpoint.add(
        _perpendicular.multiplyScalar(distance1 > distance2 ? -offsetDistance : offsetDistance),
    );

    return _midpoint.toArray();
};

/**
 * Return the length of the line segment in 2D space.
 * @param firstVertex
 * @param secondVertex
 * @returns
 */
export const getLength2D = (firstVertex: Vertex, secondVertex: Vertex): number => {
    return Math.sqrt(
        Math.pow(firstVertex[0] - secondVertex[0], 2) +
            Math.pow(firstVertex[2] - secondVertex[2], 2),
    );
};

export const setLineLength = (index: number, lineLength: number, vertices: Vertex[]): Vertex => {
    const closedLine = vertices.length === index;

    const firstVertex = closedLine ? vertices[vertices.length - 1] : vertices[index - 1];
    const secondVertex = closedLine ? vertices[0] : vertices[index];

    _firstVertex.fromArray(firstVertex);
    _secondVertex.fromArray(secondVertex);

    _line.subVectors(_secondVertex, _firstVertex).normalize();
    _firstVertex.add(_line.multiplyScalar(lineLength));
    return _firstVertex.toArray();
};

export const getLineRotationAsDeg = (firstVertex: Vertex, secondVertex: Vertex) => {
    _firstVertex.fromArray(firstVertex);
    _secondVertex.fromArray(secondVertex);

    _line.subVectors(_secondVertex, _firstVertex).normalize();

    // Get the line's rotation.
    // const angleToXAxis = Math.atan2(_line.y, _line.x);
    const angleToXAxis = Math.atan2(_line.z, _line.x);

    // Convert the angle from radians to degrees
    const angleDegrees = THREE.MathUtils.radToDeg(angleToXAxis);

    return angleDegrees;
};

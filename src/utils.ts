import * as THREE from 'three';
import type { Vertex } from './types';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { addPrefix } from './controls/TransformShapeControls/labels';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

const lineMaterial = new LineMaterial({ color: 0xff0000, linewidth: 4 });
lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

export const getMidpoint = (firstVertex: Vertex, secondVertex: Vertex): Vertex => [
    (firstVertex[0] + secondVertex[0]) / 2,
    (firstVertex[1] + secondVertex[1]) / 2,
    (firstVertex[2] + secondVertex[2]) / 2,
];

const _midpoint3A = new THREE.Vector3();

const _midpoint3B = new THREE.Vector3();

const _center = new THREE.Vector3();

const _direction3 = new THREE.Vector3();

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
    _midpoint3A.fromArray(midpoint);
    _center.fromArray(center);
    const displacement = _midpoint3A
        .clone()
        .sub(_center)
        .normalize()
        .multiplyScalar(offsetDistance);
    return _midpoint3A.clone().add(displacement).toArray();
};

const _firstVertex = new THREE.Vector3();
const _secondVertex = new THREE.Vector3();
const _line3A = new THREE.Vector3();
const _line3B = new THREE.Vector3();
const _line2A = new THREE.Vector2();
const _line2B = new THREE.Vector2();

const _perpendicular = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
// @ts-ignore
const _x3 = new THREE.Vector3(1, 0, 0);
const _x2 = new THREE.Vector2(1, 0);

export const getMidpointOffsetFromLine = (
    firstVertex: Vertex,
    secondVertex: Vertex,
    center: Vertex,
    offsetDistance = 1,
) => {
    _firstVertex.fromArray(firstVertex);
    _secondVertex.fromArray(secondVertex);
    _center.fromArray(center);

    _line3A.subVectors(_secondVertex, _firstVertex);
    _midpoint3A.addVectors(_firstVertex, _secondVertex).multiplyScalar(0.5);

    _perpendicular.crossVectors(_up, _line3A).normalize();

    const distance1 = _center.distanceTo(
        _midpoint3A.clone().add(_perpendicular.multiplyScalar(offsetDistance)),
    );

    const distance2 = _center.distanceTo(
        _midpoint3A.clone().add(_perpendicular.multiplyScalar(-offsetDistance)),
    );

    _midpoint3A.add(
        _perpendicular.multiplyScalar(distance1 > distance2 ? -offsetDistance : offsetDistance),
    );

    return _midpoint3A.toArray();
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

    _line3A.subVectors(_secondVertex, _firstVertex).normalize();
    _firstVertex.add(_line3A.multiplyScalar(lineLength));
    return _firstVertex.toArray();
};

export const getLineRotationAsDeg = (firstVertex: Vertex, secondVertex: Vertex) => {
    _firstVertex.fromArray(firstVertex);
    _secondVertex.fromArray(secondVertex);

    _line3A.subVectors(_secondVertex, _firstVertex).normalize();

    // Get the line's rotation.
    // const angleToXAxis = Math.atan2(_line.y, _line.x);
    const angleToXAxis = Math.atan2(_line3A.z, _line3A.x);

    // Convert the angle from radians to degrees
    const angleDegrees = THREE.MathUtils.radToDeg(angleToXAxis);

    return angleDegrees;
};

/**
 * Get a curve representing the angle between two lines.
 * @param nextVertex
 * @param currentVertex
 * @param previousVertex
 * @returns
 */
export const generateAngle = (
    parent: THREE.Object3D,
    nextVertex: Vertex,
    currentVertex: Vertex,
    previousVertex: Vertex,
) => {
    // Setup the lines as a 2D vectors
    _line2A
        .set(currentVertex[0] - previousVertex[0], currentVertex[2] - previousVertex[2])
        .normalize();
    _line2B.set(nextVertex[0] - currentVertex[0], nextVertex[2] - currentVertex[2]).normalize();

    // Calculate angles relative to the x axis
    // const angleA = _line2A.angleTo(_x2);
    const angleB = _line2B.angleTo(_x2);

    // Calculate the angle between the two lines
    const angle = Math.PI - _line2A.angleTo(_line2B);

    // Determine if the angle is acute or obtuse.
    // If obtuse, then we should flip all the calculations.
    const shouldFlip = shouldFlipAngle(nextVertex, currentVertex, previousVertex);

    // The internal rotation of the `EllipseCurve`.
    const archRotation = shouldFlip ? Math.PI : angleB;
    // The external rotation of the arch.
    const ellipseCurveRotation = shouldFlip ? Math.PI + angleB : 0;

    // The angle of the `EllipseCurve`.
    const end = shouldFlip ? -angle : angle;

    // With that, we can create the `EllipseCurve`.
    const curve = new THREE.EllipseCurve(
        0,
        0, // centerX, centerY
        0.5,
        0.5, // xRadius, yRadius
        0,
        end, // startAngle, endAngle
        shouldFlip, // clockwise
        ellipseCurveRotation,
    );

    // And finally, convert to a set of 3D vertices.
    const positions: number[] = [];
    const points = curve.getPoints(50);
    for (let index = 0; index < points.length; index += 2) {
        const point = points[index];
        // LineGeometry doesn't seem to  like a 2D array of points.
        positions.push(point.x, point.y, 0);
    }

    const lineGeometry = new LineGeometry().setPositions(positions);

    const arch = new Line2(lineGeometry, lineMaterial);
    arch.computeLineDistances();

    // Rotate the arch so it faces +Y
    arch.rotation.x = Math.PI / 2;
    // Dunno??
    arch.rotation.z = archRotation;

    arch.position.set(currentVertex[0], currentVertex[1], currentVertex[2]);

    const divElement = document.createElement('div');
    divElement.className = 'shape-3d-label-container';

    const inputElement = document.createElement('input');
    inputElement.type = 'text';

    inputElement.className = 'shape-3d-label';
    inputElement.placeholder = `${THREE.MathUtils.radToDeg(Math.abs(angle)).toFixed(2)}`;
    inputElement.setAttribute('size', `${inputElement.getAttribute('placeholder')!.length}`);
    inputElement.oninput = addPrefix.bind(inputElement);

    divElement.appendChild(inputElement);
    const label = new CSS3DObject(divElement);

    const angleLabelPosition = getAngleLabelPosition(nextVertex, currentVertex, previousVertex);

    label.position.set(angleLabelPosition[0], angleLabelPosition[1], angleLabelPosition[2]);

    label.rotateX(-Math.PI / 2);
    label.scale.setScalar(1 / 50);

    parent.add(arch);
    parent.add(label);

    return arch;
};

/**
 * Determine if the angle between two lines is obtuse or acute.
 * If obtuse, then we should flip all the calculations.
 * @param nextVertex
 * @param currentVertex
 * @param previousVertex
 * @returns True if the angle is obtuse, false if acute.
 * @deprecated Not working atm.
 */
export const shouldFlipAngle = (
    nextVertex: Vertex,
    currentVertex: Vertex,
    previousVertex: Vertex,
) => {
    _firstVertex.fromArray(previousVertex);
    _secondVertex.fromArray(currentVertex);

    _line3A.subVectors(_secondVertex, _firstVertex);
    _midpoint3A.addVectors(_firstVertex, _secondVertex).multiplyScalar(0.5);

    _line2A.set(_line3A.x, _line3A.z);
    _line3A.multiplyScalar(0.5);

    _firstVertex.fromArray(currentVertex);
    _secondVertex.fromArray(nextVertex);

    _line3B.subVectors(_secondVertex, _firstVertex).multiplyScalar(0.5);
    _midpoint3B.addVectors(_firstVertex, _secondVertex).multiplyScalar(0.5);

    // Get the center point of _midpoint3A and _midpoint3B
    const center3 = _midpoint3A.add(_midpoint3B).multiplyScalar(0.5);

    // const center3 = _line3A.add(_line3B).multiplyScalar(0.5);
    // const center2 = new THREE.Vector2(center3.x, center3.z);

    _firstVertex.fromArray(previousVertex);

    _line2B.set(center3.x - _firstVertex.x, center3.z - _firstVertex.z);

    const crossProduct = _line2A.cross(_line2B);

    // if (crossProduct > 0) {
    //     console.log('The point P is on the right side of the line.');
    // } else if (crossProduct < 0) {
    //     console.log('The point P is on the left side of the line.');
    // } else {
    //     console.log('The point P is on the line.');
    // }

    return crossProduct < 0;
};

export const getAngleLabelPosition = (
    nextVertex: Vertex,
    currentVertex: Vertex,
    previousVertex: Vertex,
): Vertex => {
    _firstVertex.fromArray(previousVertex);
    _secondVertex.fromArray(currentVertex);

    _midpoint3A.addVectors(_firstVertex, _secondVertex).multiplyScalar(0.5);

    _firstVertex.fromArray(currentVertex);
    _secondVertex.fromArray(nextVertex);

    _midpoint3B.addVectors(_firstVertex, _secondVertex).multiplyScalar(0.5);

    const center3 = _midpoint3A.add(_midpoint3B).multiplyScalar(0.5);

    _firstVertex.fromArray(currentVertex);

    _direction3.subVectors(center3, _firstVertex).normalize().multiplyScalar(1.5);

    const position = _firstVertex.add(_direction3);

    return position.toArray();
};

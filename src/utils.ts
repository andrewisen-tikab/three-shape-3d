import * as THREE from 'three';
import type { Vertex } from './types';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { addPrefix } from './controls/TransformShapeControls/labels';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import CONFIG from './config';

const lineMaterial = new LineMaterial({ color: 0xff0000, linewidth: 4 });
lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

export const getMidpoint = (firstVertex: Vertex, secondVertex: Vertex): Vertex => [
    (firstVertex[0] + secondVertex[0]) / 2,
    (firstVertex[1] + secondVertex[1]) / 2,
    (firstVertex[2] + secondVertex[2]) / 2,
];

const _midpoint3A = /* @__PURE__ */ new THREE.Vector3();

const _midpoint3B = /* @__PURE__ */ new THREE.Vector3();

const _center /* @__PURE__ */ = new THREE.Vector3();

const _direction3 = /* @__PURE__ */ new THREE.Vector3();

const _interpolatedVector = /* @__PURE__ */ new THREE.Vector3();

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

const _firstVertex = /* @__PURE__ */ new THREE.Vector3();
const _secondVertex = /* @__PURE__ */ new THREE.Vector3();
const _line3A = /* @__PURE__ */ new THREE.Vector3();
const _line3B = /* @__PURE__ */ new THREE.Vector3();
const _line2A = /* @__PURE__ */ new THREE.Vector2();
const _line2B = /* @__PURE__ */ new THREE.Vector2();

const _perpendicular = /* @__PURE__ */ new THREE.Vector3();
const _up = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);
// @ts-ignore
const _x3 = /* @__PURE__ */ new THREE.Vector3(1, 0, 0);
const _x2 = /* @__PURE__ */ new THREE.Vector2(1, 0);

export const setOffsetPositionFromLine = (
    object: THREE.Object3D,
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

    const shouldFlip = distance1 > distance2;

    _midpoint3A.add(_perpendicular.multiplyScalar(shouldFlip ? -offsetDistance : offsetDistance));

    const offset = _midpoint3A.toArray();

    object.position.set(offset[0], offset[1], offset[2]);
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

export const setLineLength = (
    index: number,
    lineLength: number,
    vertices: Readonly<Vertex[]>,
): Vertex => {
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

    // Determine if the line is "positive slope".
    // If the slope is negative, then we need to flip the calculations.
    const lineBHasPositiveSlope = nextVertex[2] - currentVertex[2] < 0;

    // Calculate angles relative to the x axis
    // const angleA = _line2A.angleTo(_x2);
    const angleB = _line2B.angleTo(_x2);

    // Calculate the angle between the two lines
    const angle = Math.PI - _line2A.angleTo(_line2B);

    // Determine if the angle is acute or obtuse.
    // If obtuse, then we should flip all the calculations.
    const shouldFlip = shouldFlipAngle(nextVertex, currentVertex, previousVertex);

    // The internal rotation of the `EllipseCurve`.
    const archRotationA1 = lineBHasPositiveSlope ? Math.PI - angleB : -(Math.PI - angleB); // Should not flip.
    const archRotationB1 = lineBHasPositiveSlope ? Math.PI : -Math.PI; // Should flip.

    const archRotationA2 = Math.PI + archRotationA1; // Should not flip.
    const archRotationB2 = archRotationB1; // Should flip.
    const archRotation = shouldFlip ? archRotationB2 : archRotationA2; // Should flip.

    // The external rotation of the arch.
    const ellipseCurveRotationA1 = 0; // Should not flip.
    const ellipseCurveRotationB1 = lineBHasPositiveSlope ? -(Math.PI + angleB) : Math.PI + angleB; // Should flip.

    const ellipseCurveRotation = shouldFlip ? ellipseCurveRotationB1 : ellipseCurveRotationA1;

    // The angle of the `EllipseCurve`.
    const end = shouldFlip ? -angle : angle;

    // With that, we can create the `EllipseCurve`.
    const curve = new THREE.EllipseCurve(
        0,
        0, // centerX, centerY
        CONFIG.ANGLE_RADIUS,
        CONFIG.ANGLE_RADIUS, // xRadius, yRadius
        0,
        end, // startAngle, endAngle
        shouldFlip, // clockwise
        ellipseCurveRotation,
    );

    // And finally, convert to a set of 3D vertices.
    const positions: number[] = [];
    const points = curve.getPoints(CONFIG.ANGLE_DIVISIONS);
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
    inputElement.inputMode = 'numeric';
    inputElement.readOnly = true;
    inputElement.ondblclick = function (this: HTMLInputElement, _ev: MouseEvent) {
        this.readOnly = '' as unknown as boolean;
    } as any;

    const humanReadableAngles = THREE.MathUtils.radToDeg(Math.abs(angle)).toFixed(2);
    inputElement.className = 'shape-3d-label shape-3d-angle-label';
    inputElement.placeholder = `${humanReadableAngles}°`;
    inputElement.setAttribute('size', `${inputElement.getAttribute('placeholder')!.length - 1}`);
    inputElement.oninput = addPrefix.bind(inputElement);

    divElement.appendChild(inputElement);
    const label = new CSS3DObject(divElement);

    const angleLabelPosition = getAngleLabelPosition(
        nextVertex,
        currentVertex,
        previousVertex,
        humanReadableAngles,
    );

    label.position.set(angleLabelPosition[0], angleLabelPosition[1], angleLabelPosition[2]);

    label.rotateX(-Math.PI / 2);
    label.scale.setScalar(CONFIG.ANGLE_LABEL_SCALE);

    parent.add(arch);
    parent.add(label);

    return [arch, inputElement] as const;
};

/**
 * Determine if the angle between two lines is obtuse or acute.
 * If obtuse, then we should flip all the calculations.
 * @param nextVertex
 * @param currentVertex
 * @param previousVertex
 * @returns True if the angle is obtuse, false if acute.
 */
export const shouldFlipAngle = (
    nextVertex: Vertex,
    currentVertex: Vertex,
    previousVertex: Vertex,
) => {
    // Set first line as Vector2 (we'll use this later).
    _firstVertex.fromArray(previousVertex);
    _secondVertex.fromArray(currentVertex);
    _line3A.subVectors(_secondVertex, _firstVertex);
    _line2A.set(_line3A.x, _line3A.z);

    // Set first line's midpoint
    _midpoint3A.addVectors(_firstVertex, _secondVertex).multiplyScalar(0.5);

    // Set second line as Vector2.
    _firstVertex.fromArray(currentVertex);
    _secondVertex.fromArray(nextVertex);

    // Set first line's midpoint
    _midpoint3B.addVectors(_firstVertex, _secondVertex).multiplyScalar(0.5);

    // Get the center point, Point P, of _midpoint3A and _midpoint3B
    const center3 = _midpoint3A.add(_midpoint3B).multiplyScalar(0.5);

    // Now, we create a line from the first vertex to the center point.
    // Again, we define it as Vector 2
    _firstVertex.fromArray(previousVertex);

    _line3B.subVectors(center3, _firstVertex);
    _line2B.set(_line3B.x, _line3B.z);

    // If the cross product is positive, point P is on the right side of the line.
    // If the cross product is negative, point P is on the left side of the line.
    // If the cross product is zero, point P is on the line.
    const crossProduct = _line2A.cross(_line2B);

    return crossProduct < 0;
};

const angleOffsetDistance = /* @__PURE__ */ 4;

/**
 * Get the position of the co-called `angleLabel`.
 * @param nextVertex
 * @param currentVertex
 * @param previousVertex
 * @param humanReadableAngles
 */
export const getAngleLabelPosition = (
    nextVertex: Vertex,
    currentVertex: Vertex,
    previousVertex: Vertex,
    humanReadableAngles: string,
): Vertex => {
    // Set first line.
    _firstVertex.fromArray(previousVertex);
    _secondVertex.fromArray(currentVertex);
    _line3A.subVectors(_secondVertex, _firstVertex).normalize();

    // Set second line.
    _firstVertex.fromArray(currentVertex);
    _secondVertex.fromArray(nextVertex);
    _line3B.subVectors(_secondVertex, _firstVertex).normalize().multiplyScalar(-1);

    // Generate an interpolatedVector between the two lines.
    _interpolatedVector.copy(_line3A.lerp(_line3B, 0.5));
    // Normalize and add an offset.
    _interpolatedVector.normalize().multiplyScalar(-angleOffsetDistance);

    // Add the interpolatedVector to the currentVertex.
    _firstVertex.fromArray(currentVertex);
    _interpolatedVector.add(_firstVertex);

    if (humanReadableAngles === '180.00') {
        _firstVertex.fromArray(previousVertex);
        _secondVertex.fromArray(currentVertex);
        _direction3.subVectors(_secondVertex, _firstVertex);
        _interpolatedVector.add(
            _direction3.cross(_up).normalize().multiplyScalar(angleOffsetDistance),
        );
    }

    return _interpolatedVector.toArray();
};

export const setLineAngle = (
    index: number,
    angleInDegrees: number,
    vertices: Readonly<Vertex[]>,
): Vertex => {
    const closedLine = vertices.length === index;
    const firstVertex = closedLine ? vertices[vertices.length - 1] : vertices[index - 1];
    const secondVertex = closedLine ? vertices[0] : vertices[index];
    const thidVertex = closedLine ? vertices[0 + 1] : vertices[index + 1];

    _firstVertex.fromArray(secondVertex);
    _secondVertex.fromArray(thidVertex);
    _line3B.subVectors(_secondVertex, _firstVertex);

    const length = _line3B.length();

    _firstVertex.fromArray(firstVertex);
    _secondVertex.fromArray(secondVertex);
    _direction3.subVectors(_secondVertex, _firstVertex);

    _direction3.normalize();

    const newLineDirection = _direction3
        .clone()
        .applyAxisAngle(_up, THREE.MathUtils.degToRad(angleInDegrees));

    _secondVertex.fromArray(secondVertex);

    const newLineEnd = new THREE.Vector3().addVectors(
        _secondVertex,
        newLineDirection.multiplyScalar(-length),
    );

    return newLineEnd.toArray();
};

export const rotateShapeGeometry = (geometry: THREE.BufferGeometry): void => {
    geometry.rotateX(-Math.PI / 2);
    geometry.rotateY(-Math.PI);
    geometry.rotateZ(-Math.PI);
};

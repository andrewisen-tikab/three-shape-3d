import * as THREE from 'three';
import type { TransformShapeControls } from './TransformShapeControls';
import { Vertex } from '../../types';
import { getLength2D, getLineRotationAsDeg, getMidpointOffsetFromLine } from '../../utils';
import { addPrefix } from './labels';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

/**
 * Manages the labels for the {@link TransformShapeControls}.
 */
export default class LabelsManager extends THREE.EventDispatcher {
    private transformShapeControls: TransformShapeControls;

    private labels: CSS3DObject[] = [];

    constructor(transformShapeControls: TransformShapeControls) {
        super();
        this.transformShapeControls = transformShapeControls;
        this.labels = [];
    }

    /**
     * Call this every frame.
     */
    public update() {
        this.updatePositions();
    }

    /**
     * Add new labels to the object.
     */
    public addLabels() {
        if (!this.transformShapeControls.object) return;

        this.dispose();

        this.labels = [];
        const vertices = this.transformShapeControls.object.getVertices();

        // Get distance from camera to center of object
        const offsetDistance = 1;

        const center: Vertex = [
            this.transformShapeControls.vertexCenter.x,
            this.transformShapeControls.vertexCenter.y,
            this.transformShapeControls.vertexCenter.z,
        ];
        for (let index = 0; index < vertices.length; index++) {
            const vertex = vertices[index];
            if (index === 0) continue;
            const previousVertex = vertices[index - 1];
            const label = this.generateLabel(
                this.transformShapeControls.labelsGroup,
                index,
                vertex,
                previousVertex,
                center,
                offsetDistance,
            );
            this.labels.push(label);
        }

        if (this.transformShapeControls.object!.getCloseLine()) {
            const vertex = vertices[0];
            const previousVertex = vertices[vertices.length - 1];

            const label = this.generateLabel(
                this.transformShapeControls.labelsGroup,
                vertices.length,
                vertex,
                previousVertex,
                center,
                offsetDistance,
            );
            this.labels.push(label);
        }
    }

    /**
     * Updates the position of the labels based on the camera's distance.
     */
    private updatePositions(): void {
        if (!this.transformShapeControls.object) return;

        const vertices = this.transformShapeControls.object.getVertices();
        const offsetDistance =
            this.transformShapeControls.vertexCenter.distanceTo(
                this.transformShapeControls.camera.position,
            ) /
                100 +
            1.1;

        const center: Vertex = [
            this.transformShapeControls.vertexCenter.x,
            this.transformShapeControls.vertexCenter.y,
            this.transformShapeControls.vertexCenter.z,
        ];

        for (let i = 0; i < this.labels.length; i++) {
            const label = this.labels[i];
            const firstVertex = vertices[i];
            const secondVertex = i === vertices.length - 1 ? vertices[0] : vertices[i + 1];
            this.updatePosition(label, firstVertex, secondVertex, center, offsetDistance);
            this.updateRotation(label, firstVertex, secondVertex);
        }
    }

    private updatePosition(
        label: CSS3DObject,
        firstVertex: Vertex,
        secondVertex: Vertex,
        center: Vertex,
        offsetDistance: number,
    ) {
        const offset = getMidpointOffsetFromLine(firstVertex, secondVertex, center, offsetDistance);
        label.position.set(offset[0], offset[1], offset[2]);
    }

    private updateRotation(label: CSS3DObject, firstVertex: Vertex, secondVertex: Vertex) {
        const rotation = getLineRotationAsDeg(firstVertex, secondVertex);
        label.rotation.set(-Math.PI / 2, 0, -THREE.MathUtils.degToRad(rotation));
    }

    private generateLabel(
        parent: THREE.Object3D,
        index: number,
        firstVertex: Vertex,
        secondVertex: Vertex,
        center: Vertex,
        offsetDistance: number,
    ): CSS3DObject {
        const length = getLength2D(firstVertex, secondVertex);

        const divElement = document.createElement('div');
        divElement.className = 'shape-3d-label-container';

        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.inputMode = 'numeric';
        inputElement.readOnly = true;
        inputElement.ondblclick = function (this: HTMLInputElement, _ev: MouseEvent) {
            this.readOnly = '' as unknown as boolean;
        } as any;

        inputElement.id = 'myInput';
        inputElement.className = 'shape-3d-label';
        inputElement.placeholder = `${length.toFixed(2)}`;
        inputElement.setAttribute('size', `${inputElement.getAttribute('placeholder')!.length}`);
        inputElement.oninput = addPrefix.bind(inputElement);

        inputElement.addEventListener('blur', (e) => {
            this.onBlur(e, index);
        });

        divElement.appendChild(inputElement);
        const label = new CSS3DObject(divElement);
        label.rotateX(-Math.PI / 2);
        label.scale.setScalar(1 / 10);
        this.updatePosition(label, firstVertex, secondVertex, center, offsetDistance);
        parent.add(label);

        return label;
    }

    onBlur(e: FocusEvent, index: number) {
        // Get value of input
        const inputElement = e.target as HTMLInputElement;
        const value = inputElement.value;

        const number = parseFloat(value);

        if (isNaN(number)) {
            // @ts-ignore
            inputElement.value = null;
            return;
        }
        if (number <= 0) {
            // @ts-ignore
            inputElement.value = null;
            return;
        }

        this.transformShapeControls.setLineLength(index, number);
    }

    public dispose() {
        if (this.transformShapeControls.labelsGroup) {
            this.transformShapeControls.labelsGroup.clear();
        }

        for (let i = 0; i < this.labels.length; i++) {
            const label = this.labels[i];
            label?.parent?.remove(label);
        }
    }
}

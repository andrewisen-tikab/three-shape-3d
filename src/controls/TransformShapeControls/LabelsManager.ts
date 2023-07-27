import * as THREE from 'three';
import type { TransformShapeControls } from './TransformShapeControls';
import { Vertex } from '../../types';
import {
    generateAngle,
    getLength2D,
    getLineRotationAsDeg,
    setOffsetPositionFromLine,
} from '../../utils';
import { addPrefix } from './labels';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

/**
 * Manages the labels for the {@link TransformShapeControls}.
 */
export default class LabelsManager extends THREE.EventDispatcher {
    private transformShapeControls: TransformShapeControls;

    private labels: CSS3DObject[] = [];
    private angles: THREE.Mesh[] = [];

    public showLengthLabels: boolean;

    public showAngleLabels: boolean;

    constructor(transformShapeControls: TransformShapeControls) {
        super();
        this.transformShapeControls = transformShapeControls;
        this.labels = [];
        this.angles = [];
        this.showAngleLabels = true;
        this.showLengthLabels = true;
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
        this.angles = [];
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
            if (this.showLengthLabels) {
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

            if (index !== vertices.length - 1) {
                if (this.showAngleLabels) {
                    const nextVertex = vertices[index + 1];
                    const [angle, inputElement] = this.generateAngle(
                        this.transformShapeControls.labelsGroup,
                        index,
                        nextVertex,
                        vertex,
                        previousVertex,
                    );
                    inputElement.addEventListener('blur', (e) => {
                        this.onBlur(e, index, 'angle');
                    });
                    this.angles.push(angle);
                }
            }
        }

        if (this.transformShapeControls.object!.getCloseLine()) {
            if (this.showLengthLabels) {
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
            0.8;

        const center: Vertex = [
            this.transformShapeControls.vertexCenter.x,
            this.transformShapeControls.vertexCenter.y,
            this.transformShapeControls.vertexCenter.z,
        ];

        for (let i = 0; i < this.labels.length; i++) {
            const label = this.labels[i];
            const firstVertex = vertices[i];
            const secondVertex = i === vertices.length - 1 ? vertices[0] : vertices[i + 1];
            this.updateLabelPosition(label, firstVertex, secondVertex, center, offsetDistance);
            this.updateRotation(label, firstVertex, secondVertex);
        }
    }

    private updateLabelPosition(
        label: CSS3DObject,
        firstVertex: Vertex,
        secondVertex: Vertex,
        center: Vertex,
        offsetDistance: number,
    ) {
        setOffsetPositionFromLine(label, firstVertex, secondVertex, center, offsetDistance);
    }

    private updateRotation(label: CSS3DObject, firstVertex: Vertex, secondVertex: Vertex) {
        let rotation = getLineRotationAsDeg(firstVertex, secondVertex);

        if (rotation === 180) rotation = 0;

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
        inputElement.className = 'shape-3d-label shape-3d-length-label';
        inputElement.placeholder = `${length.toFixed(2)}m`;
        inputElement.setAttribute('size', `${inputElement.getAttribute('placeholder')!.length}`);
        inputElement.oninput = addPrefix.bind(inputElement);

        inputElement.addEventListener('blur', (e) => {
            this.onBlur(e, index, 'line');
        });

        divElement.appendChild(inputElement);
        const label = new CSS3DObject(divElement);
        label.rotateX(-Math.PI / 2);
        label.scale.setScalar(1 / 20);
        this.updateLabelPosition(label, firstVertex, secondVertex, center, offsetDistance);
        parent.add(label);

        return label;
    }

    private generateAngle(
        parent: THREE.Object3D,
        _index: number,
        nextVertex: Vertex,
        currentVertex: Vertex,
        previousVertex: Vertex,
    ) {
        return generateAngle(parent, nextVertex, currentVertex, previousVertex);
    }

    onBlur(e: FocusEvent, index: number, type: 'line' | 'angle') {
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

        if (type === 'line') {
            this.transformShapeControls.setLineLength(index, number);
        } else if (type === 'angle') {
            this.transformShapeControls.setLineAngle(index, number);
        }
    }

    public dispose() {
        if (this.transformShapeControls.labelsGroup) {
            this.transformShapeControls.labelsGroup.clear();
        }

        for (let i = 0; i < this.labels.length; i++) {
            const label = this.labels[i];
            label?.parent?.remove(label);
        }
        for (let i = 0; i < this.angles.length; i++) {
            const angle = this.labels[i];
            angle?.parent?.remove(angle);
        }
    }
}

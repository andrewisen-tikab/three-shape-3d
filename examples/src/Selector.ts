import type { Shape3D } from '../../src';
import { TransformShapeControls } from '../../src';

export default class Selector {
    public selectedShape: Shape3D | null;
    private transformControls?: TransformShapeControls;

    constructor() {
        this.selectedShape = null;
    }

    select(shape: Shape3D | null) {
        if (!shape?.isShape3D) throw new Error("Can't select a non-Shape3D object.");
        this.transformControls?.attach(shape);
        this.selectedShape = shape;
    }

    deselect() {
        if (this.selectedShape === null) return;
        this.onDeselect();
        this.selectedShape = null;
    }

    private onDeselect() {}
}

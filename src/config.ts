/**
 * Global configuration for the packages.
 */
const CONFIG = {
    /**
     * The scale of the angle label.
     */
    ANGLE_LABEL_SCALE: 1 / 20,
    VERTEX_SCALE: 1,
    /**
     * Offset value to combat Z-fighting, or stitching, or planefighting,
     * The value is added to the y-coordinate of certain parts of the object.
     */
    Z_FIGHTING_OFFSET: 0.01,
    LINE_COLOR: 0xffffff,
    LINE_OPACITY: 1,
    AREA_COLOR: 0xffffff,
    AREA_OPACITY: 1,
    VOLUME_COLOR: 0xffffff,
    VOLUME_OPACITY: 0.5,
};

export default CONFIG;

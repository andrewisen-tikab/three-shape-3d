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
};

export default CONFIG;

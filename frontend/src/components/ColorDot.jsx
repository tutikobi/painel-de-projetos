import { classNames } from "../utils/classNames.js";

export default function ColorDot({ color, large = false }) {
  return (
    <span
      className={classNames("color-dot", large && "large")}
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

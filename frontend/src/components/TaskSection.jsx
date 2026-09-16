import { classNames } from "../utils/classNames.js";

export default function TaskSection({
  title,
  tasks,
  danger = false,
  children,
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="task-section" aria-label={title}>
      <h2 className={classNames("section-title", danger && "danger")}>
        {title} ({tasks.length})
      </h2>
      <ul className="task-list">{tasks.map(children)}</ul>
    </section>
  );
}

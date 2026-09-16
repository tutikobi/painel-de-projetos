import { Droppable } from "@hello-pangea/dnd";
import { classNames } from "../../utils/classNames.js";

export default function KanbanColumn({ status, label, count, children }) {
  return (
    <Droppable droppableId={status}>
      {(provided, snapshot) => (
        <section
          className={classNames("column", snapshot.isDraggingOver && "over")}
          aria-label={label}
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          <h2 className="column-title">
            {label} <span className="count">{count}</span>
          </h2>
          {children}
          {provided.placeholder}
        </section>
      )}
    </Droppable>
  );
}

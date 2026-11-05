import type { TaskStatus } from "../types";


interface TaskFiltersProps {
  activeFilter: "all" | TaskStatus;
  onFilterChange: (filter: "all" | TaskStatus) => void;
}

const filters: { label: string; value: "all" | TaskStatus }[] = [
  { label: "All Tasks", value: "all" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "done" },
  { label: "Blocked", value: "blocked" },
];

function TaskFilters({
  activeFilter,
  onFilterChange,
}: TaskFiltersProps) {
  return (
    <div className="task-filters">
      {filters.map((filter) => (
        <button
          key={filter.value}
          className={
            activeFilter === filter.value
              ? "task-filter active"
              : "task-filter"
          }
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

export default TaskFilters;
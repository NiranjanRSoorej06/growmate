import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TaskCard from "./TaskCard.jsx";

const task = {
  id: 1,
  title: "Check soil moisture",
  frequency: "daily",
  plant_name: "Green chilli",
  due_date: "2026-10-10",
  completed: false,
};

describe("TaskCard", () => {
  it("calls onToggle when the checkbox is pressed", async () => {
    const onToggle = vi.fn();
    render(<ul><TaskCard task={task} today="2026-10-10" onToggle={onToggle} /></ul>);
    await userEvent.click(screen.getByRole("checkbox", { name: /mark done: check soil moisture/i }));
    expect(onToggle).toHaveBeenCalledWith(task);
  });

  it("shows overdue tasks clearly", () => {
    render(<ul><TaskCard task={{ ...task, due_date: "2026-10-08" }} today="2026-10-10" onToggle={() => {}} /></ul>);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("renders completed tasks as checked", () => {
    render(<ul><TaskCard task={{ ...task, completed: true }} today="2026-10-10" onToggle={() => {}} /></ul>);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });
});

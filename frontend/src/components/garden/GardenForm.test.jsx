import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GardenForm, { validate } from "./GardenForm.jsx";

describe("GardenForm", () => {
  it("shows errors and does not save an empty form", async () => {
    const onSave = vi.fn();
    render(<GardenForm onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: /save garden/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/enter the town or region/i)).toBeInTheDocument();
    expect(screen.getByText(/choose where you'll be growing/i)).toBeInTheDocument();
    expect(screen.getByText(/growing area in square metres/i)).toBeInTheDocument();
  });

  it("rejects zero or negative space", () => {
    const base = { location: "Kochi", garden_type: "balcony", sunlight: "full", experience: "beginner", interests: [] };
    expect(validate({ ...base, space_sqm: "0" }).space_sqm).toBeTruthy();
    expect(validate({ ...base, space_sqm: "-3" }).space_sqm).toBeTruthy();
    expect(validate({ ...base, space_sqm: "4" })).toEqual({});
  });

  it("submits the expected payload", async () => {
    const onSave = vi.fn();
    render(<GardenForm onSave={onSave} />);
    await userEvent.type(screen.getByLabelText(/location/i), "Ernakulam, Kerala, India");
    await userEvent.selectOptions(screen.getByLabelText(/garden type/i), "balcony");
    await userEvent.selectOptions(screen.getByLabelText(/sunlight/i), "partial");
    await userEvent.type(screen.getByLabelText(/growing space/i), "4");
    await userEvent.selectOptions(screen.getByLabelText(/experience/i), "beginner");
    await userEvent.click(screen.getByRole("button", { name: "herbs" }));
    await userEvent.click(screen.getByRole("button", { name: /save garden/i }));
    expect(onSave).toHaveBeenCalledWith({
      location: "Ernakulam, Kerala, India",
      garden_type: "balcony",
      sunlight: "partial",
      space_sqm: 4,
      experience: "beginner",
      interests: ["herbs"],
    });
  });
});

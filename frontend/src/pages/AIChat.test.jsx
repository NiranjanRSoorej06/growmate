import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/api.js", async () => {
  class ApiError extends Error {
    constructor(message, { code = "unknown", status = 0 } = {}) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    ApiError,
    api: { getGarden: vi.fn(), chat: vi.fn(), createTask: vi.fn(), research: vi.fn() },
  };
});

import { ApiError, api } from "../services/api.js";
import AIChat from "./AIChat.jsx";

const renderPage = () => render(<MemoryRouter><AIChat /></MemoryRouter>);

describe("AIChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getGarden.mockResolvedValue({ id: "garden_001", garden_type: "balcony" });
  });

  it("shows the answer, causes and a verification note", async () => {
    api.chat.mockResolvedValue({
      answer: "Yellowing has several causes.",
      possible_causes: ["Overwatering"],
      next_steps: ["Check drainage"],
      requires_verification: true,
      model: "gemma3:4b",
    });
    renderPage();
    await userEvent.type(screen.getByLabelText(/your question/i), "Why yellow leaves?");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Yellowing has several causes.")).toBeInTheDocument();
    expect(screen.getByText("Overwatering")).toBeInTheDocument();
    expect(screen.getByText(/not a diagnosis/i)).toBeInTheDocument();
    expect(api.chat).toHaveBeenCalledWith(expect.objectContaining({ garden_id: "garden_001", message: "Why yellow leaves?" }));
  });

  it("explains how to fix an unavailable model and keeps the question", async () => {
    api.chat.mockRejectedValue(new ApiError("Cannot reach Ollama.", { code: "ai_unavailable", status: 503 }));
    renderPage();
    const box = screen.getByLabelText(/your question/i);
    await userEvent.type(box, "Hello?");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Cannot reach Ollama.")).toBeInTheDocument();
    expect(screen.getByText(/ollama serve/i)).toBeInTheDocument();
    await waitFor(() => expect(box).toHaveValue("Hello?"));
  });

  it("turns a next step into a task", async () => {
    api.chat.mockResolvedValue({ answer: "Ok.", possible_causes: [], next_steps: ["Water deeply"], requires_verification: false, model: "m" });
    api.createTask.mockResolvedValue({ id: 1 });
    renderPage();
    await userEvent.type(screen.getByLabelText(/your question/i), "Tips?");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    await userEvent.click(await screen.findByRole("button", { name: /add as task/i }));
    expect(api.createTask).toHaveBeenCalledWith({ title: "Water deeply", frequency: "once" });
    expect(await screen.findByText(/added to tasks/i)).toBeInTheDocument();
  });
});

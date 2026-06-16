import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CoverImage } from "@/components/cover-image";

describe("CoverImage", () => {
  test("renders the cover with the provided alt text", () => {
    render(
      <div style={{ position: "relative" }}>
        <CoverImage src="https://img.example/cover.jpg" alt="Thriller cover art" />
      </div>,
    );
    const img = screen.getByRole("img", { name: "Thriller cover art" });
    expect(img).toBeInTheDocument();
    expect(decodeURIComponent(img.getAttribute("src") ?? "")).toContain(
      "img.example/cover.jpg",
    );
  });

  test("swaps to the monochrome placeholder when the image fails to load", () => {
    render(
      <div style={{ position: "relative" }}>
        <CoverImage src="https://img.example/missing.jpg" alt="Missing cover" />
      </div>,
    );
    const img = screen.getByRole("img", { name: "Missing cover" });
    fireEvent.error(img);
    expect(decodeURIComponent(img.getAttribute("src") ?? "")).toContain(
      "/covers/placeholder.svg",
    );
  });
});

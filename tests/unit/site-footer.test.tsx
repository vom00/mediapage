import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SiteFooter } from "@/components/site-footer";

describe("SiteFooter", () => {
  test("renders inside a contentinfo landmark", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  test("renders the TMDB attribution sentence required by their terms", () => {
    render(<SiteFooter />);
    expect(
      screen.getByText(
        /uses the TMDB API but is not endorsed or certified by TMDB/i,
      ),
    ).toBeInTheDocument();
  });

  test("credits IGDB as the video-game source, with Steam as fallback", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: /igdb/i })).toHaveAttribute(
      "href",
      "https://www.igdb.com",
    );
    expect(screen.getByRole("link", { name: /steam/i })).toHaveAttribute(
      "href",
      "https://store.steampowered.com",
    );
  });

  test("links to TMDB", () => {
    render(<SiteFooter />);
    const tmdbLink = screen.getByRole("link", { name: /tmdb/i });
    expect(tmdbLink).toHaveAttribute(
      "href",
      "https://www.themoviedb.org",
    );
  });

  test("credits the anime, book, and music sources", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: /anilist/i })).toHaveAttribute(
      "href",
      "https://anilist.co",
    );
    expect(screen.getByRole("link", { name: /open library/i })).toHaveAttribute(
      "href",
      "https://openlibrary.org",
    );
    expect(screen.getByRole("link", { name: /deezer/i })).toHaveAttribute(
      "href",
      "https://www.deezer.com",
    );
  });
});

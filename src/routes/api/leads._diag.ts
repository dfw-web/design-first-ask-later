// TEMP diagnostic — confirms GOOGLE_PLACES_API_KEY works end-to-end.
// Returns whether the key is set and a tiny live sample. Safe: does NOT echo the key.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/leads/_diag")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.GOOGLE_PLACES_API_KEY;
        if (!key) {
          return Response.json({ keyPresent: false }, { status: 200 });
        }

        try {
          const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": key,
              "X-Goog-FieldMask":
                "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.userRatingCount",
            },
            body: JSON.stringify({ textQuery: "dentist in Lagos, Nigeria", pageSize: 3 }),
          });
          const text = await res.text();
          return Response.json({
            keyPresent: true,
            keyLength: key.length,
            googleStatus: res.status,
            googleBodyPreview: text.slice(0, 1500),
          });
        } catch (e) {
          return Response.json({
            keyPresent: true,
            error: e instanceof Error ? e.message : String(e),
          }, { status: 500 });
        }
      },
    },
  },
});

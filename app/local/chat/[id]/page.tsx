"use client";

/**
 * The chat surface itself lives in the `/local` layout
 * (`components/layout/chat-wraper.tsx` → `ChatAppExample`), which reads this
 * route's `id` via `useParams`. This page only exists to own the
 * `/local/chat/[id]` URL, so it renders nothing.
 */
export default function Page() {
  return null;
}

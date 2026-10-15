import { createFileRoute } from "@tanstack/react-router";

import { GameApp } from "@/components/game/game-app";
import { getPublicConfigFn } from "@/server/game.functions";

export const Route = createFileRoute("/")({
  loader: () => getPublicConfigFn(),
  component: Home,
});

function Home() {
  const config = Route.useLoaderData();
  return <GameApp config={config} />;
}

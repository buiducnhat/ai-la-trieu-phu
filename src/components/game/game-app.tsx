"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/8bit/toast";
import { useGame } from "@/hooks/use-game";
import type { GameSettings, PublicConfig } from "@/lib/game/types";
import { playSound, type SoundName } from "@/lib/sound";
import { loadSettings, loadStats, recordGame, saveSettings, type Stats } from "@/lib/storage";

import { MenuScreen } from "./menu-screen";
import { PlayScreen } from "./play-screen";
import { RulesDialog } from "./rules-dialog";
import { SettingsDialog } from "./settings-dialog";

export function GameApp({ config }: { config: PublicConfig }) {
  const [settings, setSettings] = useState<GameSettings>(() => ({
    source: config.defaultSource,
    topic: "",
    sound: true,
    llm: { provider: "server", model: "", apiKey: "" },
  }));
  const [stats, setStats] = useState<Stats>({ games: 0, best: 0, history: [] });
  const [dialog, setDialog] = useState<"rules" | "settings" | null>(null);
  const hydrated = useRef(false);

  // Đọc cài đặt/thành tích từ localStorage sau khi mount (tránh lệch SSR).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings(config.defaultSource));
    setStats(loadStats());
    hydrated.current = true;
  }, [config.defaultSource]);

  const update = useCallback((next: GameSettings) => {
    setSettings(next);
    if (hydrated.current) saveSettings(next);
  }, []);

  const play = useCallback((name: SoundName) => playSound(name, settings.sound), [settings.sound]);
  const game = useGame(settings, play, (message) => toast(message));
  const { state } = game;

  // Ghi nhận thành tích đúng một lần khi ván kết thúc.
  const recorded = useRef<unknown>(null);
  useEffect(() => {
    const outcome = state.outcome;
    if (!outcome || recorded.current === outcome) return;
    recorded.current = outcome;
    setStats(
      recordGame({
        at: Date.now(),
        prize: outcome.prize,
        answered: outcome.answered,
        reason: outcome.reason,
      }),
    );
  }, [state.outcome]);

  return (
    <>
      {state.phase === "idle" ? (
        <MenuScreen
          settings={settings}
          config={config}
          stats={stats}
          onStart={game.start}
          onRules={() => setDialog("rules")}
          onSettings={() => setDialog("settings")}
        />
      ) : (
        <PlayScreen
          game={game}
          settings={settings}
          onToggleSound={() => update({ ...settings, sound: !settings.sound })}
          onMenu={game.reset}
        />
      )}
      <RulesDialog open={dialog === "rules"} onOpenChange={(o) => setDialog(o ? "rules" : null)} />
      <SettingsDialog
        open={dialog === "settings"}
        onOpenChange={(o) => setDialog(o ? "settings" : null)}
        settings={settings}
        onChange={update}
        config={config}
      />
    </>
  );
}

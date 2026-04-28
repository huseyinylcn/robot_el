"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RobotHandPreview,
  type RobotPose,
} from "@/components/RobotHandPreview";

const BAUD = 115200;
const RESET_MS = 4000;

type CmdDef = { key: string; label: string; pose: RobotPose };

const COMMANDS: CmdDef[] = [
  { key: "1", label: "Merhaba", pose: "merhaba" },
  { key: "2", label: "Bozkurt", pose: "bozkurt" },
  { key: "3", label: "Yumruk", pose: "yumruk" },
  { key: "4", label: "Bir", pose: "bir" },
  { key: "5", label: "İki", pose: "iki" },
  { key: "6", label: "Üç", pose: "uc" },
  { key: "7", label: "Dört", pose: "dort" },
];

export default function Home() {
  const [supported, setSupported] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string>("Hazır");
  const [pose, setPose] = useState<RobotPose>("idle");
  const [locked, setLocked] = useState(false);
  const [grantedPorts, setGrantedPorts] = useState<SerialPort[]>([]);

  const portRef = useRef<SerialPort | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(
    null,
  );
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" && !!navigator.serial,
    );
  }, []);

  const refreshPorts = useCallback(async () => {
    if (!navigator.serial) return;
    try {
      const ports = await navigator.serial.getPorts();
      setGrantedPorts(ports);
    } catch {
      setGrantedPorts([]);
    }
  }, []);

  useEffect(() => {
    void refreshPorts();
  }, [refreshPorts]);

  const disconnect = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      try {
        writerRef.current?.releaseLock();
      } catch {
        /* ignore */
      }
      writerRef.current = null;
      try {
        await portRef.current?.close();
      } catch {
        /* ignore */
      }
      portRef.current = null;
      setConnected(false);
      setPose("idle");
      setLocked(false);
      if (!opts?.silent) setStatus("Bağlantı kesildi");
      void refreshPorts();
    },
    [refreshPorts],
  );

  const connectPort = useCallback(
    async (port: SerialPort) => {
      if (!navigator.serial) return;
      await disconnect({ silent: true });
      try {
        await port.open({ baudRate: BAUD });
        portRef.current = port;
        const w = port.writable?.getWriter();
        if (!w) throw new Error("Yazma kanalı yok");
        writerRef.current = w;
        setConnected(true);
        setStatus(`Bağlı — ${BAUD} baud`);
        port.addEventListener("disconnect", () => {
          void disconnect();
        });
      } catch (e) {
        setStatus(
          e instanceof Error ? e.message : "Bağlantı açılamadı",
        );
      }
      void refreshPorts();
    },
    [disconnect, refreshPorts],
  );

  const pickNewPort = useCallback(async () => {
    if (!navigator.serial) return;
    try {
      const port = await navigator.serial.requestPort();
      await connectPort(port);
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") {
        setStatus(
          e instanceof Error ? e.message : "Port seçilemedi",
        );
      }
    }
  }, [connectPort]);

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setPose("idle");
      setLocked(false);
      resetTimerRef.current = null;
    }, RESET_MS);
  }, []);

  const sendCommand = useCallback(
    async (cmd: CmdDef) => {
      if (!writerRef.current || locked) return;
      setLocked(true);
      setPose(cmd.pose);

      try {
        const line = `${cmd.key}\n`;
        const data = new TextEncoder().encode(line);
        await writerRef.current.write(data);
        setStatus(`Gönderildi: ${cmd.key} (${cmd.label})`);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Gönderim hatası");
        setPose("idle");
        setLocked(false);
        return;
      }

      scheduleReset();
    },
    [locked, scheduleReset],
  );

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      void disconnect();
    };
  }, [disconnect]);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:px-8 lg:py-12">
        <section className="flex flex-1 flex-col gap-6 lg:max-w-xl">
          <header className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400/90">
              Seri port kontrol
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Robot el komutları
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-slate-400">
              Baud hızı sabit{" "}
              <span className="font-mono text-cyan-300">{BAUD}</span>. Komut
              sonrası robot yaklaşık{" "}
              <span className="text-slate-200">{RESET_MS / 1000}s</span> içinde
              tüm parmaklar açık konuma döner; bu sürede yeni komut gönderilmez.
            </p>
          </header>

          {!supported && (
            <div
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              role="status"
            >
              Web Serial bu tarayıcıda yok.{" "}
              <strong className="font-semibold">Chrome</strong> veya{" "}
              <strong className="font-semibold">Edge</strong> kullanın; sayfa{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">
                localhost
              </code>{" "}
              veya HTTPS olmalıdır.
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-300">
              Bağlantı
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={!supported}
                onClick={() => void pickNewPort()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Port seç ve bağlan
              </button>
              <button
                type="button"
                disabled={!supported || !connected}
                onClick={() => void disconnect()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
              >
                Bağlantıyı kes
              </button>
            </div>

            {grantedPorts.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Daha önce izin verilen portlar
                </p>
                <ul className="flex flex-wrap gap-2">
                  {grantedPorts.map((p, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={!supported}
                        onClick={() => void connectPort(p)}
                        className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-xs font-mono text-cyan-200 transition hover:border-cyan-500/50 hover:bg-slate-800 disabled:opacity-40"
                      >
                        Port #{i + 1}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p
              className={`mt-4 text-sm ${connected ? "text-emerald-400" : "text-slate-500"}`}
            >
              {status}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-300">
              Komutlar
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COMMANDS.map((cmd) => (
                <button
                  key={cmd.key}
                  type="button"
                  disabled={!connected || locked}
                  onClick={() => void sendCommand(cmd)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/90 to-slate-900/90 px-4 py-4 text-left transition hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <span className="font-mono text-2xl font-bold text-cyan-400">
                    {cmd.key}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-slate-200">
                    {cmd.label}
                  </span>
                  <span className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-cyan-500/10 blur-xl transition group-hover:bg-cyan-500/20" />
                </button>
              ))}
            </div>
            {locked && (
              <p className="mt-4 text-center text-xs text-slate-500">
                Pozisyon sıfırlanıyor… ({RESET_MS / 1000}s)
              </p>
            )}
          </div>
        </section>

        <aside className="flex flex-1 justify-center lg:sticky lg:top-8 lg:justify-end">
          <RobotHandPreview pose={pose} className="w-full max-w-md" />
        </aside>
      </div>
    </div>
  );
}

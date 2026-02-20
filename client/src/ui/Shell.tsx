import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, matchPath } from "react-router-dom";
import Icon from "./Icon";
import Tooltip from "./Tooltip";
import React from "react";

type NavItem = {
    key: string;
    label: string;
    icon: string;
    href: (ctx: { deviceId?: string; ch?: string }) => string;
    disabled?: boolean;
    children?: NavItem[];
};

function HamburgerIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function CloseIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

const nav: NavItem[] = [
    {
        key: "devices",
        label: "Devices",
        icon: "dns",
        href: () => "/devices"
    },
    {
        key: "dashboard",
        label: "Dashboard",
        icon: "dashboard",
        href: ({ deviceId, ch }) => (deviceId ? `/devices/${deviceId}${ch ? `?ch=${ch}` : ""}` : "/devices")
    },
    {
        key: "output",
        label: "Output",
        icon: "output",
        href: ({ deviceId, ch }) => (deviceId ? `/devices/${deviceId}/routing${ch ? `?ch=${ch}` : ""}` : "/devices"),
        children: [
            {
                key: "routing",
                label: "Routing",
                icon: "route",
                href: ({ deviceId, ch }) =>
                    deviceId ? `/devices/${deviceId}/routing${ch ? `?ch=${ch}` : ""}` : "/devices"
            },
            {
                key: "delay",
                label: "Delay",
                icon: "timer",
                href: ({ deviceId, ch }) =>
                    deviceId ? `/devices/${deviceId}/delay${ch ? `?ch=${ch}` : ""}` : "/devices"
            },
            {
                key: "eq",
                label: "Equalizer",
                icon: "equalizer",
                href: ({ deviceId, ch }) =>
                    deviceId ? `/devices/${deviceId}/eq${ch ? `?ch=${ch}` : ""}` : "/devices"
            },
            {
                key: "speaker",
                label: "Speaker Preset",
                icon: "speaker",
                href: ({ deviceId, ch }) =>
                    deviceId ? `/devices/${deviceId}/speaker${ch ? `?ch=${ch}` : ""}` : "/devices"
            }
        ]
    },
    {
        key: "settings",
        label: "Settings",
        icon: "settings",
        href: ({ deviceId, ch }) => (deviceId ? `/devices/${deviceId}${ch ? `?ch=${ch}` : ""}` : "/devices"),
        disabled: true
    }
];

function tempTone(t: number): "ok" | "warn" | "alarm" | "neutral" {
    // thresholds V0 (ajuste depois)
    if (t >= 85) return "alarm";
    if (t >= 70) return "warn";
    return "ok";
}

function tempClass(t: number) {
    if (t >= 85) return "text-smx-red font-semibold";
    if (t >= 70) return "text-yellow-400 font-semibold";
    return "text-smx-text";
}

function Dot() {
    return <span className="opacity-40">•</span>;
}

export default function Shell({ children }: PropsWithChildren) {
    const { pathname, search } = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem("smx.sidebar.collapsed") === "1";
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("smx.sidebar.collapsed", collapsed ? "1" : "0");
        } catch { }
    }, [collapsed]);

    // deviceId da rota
    const deviceId = useMemo(() => {
        const m = matchPath({ path: "/devices/:id/*" }, pathname);
        return (m?.params as any)?.id as string | undefined;
    }, [pathname]);

    const isDeviceRoot = useMemo(() => {
        if (!deviceId) return false;
        return pathname === `/devices/${deviceId}`;
    }, [pathname, deviceId]);

    const pageLabel = useMemo(() => {
        // label da tela atual (só para /devices/:id/*)
        if (!deviceId) return "";
        if (isDeviceRoot) return "Dashboard";

        if (pathname.endsWith("/routing")) return "Routing";
        if (pathname.endsWith("/delay")) return "Delay";
        if (pathname.endsWith("/eq")) return "Equalizer";
        if (pathname.endsWith("/speaker")) return "Speaker Preset";

        return ""; // fallback
    }, [pathname, deviceId, isDeviceRoot]);

    type DeviceStatus = {
        deviceId: string;
        fw: string;
        channelsCount?: number,
        temps: { heatsink: number; board: number };
        rails: { vbat: number; vbus: number };
        net: { wifi: string; lan: string };
        dsp: {
            sampleRate: number,
            delayMaxMs: number
          };
        powerOn: boolean;
        protections?: { protect: boolean; reason?: string };
    };

    const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);


    // ch atual vindo do querystring
    const ch = useMemo(() => {
        const sp = new URLSearchParams(search);
        return sp.get("ch") ?? "1";
    }, [search]);

    useEffect(() => setDrawerOpen(false), [pathname]);
    useEffect(() => {
        if (!drawerOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [drawerOpen]);

    useEffect(() => {
        setOutputFlyoutOpen(false);
    }, [pathname]);

    useEffect(() => {
        let alive = true;
        if (!deviceId) {
            setDeviceStatus(null);
            return;
        }

        async function load() {
            try {
                const r = await fetch(`/api/v1/devices/${deviceId}/status`);
                const j = await r.json();
                if (alive) setDeviceStatus(j);
            } catch {
                if (alive) setDeviceStatus(null);
            }
        }

        load();

    }, [deviceId]);


    // controla expansão do grupo Output
    const [openOutput, setOpenOutput] = useState(true);

    const [outputFlyoutOpen, setOutputFlyoutOpen] = useState(false);

    const sidebarWidth = collapsed ? 100 : 288;

    function isActivePath(pathname: string, targetPath: string) {
        // ignora querystring
        const base = targetPath.split("?")[0];

        // match exato
        if (pathname === base) return true;

        // match por "segmento" (evita /devices bater em /devicesX)
        return pathname.startsWith(base + "/");
    }

    function NavLinkItem({
        item,
        compact,
        level = 0
    }: {
        item: NavItem;
        compact: boolean;
        level?: number;
    }) {
        const href = item.href({ deviceId, ch });
        const basePath = href.split("?")[0];
        const isGroup = !!item.children?.length;
        const isOutputGroup = item.key === "output";

        // ✅ Active correto (sem deixar tudo vermelho)
        const active = useMemo(() => {
            if (item.disabled) return false;

            // 1) Devices: SOMENTE /devices (exato)
            if (item.key === "devices") {
                return pathname === "/devices";
            }

            // 2) Dashboard: SOMENTE /devices/:id (index)
            if (item.key === "dashboard") {
                return !!matchPath({ path: "/devices/:id", end: true }, pathname);
            }

            // 3) Output (grupo): ativo em qualquer subrota de output
            if (item.key === "output") {
                return !!matchPath({ path: "/devices/:id/:sub", end: true }, pathname) &&
                    ["/routing", "/delay", "/eq", "/speaker"].some(seg => pathname.endsWith(seg));
            }

            // 4) Subitens do Output (routing/delay/eq/speaker): match exato
            if (["routing", "delay", "eq", "speaker"].includes(item.key)) {
                return !!matchPath({ path: `/devices/:id/${item.key}`, end: true }, pathname);
            }

            // 5) fallback: match exato por basePath
            return pathname === basePath;
        }, [item.key, item.disabled, pathname, basePath]);

        const base =
            "group flex items-center gap-3 rounded-xl px-3 py-3 border transition select-none";
        const cls = item.disabled
            ? `${base} opacity-50 cursor-not-allowed border-transparent bg-smx-panel2`
            : active
                ? `${base} bg-smx-red/15 border-smx-red/40`
                : `${base} bg-smx-panel2 border-smx-line hover:border-smx-red/30 hover:bg-black/20`;

        const indent = level === 0 ? "" : "ml-3";

        const iconNode = (
            <div
                className={`grid place-items-center w-12 h-12 rounded-xl border ${active ? "border-smx-red/40 bg-smx-red/10" : "border-smx-line bg-black/20"
                    } transition`}
            >
                <Icon
                    name={item.icon}
                    className={active ? "text-smx-red" : "text-smx-muted group-hover:text-smx-text"}
                    filled={active}
                />
            </div>
        );

        const content = (
            <>
                {iconNode}
                {!compact && (
                    <div className="flex-1">
                        <div className="font-medium">{item.label}</div>
                    </div>
                )}

                {!compact && isGroup && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setOpenOutput((v) => !v);
                        }}
                        className="p-1 rounded-lg hover:bg-white/5"
                        aria-label="Expandir/Recolher"
                        title="Expandir/Recolher"
                    >
                        <Icon name={openOutput ? "expand_less" : "expand_more"} className="text-smx-muted" />
                    </button>
                )}
            </>
        );

        const node = item.disabled ? (
            <div className={`${cls} ${indent}`}>{content}</div>
        ) : (isGroup && compact && isOutputGroup) ? (
            // ✅ Sidebar recolhida: Output vira botão que abre flyout
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setOutputFlyoutOpen((v) => !v);
                }}
                className={`${cls} ${indent} w-full text-left`}
            >
                {content}
            </button>
        ) : (
            <Link to={href} className={`${cls} ${indent}`}>
                {content}
            </Link>
        );


        return compact ? <Tooltip label={item.label}>{node}</Tooltip> : node;
    }


    function SidebarContent({ compact }: { compact: boolean }) {
        return (
            <aside className={`h-full bg-smx-panel border-r border-smx-line ${compact ? "p-3" : "p-6"}`}>
                <div className={compact ? "mb-6 text-center" : "mb-8"}>
                    {compact ? (
                        <>
                            <div className="text-[15px] font-semibold tracking-wide leading-none text-smx-red">
                                Soundmax
                            </div>
                            <div className="text-[11px] text-smx-muted mt-1 tracking-wider">
                                Control
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-2xl font-semibold tracking-wide">
                                <span className="text-smx-red">Soundmax</span>{" "}
                                <span className="text-smx-muted font-normal">Control</span>
                            </div>
                            <div className="text-xs text-smx-muted mt-1">
                                LAN • Multi-device • ESP32
                            </div>
                        </>
                    )}
                </div>


                <nav className="space-y-3">
                    {nav.map((item) => (
                        <div key={item.key}>
                            <NavLinkItem item={item} compact={compact} level={0} />

                            {/* subitens do Output */}
                            {!compact && item.key === "output" && openOutput && item.children && (
                                <div className="mt-2 space-y-2">
                                    {item.children.map((c) => (
                                        <NavLinkItem key={c.key} item={c} compact={compact} level={1} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {compact && outputFlyoutOpen && (
                    <div className="fixed inset-0 z-50" onClick={() => setOutputFlyoutOpen(false)}>
                        {/* painel flutuante */}
                        <div
                            className="absolute left-[92px] top-[112px] w-[260px] rounded-2xl border border-smx-line bg-smx-panel shadow-2xl p-3"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-xs text-smx-muted px-2 pb-2">Output</div>

                            <div className="space-y-2">
                                {nav
                                    .find((x) => x.key === "output")
                                    ?.children?.map((c) => {
                                        const href = c.href({ deviceId, ch });
                                        const active = !!matchPath({ path: href.split("?")[0], end: true }, pathname);

                                        return (
                                            <Link
                                                key={c.key}
                                                to={href}
                                                className={`flex items-center gap-3 rounded-xl px-3 py-3 border transition ${active
                                                    ? "bg-smx-red/15 border-smx-red/40"
                                                    : "bg-smx-panel2 border-smx-line hover:border-smx-red/30 hover:bg-black/20"
                                                    }`}
                                            >
                                                <div
                                                    className={`grid place-items-center w-10 h-10 rounded-xl border ${active ? "border-smx-red/40 bg-smx-red/10" : "border-smx-line bg-black/20"
                                                        }`}
                                                >
                                                    <Icon
                                                        name={c.icon}
                                                        className={active ? "text-smx-red" : "text-smx-muted"}
                                                        filled={active}
                                                    />
                                                </div>
                                                <div className="font-medium">{c.label}</div>
                                            </Link>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                )}


                {!compact && (
                    <div className="mt-10 text-xs text-smx-muted">
                        V0 preparado p/ login, histórico, permissões e OTA (V1+).
                    </div>
                )}
            </aside>
        );
    }

    return (
        <div className="h-screen bg-smx-bg flex flex-col">
            {/* TOP BAR (fixa) */}
            <div className="shrink-0 sticky top-0 z-40 bg-smx-panel/95 backdrop-blur border-b border-smx-line">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => {
                            if (window.matchMedia("(max-width: 767px)").matches) setDrawerOpen(true);
                            else setCollapsed((v) => !v);
                        }}
                        className="p-2 rounded-xl border border-smx-line bg-smx-panel2 hover:border-smx-red/30 transition"
                        aria-label="Menu"
                    >
                        <HamburgerIcon />
                    </button>

                    <div className="text-sm font-semibold text-center">
                        <span className="text-smx-red">Soundmax</span>{" "}
                        <span className="text-smx-muted">Control</span>
                        {deviceId && (
                            <div className="mt-1">
                                {deviceStatus ? (
                                    <div className="text-[11px] text-smx-muted font-normal flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                                        {/* Linha principal */}
                                        <span className="text-smx-text font-semibold">{deviceStatus.deviceId}</span>

                                        {/* No dashboard: mostra X CH. Em telas por canal: mostra CH N + Page */}
                                        {isDeviceRoot ? (
                                            <>
                                                <Dot />
                                                <span className="text-smx-text font-medium">
                                                    {deviceStatus.channelsCount ? `${deviceStatus.channelsCount} CH` : ""}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Dot />
                                                <span className="text-smx-text font-medium">CH {ch}</span>
                                                {pageLabel && (
                                                    <>
                                                        <Dot />
                                                        <span className="text-smx-text font-medium">{pageLabel}</span>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        <Dot />
                                        <span>
                                            FW <span className="text-smx-text">{deviceStatus.fw}</span>
                                        </span>

                                        <Dot />
                                        <span>
                                            LAN <span className="text-smx-text">{deviceStatus.net.lan || "—"}</span>
                                        </span>

                                        <Dot />
                                        <span>
                                            WiFi <span className="text-smx-text">{deviceStatus.net.wifi || "—"}</span>
                                        </span>

                                        <Dot />
                                        <span>
                                            HS{" "}
                                            <span className={tempClass(deviceStatus.temps.heatsink)}>
                                                {deviceStatus.temps.heatsink.toFixed(1)}°C
                                            </span>
                                        </span>

                                        <Dot />
                                        <span>
                                            BD{" "}
                                            <span className={tempClass(deviceStatus.temps.board)}>
                                                {deviceStatus.temps.board.toFixed(1)}°C
                                            </span>
                                        </span>

                                        <Dot />
                                        <span>
                                            VBAT <span className="text-smx-text">{deviceStatus.rails.vbat.toFixed(1)}V</span>
                                        </span>

                                        <Dot />
                                        <span>
                                            VBUS <span className="text-smx-text">{deviceStatus.rails.vbus.toFixed(1)}V</span>
                                        </span>

                                        <Dot />
                                        <span className={deviceStatus.powerOn ? "text-green-500" : "text-smx-red"}>
                                            {deviceStatus.powerOn ? "ON" : "OFF"}
                                        </span>

                                        {deviceStatus.protections?.protect && (
                                            <>
                                                <Dot />
                                                <span className="text-smx-red font-semibold">
                                                    PROTECT {deviceStatus.protections.reason || ""}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-smx-muted text-center">Carregando status…</div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setDrawerOpen(false)}
                        className={`p-2 rounded-xl border bg-smx-panel2 transition ${drawerOpen
                            ? "border-smx-red/40 hover:border-smx-red/60"
                            : "border-smx-line opacity-0 pointer-events-none"
                            }`}
                        aria-label="Fechar menu"
                    >
                        <CloseIcon />
                    </button>
                </div>
            </div>

            {/* Desktop */}
            <div className="flex-1 min-h-0">
                <div className="hidden md:grid md:grid-cols-[auto_1fr] min-h-[calc(100vh-56px)]">
                    <div style={{ width: sidebarWidth, transition: "width 220ms ease" }} className="h-full">
                        <SidebarContent compact={collapsed} />
                    </div>
                    <main className="h-full min-h-0 overflow-y-auto">
                        <div className="p-4 md:p-8">{children}</div>
                    </main>
                </div>

                {/* Mobile */}
                <div className="md:hidden h-full">
                    <main className="h-full min-h-0 overflow-y-auto">
                        <div className="p-4">{children}</div>
                    </main>
                </div>

                {/* Drawer Mobile */}
                <div className={`md:hidden fixed inset-0 z-50 ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
                    <div
                        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0"
                            }`}
                        onClick={() => setDrawerOpen(false)}
                    />
                    <div
                        className={`absolute left-0 top-0 h-full w-[85%] max-w-[340px] shadow-2xl transition-transform duration-200 ease-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"
                            }`}
                    >
                        <div className="flex items-center justify-between bg-smx-panel border-b border-smx-line p-4">
                            <div className="text-base font-semibold">
                                <span className="text-smx-red">Soundmax</span>{" "}
                                <span className="text-smx-muted">Control</span>
                            </div>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-2 rounded-xl border border-smx-line bg-smx-panel2 hover:border-smx-red/30 transition"
                                aria-label="Fechar menu"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <SidebarContent compact={false} />
                    </div>
                </div>
            </div>
        </div >
    );
}

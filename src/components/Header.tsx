import { Sun, Moon, Rows3, LayoutList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useDensity } from "./DensityContext";
import TabButton from "./TabButton";
import Logo from "./Logo";

interface HeaderTab {
  key: string;
  label: string;
  icon?: LucideIcon;
}

interface HeaderProps<K extends string> {
  tabs: HeaderTab[];
  activeTab: K;
  onSelectTab: (key: K) => void;
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";

function Header<K extends string>({ tabs, activeTab, onSelectTab }: HeaderProps<K>) {
  const { theme, toggleTheme } = useTheme();
  const { density, toggleDensity } = useDensity();

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        {/* Wordmark */}
        <a href="/" className="group flex flex-none items-center gap-2 no-underline">
          <span className="text-accent transition-transform group-hover:-rotate-6">
            <Logo size={22} />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight text-text-primary">
            Booki
          </span>
        </a>

        {/* Tabs — scroll horizontally on narrow screens */}
        <nav className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto">
          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              label={tab.label}
              icon={tab.icon}
              isActive={activeTab === tab.key}
              onClick={() => onSelectTab(tab.key as K)}
            />
          ))}
        </nav>

        {/* Toggles */}
        <div className="flex flex-none items-center gap-1">
          <button
            onClick={toggleDensity}
            className={iconBtn}
            aria-label={density === "compact" ? "Switch to card view" : "Switch to compact view"}
            title={density === "compact" ? "Card view" : "Compact view"}
          >
            {density === "compact" ? <LayoutList size={18} /> : <Rows3 size={18} />}
          </button>
          <button
            onClick={toggleTheme}
            className={iconBtn}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

    </header>
  );
}

export default Header;

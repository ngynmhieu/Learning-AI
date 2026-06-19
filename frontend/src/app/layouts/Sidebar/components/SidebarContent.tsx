import { useLocation } from "react-router";
import { ConversationList } from "@/modules/chat";
import { NAV_ITEMS } from "../navItems";
import { NavItem } from "./NavItem";

interface SidebarContentProps {
  open: boolean;
}

export function SidebarContent({ open }: SidebarContentProps) {
  const location = useLocation();

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-x-hidden py-2">
      <div className="shrink-0">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            label={item.label}
            icon={item.icon}
            active={location.pathname === item.path}
            open={open}
          />
        ))}
      </div>

      {/* Conversation history — only when expanded (needs the width for titles). */}
      {open && <ConversationList />}
    </div>
  );
}

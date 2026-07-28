"use client"

import * as React from "react"

import { NavMain } from "./nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ChurchIcon,
  BookOpen02Icon,
  MusicNote01Icon,
  Presentation01Icon,
  Megaphone01Icon,
  Image01Icon,
  PlayListIcon,
} from "@hugeicons/core-free-icons"

const data = {
  navMain: [
    {
      title: "Bible",
      url: "/bible",
      icon: <HugeiconsIcon icon={BookOpen02Icon} strokeWidth={2} />,
    },
    {
      title: "Songs",
      url: "#",
      icon: <HugeiconsIcon icon={MusicNote01Icon} strokeWidth={2} />,
    },
    {
      title: "Sermons",
      url: "#",
      icon: <HugeiconsIcon icon={Presentation01Icon} strokeWidth={2} />,
    },
    {
      title: "Announcements",
      url: "#",
      icon: <HugeiconsIcon icon={Megaphone01Icon} strokeWidth={2} />,
    },
    {
      title: "Media",
      url: "#",
      icon: <HugeiconsIcon icon={Image01Icon} strokeWidth={2} />,
    },
    {
      title: "Service Plan",
      url: "#",
      icon: <HugeiconsIcon icon={PlayListIcon} strokeWidth={2} />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeiconsIcon icon={ChurchIcon} strokeWidth={2} className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">BibleTime</span>
                <span className="truncate text-xs">Local presentation</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
    </Sidebar>
  )
}

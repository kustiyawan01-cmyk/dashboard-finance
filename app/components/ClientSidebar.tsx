"use client";

import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("./Sidebar"), {
  ssr: false,
  loading: () => null,
});

export default function ClientSidebar() {
  return <Sidebar />;
}
"use client";

import * as React from "react";
import { Frame, LayoutGrid, Shirt } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { OutfitsPanel } from "@/components/outfits/outfits-panel";
import { Studio } from "@/components/studio/studio";
import { WardrobePanel } from "@/components/wardrobe/wardrobe-panel";
import { useWardrobe } from "@/lib/store";
import { useBoard } from "@/lib/use-board";
import type { Outfit, WardrobeItem } from "@/lib/types";

export default function Home() {
  const { items, outfits, itemsById } = useWardrobe();
  const board = useBoard();
  const [tab, setTab] = React.useState("wardrobe");

  const place = (item: WardrobeItem) => {
    board.addItem(item, itemsById);
    setTab("studio");
    toast.success(`${item.name} placed on the board.`);
  };

  const open = (outfit: Outfit) => {
    board.load(outfit);
    setTab("studio");
  };

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="flex h-dvh min-h-0 flex-col gap-0 bg-background"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
            <LayoutGrid className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">flatly</span>
        </div>

        <TabsList className="mx-auto">
          <TabsTrigger value="wardrobe">
            <Shirt /> Wardrobe
          </TabsTrigger>
          <TabsTrigger value="studio">
            <LayoutGrid /> Studio
          </TabsTrigger>
          <TabsTrigger value="outfits">
            <Frame /> Outfits
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {items.length} {items.length === 1 ? "piece" : "pieces"} · {outfits.length}{" "}
            {outfits.length === 1 ? "outfit" : "outfits"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <TabsContent value="wardrobe" className="min-h-0 flex-1 outline-none">
        <WardrobePanel onPlace={place} />
      </TabsContent>

      <TabsContent value="studio" className="min-h-0 flex-1 outline-none">
        <Studio board={board} />
      </TabsContent>

      <TabsContent value="outfits" className="flex min-h-0 flex-1 flex-col outline-none">
        <OutfitsPanel onOpen={open} onStartNew={() => setTab("studio")} />
      </TabsContent>
    </Tabs>
  );
}

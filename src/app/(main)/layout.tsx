import { Nav } from "@/components/nav";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SelectionProvider } from "@/components/selection-provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      {children}
      <SelectionProvider />
      <BottomTabBar />
    </>
  );
}

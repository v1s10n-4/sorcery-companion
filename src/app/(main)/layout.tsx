import { Nav } from "@/components/nav";
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
    </>
  );
}

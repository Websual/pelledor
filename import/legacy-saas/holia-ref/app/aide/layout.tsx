import { AideLayoutClient } from "@/components/aide-layout-client";

export default function AideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-28">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 lg:p-12">
          <AideLayoutClient>{children}</AideLayoutClient>
        </div>
      </div>
    </div>
  );
}

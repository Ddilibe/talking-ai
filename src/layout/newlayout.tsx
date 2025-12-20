import Header from "@/components/header";

export default function NewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col min-w-screen">
            <Header />

            <main className="flex-1 flex justify-center items-start px-4">
                {children}
            </main>

            <footer className="border-t p-4 text-center text-sm text-muted-foreground bg-gray-100">
                <p>© Made with ♥️ by mangino 🐍</p>
            </footer>
        </div>
    );
}

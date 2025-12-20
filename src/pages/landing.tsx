import Icon from "@/assets/icons/icon64.png";
import { Link } from "react-router-dom";

export default function Landing() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center">
            <img
                src={Icon}
                alt="Talking AI Logo"
                className="mb-6 h-28 w-28 drop-shadow-md"
                draggable={false}
            />

            <h1 className="text-4xl font-bold tracking-tight mb-3">
                Welcome to <span className="text-blue-600">Talking AI</span>
            </h1>

            <p className="text-muted-foreground text-lg max-w-md mb-8">
                Read, listen, and understand web content effortlessly using AI-powered
                voice and explanations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-xl w-full">
                <FeatureCard
                    title="🔊 Read Aloud"
                    description="Listen to any selected text or document naturally."
                />
                <FeatureCard
                    title="🧠 Explain Content"
                    description="Get instant AI explanations in simple language."
                />
                <FeatureCard
                    title="📄 PDFs & Web"
                    description="Works on webpages and local PDF files."
                />
            </div>

            {/* CTA */}
            <Link
                to="/home"
                className="w-full max-w-md rounded-xl bg-blue-400 px-6 py-4  text-black font-black shadow-md transition hover:bg-blue-700 hover:text-shadow-cyan-50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
                Get Started →
            </Link>

            {/* Footer hint */}
            <p className="mt-6 text-xs text-muted-foreground">
                Built for speed • Privacy-friendly • Runs locally
            </p>
        </div>
    );
}

/* ------------------ */
/* Feature Component  */
/* ------------------ */
function FeatureCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-xl border bg-background p-4 shadow-sm hover:shadow-md transition">
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

import { Button } from "@/components/ui/button";
import { Play, Square, Sparkles } from "lucide-react";


export default function Home() {
    const sendMessageToActiveTab = async (message: any) => {
        // @ts-ignore
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });

        if (!tab?.id) {
            console.warn("No active tab found");
            return;
        }

        // @ts-ignore
        chrome.tabs.sendMessage(tab.id, message);
    };

    return (
        <div className="flex min-h-100 flex-col justify-between px-4 py-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">Talking AI</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Listen to, understand, and interact with web content using AI.
                </p>
            </div>

            {/* Main Actions */}
            <div className="mt-8 flex flex-col gap-4">
                <Button
                    size="lg"
                    className="flex items-center gap-2"
                    onClick={() => sendMessageToActiveTab({ action: "readAloud" })}
                >
                    <Play className="h-5 w-5" />
                    Read Page Aloud
                </Button>

                <Button
                    size="lg"
                    className="flex items-center gap-2"
                    onClick={() => sendMessageToActiveTab({ action: "stopReading" })}
                >
                    <Square className="h-5 w-5" />
                    Stop Reading
                </Button>

                <Button
                    size="lg"
                    className="flex items-center gap-2"
                    onClick={() => sendMessageToActiveTab({ action: "explainText" })}
                >
                    <Sparkles className="h-5 w-5" />
                    Explain Selection
                </Button>
            </div>

            {/* Footer / Status */}
            <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
                Select text on any page to activate floating controls.
            </div>
        </div>
    );
}

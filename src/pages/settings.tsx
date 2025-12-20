import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { speakPreview } from "@/lib/preview";
import { DEFAULT_SETTINGS, getSettings, saveSettings } from "@/lib/utils";

export default function Settings() {
    const [settings, setSettings] =
        useState<typeof DEFAULT_SETTINGS>(DEFAULT_SETTINGS);

    useEffect(() => {
        getSettings().then(setSettings);
    }, []);

    const updateSetting = (key: keyof typeof DEFAULT_SETTINGS, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="flex flex-col gap-8 px-4 py-6 w-full">
            {/* Header */}
            <div>
                <h1 className="text-xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Customize how Talking AI works for you.
                </p>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-6 w-full">
                {/* API Key */}
                <section className="space-y-2">
                    <Label htmlFor="apiKey">OpenRouter API Key</Label>
                    <Input
                        id="apiKey"
                        type="password"
                        placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                        value={settings.apiKey ?? ""}
                        onChange={(e) =>
                            updateSetting("apiKey", e.target.value)
                        }
                    />
                    <p className="text-xs text-muted-foreground">
                        Stored locally. Never shared or uploaded.
                    </p>
                </section>

                {/* Custom Prompt */}
                <section className="space-y-2">
                    <Label htmlFor="customPrompt">
                        Custom Explanation Prompt
                    </Label>
                    <Textarea
                        id="customPrompt"
                        rows={5}
                        placeholder="Explain the selected text in simple terms..."
                        value={settings.customPrompt ?? ""}
                        onChange={(e) =>
                            updateSetting("customPrompt", e.target.value)
                        }
                    />
                    <p className="text-xs text-muted-foreground">
                        Used when explaining highlighted text.
                    </p>
                </section>

                {/* Voice Preview */}
                <section className="flex flex-col gap-3">
                    <Button
                        className="flex items-center gap-2 w-fit"
                        onClick={() => speakPreview(settings)}
                    >
                        <Volume2 className="h-4 w-4" />
                        Preview Voice
                    </Button>
                </section>

                {/* Save */}
                <div className="pt-2">
                    <Button
                        onClick={() => saveSettings(settings)}
                        className="w-fit"
                    >
                        Save Settings
                    </Button>
                </div>
            </div>
        </div>
    );
}

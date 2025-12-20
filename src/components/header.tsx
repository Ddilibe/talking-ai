import { ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Icon from "@/assets/icons/icon64.png";

export default function Header() {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background">
            <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <img
                        src={Icon}
                        alt="Talking AI logo"
                        className="h-6 w-6"
                        draggable={false}
                    />
                    <span className="text-lg font-semibold">Talking AI</span>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <ArrowLeft className="h-5 w-5" onClick={() => navigate(-1)} />
                    <Settings className="h-5 w-5" onClick={() => navigate("/settings")} />
                </div>
            </div>
        </header>
    );
}


import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500 animate-in fade-in duration-300">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-medium uppercase tracking-wider">Memuatkan...</p>
        </div>
    );
}

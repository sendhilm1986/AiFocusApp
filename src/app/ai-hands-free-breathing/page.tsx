"use client";

import { AIHandsFreeBreathing } from '@/components/ai-hands-free-breathing';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function AIHandsFreeBreathingPageContent() {
    return <AIHandsFreeBreathing />;
}

export default function AIHandsFreeBreathingPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p>Loading Breathing Experience...</p>
                </div>
            </div>
        }>
            <AIHandsFreeBreathingPageContent />
        </Suspense>
    );
}
"use client";

import React from "react";
import { logErrorToDashboard } from "@/lib/error-logger";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  async componentDidCatch(error: Error) {
    // Logga felet till System Health – huvudappens dashboard
    await logErrorToDashboard(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border-2 border-black bg-white p-5 text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <p className="text-lg font-semibold text-brand-text">
              Hoppsan, något gick snett.
            </p>
            <p className="mt-2 text-sm text-brand-text/70">
              Vi har meddelat våra tekniker. Prova att ladda om sidan eller
              gå tillbaka till startsidan.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


"use client";

import { useEffect, useState } from "react";
import {
  clearAuthErrorFromUrl,
  getAuthErrorFromUrl,
} from "@/lib/auth/urlParams";

export function AuthErrorBanner() {
  const [message] = useState<string | null>(() => getAuthErrorFromUrl());

  useEffect(() => {
    clearAuthErrorFromUrl();
  }, []);

  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
    >
      {message}
    </p>
  );
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    // Development request log only: don't print single-use auth codes, OTP
    // token hashes or tokens from sign-in and Google Calendar callback URLs.
    incomingRequests: {
      ignore: [
        /^\/auth\/callback/,
        /^\/api\/google-calendar\/callback/,
        /[?&#](code|token|token_hash|access_token|refresh_token)=/,
      ],
    },
  },
};

export default nextConfig;

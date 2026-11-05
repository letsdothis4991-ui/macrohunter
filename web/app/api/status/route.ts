import { NextResponse } from "next/server";

import { claudeConfigured } from "~/lib/claude";
import { googleKey } from "~/lib/google";
import type { Status } from "~/lib/types";

export function GET() {
  const status: Status = {
    google: Boolean(googleKey()),
    claude: claudeConfigured(),
    passwordProtected: Boolean(process.env.SITE_PASSWORD),
  };
  return NextResponse.json(status);
}

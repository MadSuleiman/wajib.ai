"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClientSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";

type AuthorizationDetails = {
  client_id?: string;
  client_name?: string;
  scopes?: string[];
};

const buildRedirectTo = (path: string, search: string) =>
  `/auth?redirectTo=${encodeURIComponent(`${path}${search}`)}`;

export default function OAuthConsentPage() {
  const supabase = createClientSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const authorizationId = useMemo(
    () => searchParams.get("authorization_id"),
    [searchParams],
  );

  useEffect(() => {
    const fetchDetails = async () => {
      if (!authorizationId) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const redirectTo = buildRedirectTo(
          window.location.pathname,
          window.location.search,
        );
        router.push(redirectTo);
        return;
      }

      const { data, error } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

      if (error) {
        toast.error("Unable to load request", {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      const scopes =
        typeof data?.scope === "string"
          ? data.scope.split(/\s+/).filter(Boolean)
          : [];

      setDetails({
        client_id: data?.client?.id ?? undefined,
        client_name: data?.client?.name ?? undefined,
        scopes,
      });
      setLoading(false);
    };

    void fetchDetails();
  }, [authorizationId, router, supabase.auth]);

  const handleDecision = async (decision: "approve" | "deny") => {
    if (!authorizationId) return;
    setActionLoading(true);
    try {
      const { data, error } =
        decision === "approve"
          ? await supabase.auth.oauth.approveAuthorization(authorizationId)
          : await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (error) throw error;

      if (data?.redirect_url) {
        window.location.assign(data.redirect_url);
        return;
      }

      throw new Error("Missing redirect URL from authorization decision.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast.error("Authorization failed", { description: message });
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col justify-center space-y-6 rounded-lg border bg-card p-8 shadow-sm sm:p-10">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/logos/logo.svg"
              alt="wajib"
              width={60}
              height={60}
              className="dark:hidden"
            />
            <Image
              src="/logos/logo-white.svg"
              alt="wajib"
              width={60}
              height={60}
              className="hidden dark:block"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Connect AI assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Approve access so your assistant can manage tasks in Wajib.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading authorization request...
          </div>
        ) : !authorizationId ? (
          <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Missing authorization request. Please restart the connection flow.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <div className="font-medium text-foreground">
                {details?.client_name ?? "Unknown client"}
              </div>
              <div className="text-muted-foreground">
                Client ID: {details?.client_id ?? "Unavailable"}
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                Requested access
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {(details?.scopes?.length
                  ? details.scopes
                  : [
                      "tasks.read",
                      "tasks.write",
                      "routines.read",
                      "routines.write",
                    ]
                ).map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                className="w-full"
                disabled={actionLoading}
                onClick={() => handleDecision("approve")}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve access"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={actionLoading}
                onClick={() => handleDecision("deny")}
              >
                Deny
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

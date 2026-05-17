import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentOrganization } from "@/hooks/useOrganization";
import { useProjects } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function AdminDebug() {
  const { data: currentUser, isLoading: loadingUser, error: userError, refetch: refetchUser } = useCurrentUser();
  const { data: currentOrg, isLoading: loadingOrg, error: orgError, refetch: refetchOrg } = useCurrentOrganization();
  const { data: projectsData, isLoading: loadingProjects, error: projectsError, refetch: refetchProjects } = useProjects();
  
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<string>("Checking...");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        setProfile(data);
      }
    };
    fetchProfile();
    
    // Check if we can reach the database
    supabase.from("projects").select("id", { count: 'exact', head: true }).then(({ error }) => {
      setDbStatus(error ? `Error: ${error.message}` : "Connected");
    });
  }, []);

  const handleFullRefresh = () => {
    refetchUser();
    refetchOrg();
    refetchProjects();
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Diagnostics</h1>
        <Button onClick={handleFullRefresh} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Full Page Refresh
        </Button>
      </div>

      {(userError || orgError || projectsError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errors Detected</AlertTitle>
          <AlertDescription>
            {userError?.message || orgError?.message || projectsError?.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Auth & User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>User ID:</strong> {currentUser?.id || "Not found"}</div>
            <div><strong>Role:</strong> {currentUser?.role || "Not found"}</div>
            <div><strong>Email (Session):</strong> {session?.user?.email || "N/A"}</div>
            <div><strong>Supabase URL:</strong> {(supabase as any).supabaseUrl}</div>
            <div><strong>DB Status:</strong> {dbStatus}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile & Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Profile current_org_id:</strong> {profile?.current_organization_id || "None"}</div>
            <div><strong>Hook currentOrg:</strong> {currentOrg?.name} ({currentOrg?.id || "None"})</div>
            <div><strong>Permissions Count:</strong> {currentUser?.permissions?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Project Count (Query):</strong> {projectsData?.totalCount ?? "Loading..."}</div>
            <div className="text-xs text-muted-foreground mt-4">
              If count is 0 but projects exist in DB, verify the <code>organization_id</code> of those projects matches your current organization.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

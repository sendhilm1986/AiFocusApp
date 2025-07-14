"use client";

import React, { useState, useEffect } from 'react';
import { AdminDiagnostics } from './admin-diagnostics';
import { MusicManagement } from './music-management';
import { SimpleTTSTest } from '@/components/simple-tts-test';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  BarChart3, 
  AlertCircle, 
  Shield, 
  Activity,
  Calendar,
  TrendingUp,
  RefreshCw,
  UserCheck,
  Clock,
  Loader2,
  Trash2,
  AlertTriangle,
  Bug,
  Music,
  Volume2
} from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ADMIN_EMAIL = 'sendhil@clickworthy.in';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  first_name: string;
  last_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  stress_entries_count: number;
  last_stress_entry: string | null;
}

interface Analytics {
  totalUsers: number;
  totalStressEntries: number;
  averageStress: number;
  recentActivity: number;
  activeUsers: number;
}

export const AdminDashboard: React.FC = () => {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [flushLoading, setFlushLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [session]);

  const checkAdminAccess = async () => {
    if (!session?.user) {
      setError("You must be logged in to access the admin dashboard");
      setLoading(false);
      return;
    }

    if (session.user.email !== ADMIN_EMAIL) {
      setError("Access denied: Admin privileges required");
      setLoading(false);
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    
    await Promise.all([
      loadAnalytics(),
      loadUsers()
    ]);
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-service', {
        body: { action: 'get_analytics' },
      });

      if (error) throw error;
      
      setAnalytics(data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast.error(`Failed to load analytics: ${error.message}`);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-service', {
        body: { action: 'get_users' },
      });

      if (error) throw error;

      // Safeguard to ensure data is an array
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('Received non-array data for users:', data);
        toast.error('Received invalid user data from server.');
        setUsers([]); // Fallback to empty array to prevent crash
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error(`Failed to load users: ${error.message}`);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const flushAllUserData = async () => {
    setFlushLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-service', {
        body: { action: 'flush_non_admin_users' },
      });

      if (error) throw error;

      toast.success(data.message || 'All non-admin user data has been deleted successfully');
      
      await Promise.all([loadAnalytics(), loadUsers()]);
    } catch (error: any) {
      console.error('Failed to flush user data:', error);
      toast.error(`Failed to flush user data: ${error.message}`);
    } finally {
      setFlushLoading(false);
    }
  };

  const refreshData = async () => {
    await Promise.all([
      loadAnalytics(),
      loadUsers()
    ]);
    toast.success('Data refreshed successfully');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              {error || "You don't have admin privileges."}
            </p>
            <div className="flex justify-center">
              <Button onClick={() => window.location.href = "/"}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Badge variant="secondary">Secure</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refreshData} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Flush All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Flush All User Data
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL user data except for the admin account ({ADMIN_EMAIL}). 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={flushAllUserData}
                  disabled={flushLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {flushLoading ? 'Flushing...' : 'Yes, Flush All Data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="music">Music Management</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Analytics
                {analyticsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-blue-500" /><span className="text-sm font-medium">Total Users</span></div><p className="text-2xl font-bold">{analytics.totalUsers}</p></Card>
                  <Card className="p-4"><div className="flex items-center gap-2 mb-2"><UserCheck className="h-4 w-4 text-green-500" /><span className="text-sm font-medium">Active Users</span></div><p className="text-2xl font-bold">{analytics.activeUsers}</p><p className="text-xs text-muted-foreground">Last 30 days</p></Card>
                  <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-purple-500" /><span className="text-sm font-medium">Stress Entries</span></div><p className="text-2xl font-bold">{analytics.totalStressEntries}</p></Card>
                  <Card className="p-4"><div className="flex items-center gap-2 mb-2"><BarChart3 className="h-4 w-4 text-orange-500" /><span className="text-sm font-medium">Avg. Stress</span></div><p className="text-2xl font-bold">{analytics.averageStress}/5</p></Card>
                  <Card className="p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-red-500" /><span className="text-sm font-medium">Recent Activity</span></div><p className="text-2xl font-bold">{analytics.recentActivity}</p><p className="text-xs text-muted-foreground">Last 7 days</p></Card>
                </div>
              ) : (
                <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" /><p>Loading analytics...</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
                {usersLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {users.length} users loaded
              </p>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" /><p>Loading users...</p></div>
              ) : users.length === 0 ? (
                <div className="text-center py-8"><Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-lg font-medium mb-2">No users found</p></div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <Card key={user.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{user.displayName}</h3>
                            <Badge variant="outline">{user.email}</Badge>
                            {user.id === session?.user?.id && <Badge variant="destructive">Admin</Badge>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Joined: {formatDate(user.created_at)}</span></div>
                            <div className="flex items-center gap-2"><Activity className="h-4 w-4" /><span>Entries: {user.stress_entries_count}</span></div>
                            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>Last activity: {formatDate(user.last_stress_entry)}</span></div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="music" className="space-y-6">
          <MusicManagement />
        </TabsContent>
        
        <TabsContent value="debug" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5" />System Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminDiagnostics />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Volume2 className="h-5 w-5" />Text-to-Speech (TTS) Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTTSTest />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
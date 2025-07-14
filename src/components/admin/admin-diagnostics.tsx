"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Database,
  Key,
  Users,
  Settings
} from 'lucide-react';

const ADMIN_EMAIL = 'your_new_admin_email@example.com';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const AdminDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);
    const diagnostics: DiagnosticResult[] = [];

    // Test 1: Check admin authentication
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        diagnostics.push({
          test: 'Admin Authentication',
          status: 'error',
          message: 'Not authenticated',
          details: error
        });
      } else if (user.email !== ADMIN_EMAIL) {
        diagnostics.push({
          test: 'Admin Authentication',
          status: 'error',
          message: `Wrong user: ${user.email}`,
          details: user
        });
      } else {
        diagnostics.push({
          test: 'Admin Authentication',
          status: 'success',
          message: 'Admin user authenticated',
          details: { email: user.email, id: user.id }
        });
      }
    } catch (error) {
      diagnostics.push({
        test: 'Admin Authentication',
        status: 'error',
        message: 'Authentication check failed',
        details: error
      });
    }

    // Test 2: Check profiles table access
    try {
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });
      
      if (error) {
        diagnostics.push({
          test: 'Profiles Table Access',
          status: 'error',
          message: `Cannot access profiles: ${error.message}`,
          details: error
        });
      } else {
        diagnostics.push({
          test: 'Profiles Table Access',
          status: 'success',
          message: `Found ${count} profiles`,
          details: { count, sample: data?.slice(0, 2) }
        });
      }
    } catch (error) {
      diagnostics.push({
        test: 'Profiles Table Access',
        status: 'error',
        message: 'Profiles table check failed',
        details: error
      });
    }

    // Test 3: Check stress_entries table access
    try {
      const { data, error, count } = await supabase
        .from('stress_entries')
        .select('*', { count: 'exact' });
      
      if (error) {
        diagnostics.push({
          test: 'Stress Entries Access',
          status: 'error',
          message: `Cannot access stress entries: ${error.message}`,
          details: error
        });
      } else {
        diagnostics.push({
          test: 'Stress Entries Access',
          status: 'success',
          message: `Found ${count} stress entries`,
          details: { count }
        });
      }
    } catch (error) {
      diagnostics.push({
        test: 'Stress Entries Access',
        status: 'error',
        message: 'Stress entries check failed',
        details: error
      });
    }

    // Test 4: Check admin-service Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('admin-service', {
        body: { action: 'get_analytics' }
      });
      
      if (error) {
        diagnostics.push({
          test: 'Admin Service Function',
          status: 'error',
          message: `Edge function error: ${error.message}`,
          details: error
        });
      } else {
        diagnostics.push({
          test: 'Admin Service Function',
          status: 'success',
          message: 'Edge function responding',
          details: data
        });
      }
    } catch (error) {
      diagnostics.push({
        test: 'Admin Service Function',
        status: 'error',
        message: 'Edge function not accessible',
        details: error
      });
    }

    // Test 5: Check is_admin function
    try {
      const { data, error } = await supabase.rpc('is_admin', { 
        user_id: (await supabase.auth.getUser()).data.user?.id 
      });
      
      if (error) {
        diagnostics.push({
          test: 'Admin Check Function',
          status: 'error',
          message: `Admin function error: ${error.message}`,
          details: error
        });
      } else {
        diagnostics.push({
          test: 'Admin Check Function',
          status: data ? 'success' : 'warning',
          message: data ? 'Admin privileges confirmed' : 'Admin privileges denied',
          details: { is_admin: data }
        });
      }
    } catch (error) {
      diagnostics.push({
        test: 'Admin Check Function',
        status: 'error',
        message: 'Admin check failed',
        details: error
      });
    }

    setResults(diagnostics);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin Dashboard Diagnostics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Run diagnostics to identify why the admin dashboard isn't showing users
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              Run Diagnostics
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Diagnostic Results:</h3>
            {results.map((result, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.test}</span>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {result.message}
                </p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Show Details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </Card>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {results.some(r => r.test === 'Admin Service Function' && r.status === 'error') && (
                <li>• Deploy the admin-service Edge Function to Supabase</li>
              )}
              {results.some(r => r.test === 'Admin Check Function' && r.status === 'error') && (
                <li>• Check if the is_admin database function exists</li>
              )}
              {results.some(r => r.test === 'Profiles Table Access' && r.status === 'error') && (
                <li>• Check RLS policies on the profiles table</li>
              )}
              <li>• Ensure ADMIN_SERVICE_ROLE_KEY is set in Supabase secrets</li>
              <li>• Verify the service role has access to auth.users table</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'sendhil@clickworthy.in';

serve(async (req: Request) => {
  console.log('=== Admin Service Function Started ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify admin access using regular client
    console.log('Step 1: Verifying admin access...');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (user.email !== ADMIN_EMAIL) {
      console.error('User is not admin:', user.email);
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log('Admin verified:', user.email);

    // 2. Create service role client for data access
    console.log('Step 2: Creating service role client...');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment variables.');
      return new Response(JSON.stringify({ error: 'Service configuration error: Missing service role key.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('Service role key found.');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log('Service role client created successfully.');

    const { action } = await req.json();
    console.log('Action requested:', action);

    let result;

    switch (action) {
      case 'get_analytics':
        result = await getAnalytics(adminClient);
        break;
      case 'get_users':
        result = await getUsers(adminClient);
        break;
      case 'flush_non_admin_users':
        result = await flushNonAdminUsers(adminClient);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Action completed successfully');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('=== Admin Service Error ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Admin service failed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function getAnalytics(client: any) {
  console.log('Getting analytics...');
  
  // Get total users from auth.users
  const { data: authData, error: authError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  
  if (authError) {
    console.error('Error getting auth users:', authError);
    throw authError;
  }

  const totalUsers = authData?.users?.length || 0;
  console.log('Total auth users:', totalUsers);

  // Get stress entries
  const { data: stressEntries, error: stressError } = await client
    .from('stress_entries')
    .select('stress_score, created_at, user_id');

  if (stressError) {
    console.error('Error getting stress entries:', stressError);
    throw stressError;
  }

  const totalStressEntries = stressEntries?.length || 0;
  console.log('Total stress entries:', totalStressEntries);

  // Calculate average stress
  const averageStress = stressEntries && stressEntries.length > 0
    ? stressEntries.reduce((sum: number, entry: any) => sum + entry.stress_score, 0) / stressEntries.length
    : 0;

  // Calculate recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentEntries = stressEntries?.filter((entry: any) => 
    new Date(entry.created_at) >= sevenDaysAgo
  ) || [];

  // Calculate active users (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeUserIds = new Set(
    stressEntries?.filter((entry: any) => 
      new Date(entry.created_at) >= thirtyDaysAgo
    ).map((entry: any) => entry.user_id) || []
  );

  const analytics = {
    totalUsers,
    totalStressEntries,
    averageStress: Math.round(averageStress * 10) / 10,
    recentActivity: recentEntries.length,
    activeUsers: activeUserIds.size
  };

  console.log('Analytics calculated:', analytics);
  return analytics;
}

async function getUsers(client: any) {
  console.log('Getting users...');
  
  // Get all users from auth.users
  const { data: authData, error: authError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  
  if (authError) {
    console.error('Error getting auth users:', authError);
    throw authError;
  }

  const authUsers = authData?.users || [];
  console.log('Found auth users:', authUsers.length);

  // Get all profiles
  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error('Error getting profiles:', profilesError);
    // Don't throw, continue without profiles
  }

  console.log('Found profiles:', profiles?.length || 0);

  // Process each user
  const users = await Promise.all(
    authUsers.map(async (authUser: any) => {
      try {
        // Find matching profile
        const profile = profiles?.find((p: any) => p.id === authUser.id);
        
        // Get stress entry count
        const { count: stressCount } = await client
          .from('stress_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);

        // Get last stress entry
        const { data: lastEntry } = await client
          .from('stress_entries')
          .select('created_at')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const displayName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : '';

        return {
          id: authUser.id,
          email: authUser.email,
          displayName: displayName || authUser.email,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          stress_entries_count: stressCount || 0,
          last_stress_entry: lastEntry?.created_at || null,
          banned_until: authUser.banned_until
        };
      } catch (userError) {
        console.error(`Error processing user ${authUser.id}:`, userError);
        return {
          id: authUser.id,
          email: authUser.email,
          displayName: authUser.email,
          first_name: '',
          last_name: '',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          stress_entries_count: 0,
          last_stress_entry: null,
          banned_until: authUser.banned_until
        };
      }
    })
  );

  console.log('Users processed:', users.length);
  return users;
}

async function flushNonAdminUsers(client: any) {
  console.log('Flushing non-admin users...');
  
  try {
    // Get all users from auth.users
    const { data: authData, error: authError } = await client.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (authError) {
      console.error('Error getting auth users:', authError);
      throw authError;
    }

    const authUsers = authData?.users || [];
    console.log('Found auth users:', authUsers.length);

    // Filter out admin user
    const nonAdminUsers = authUsers.filter((user: any) => user.email !== ADMIN_EMAIL);
    console.log('Non-admin users to delete:', nonAdminUsers.length);

    let deletedCount = 0;
    let errors = [];

    // Delete each non-admin user
    for (const user of nonAdminUsers) {
      try {
        console.log(`Deleting user: ${user.email} (${user.id})`);
        
        // Delete user's stress entries first
        const { error: stressError } = await client
          .from('stress_entries')
          .delete()
          .eq('user_id', user.id);
        
        if (stressError) {
          console.error(`Error deleting stress entries for ${user.email}:`, stressError);
        }

        // Delete user's profile
        const { error: profileError } = await client
          .from('profiles')
          .delete()
          .eq('id', user.id);
        
        if (profileError) {
          console.error(`Error deleting profile for ${user.email}:`, profileError);
        }

        // Delete the auth user
        const { error: deleteError } = await client.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`Error deleting auth user ${user.email}:`, deleteError);
          errors.push(`Failed to delete ${user.email}: ${deleteError.message}`);
        } else {
          deletedCount++;
          console.log(`Successfully deleted user: ${user.email}`);
        }
        
      } catch (userError: any) {
        console.error(`Exception deleting user ${user.email}:`, userError);
        errors.push(`Exception deleting ${user.email}: ${userError.message}`);
      }
    }

    const result = {
      success: true,
      message: `Flushed ${deletedCount} non-admin users`,
      deletedCount,
      totalNonAdminUsers: nonAdminUsers.length,
      errors: errors.length > 0 ? errors : null
    };

    console.log('Flush operation completed:', result);
    return result;

  } catch (error: any) {
    console.error('Error in flushNonAdminUsers:', error);
    throw error;
  }
}
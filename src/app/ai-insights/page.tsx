"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  Activity, 
  Calendar,
  AlertCircle,
  Loader2,
  Lightbulb,
  Target,
  Heart,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown

interface StressEntry {
  id: string;
  stress_score: number;
  notes: string | null;
  created_at: string;
}

export default function AIInsightsPage() {
  const { session } = useSession();
  const [stressEntries, setStressEntries] = useState<StressEntry[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchStressEntries();
    }
  }, [session]);

  const fetchStressEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stress_entries')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStressEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching stress entries:', error);
      toast.error('Failed to load stress entries');
    } finally {
      setLoading(false);
    }
  };

  const generateAnalysis = async () => {
    if (stressEntries.length === 0) {
      toast.error('No stress entries found. Please track some stress levels first.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-stress', {
        body: { stressEntries }
      });

      if (error) throw error;
      
      setAnalysis(data.analysis);
      toast.success('AI analysis generated successfully!');
    } catch (error: any) {
      console.error('Error generating analysis:', error);
      setError(error.message || 'Failed to generate AI analysis');
      toast.error('Failed to generate AI analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const getStressStats = () => {
    if (stressEntries.length === 0) return null;

    const total = stressEntries.length;
    const average = stressEntries.reduce((sum, entry) => sum + entry.stress_score, 0) / total;
    const highStress = stressEntries.filter(entry => entry.stress_score >= 4).length;
    const lowStress = stressEntries.filter(entry => entry.stress_score <= 2).length;
    
    // Recent trend (last 7 vs previous 7)
    const recent = stressEntries.slice(0, 7);
    const previous = stressEntries.slice(7, 14);
    const recentAvg = recent.length > 0 ? recent.reduce((sum, entry) => sum + entry.stress_score, 0) / recent.length : 0;
    const previousAvg = previous.length > 0 ? previous.reduce((sum, entry) => sum + entry.stress_score, 0) / previous.length : 0;
    const trend = recentAvg - previousAvg;

    return {
      total,
      average: Math.round(average * 10) / 10,
      highStress,
      lowStress,
      trend: Math.round(trend * 10) / 10,
      recentAvg: Math.round(recentAvg * 10) / 10
    };
  };

  const stats = getStressStats();

  if (loading) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your stress data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">AI Insights</h1>
          <p className="text-muted-foreground">
            Get personalized insights and recommendations based on your stress patterns
          </p>
        </div>

        {stressEntries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Data Available</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your stress levels to get personalized AI insights.
              </p>
              <Button onClick={() => window.location.href = '/stress-tracker'}>
                Start Tracking Stress
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Total Entries</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Average Stress</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.average}/5</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Recent Trend</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {stats.trend > 0 ? '+' : ''}{stats.trend}
                      </p>
                      <Badge variant={stats.trend > 0 ? 'destructive' : stats.trend < 0 ? 'default' : 'secondary'}>
                        {stats.trend > 0 ? 'Increasing' : stats.trend < 0 ? 'Decreasing' : 'Stable'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">High Stress Days</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.highStress}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((stats.highStress / stats.total) * 100)}% of entries
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Analysis Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Analysis & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!analysis ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Generate AI Insights</h3>
                    <p className="text-muted-foreground mb-4">
                      Get personalized insights and recommendations based on your {stats?.total} stress entries.
                    </p>
                    <Button onClick={generateAnalysis} disabled={analyzing}>
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Generate AI Analysis
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          <h4 className="font-medium">AI Insights & Recommendations</h4>
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          <ReactMarkdown>{analysis}</ReactMarkdown> {/* Render markdown here */}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={generateAnalysis} disabled={analyzing} variant="outline">
                        {analyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            Regenerate Analysis
                          </>
                        )}
                      </Button>
                      <Button onClick={() => window.location.href = '/stress-tracker'} variant="outline">
                        <Target className="h-4 w-4 mr-2" />
                        Track More Stress
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => window.location.href = '/stress-tracker'}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Activity className="h-6 w-6" />
                    <span>Track Stress Now</span>
                  </Button>
                  
                  <Button 
                    onClick={() => window.location.href = '/stress-tracker'}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Heart className="h-6 w-6" />
                    <span>Breathing Exercise</span>
                  </Button>
                  
                  <Button 
                    onClick={() => window.location.href = '/stress-tracker'}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Calendar className="h-6 w-6" />
                    <span>View Calendar</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
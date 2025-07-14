"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wind, Mail, Lock, Eye, EyeOff, AlertCircle, BarChart3, Brain, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Account created successfully! Please check your email to verify your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        router.push('/');
      }
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 sm:p-12 min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-5xl w-full mx-auto space-y-8">
        {/* Logo and Title - Centered above both columns */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex items-center justify-center gap-3">
            <Wind className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-primary font-heading">
              Clarity & Peace
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Your personal companion for stress management and well-being.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Column: Feature Cards */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-blue-700">
                  <BarChart3 className="h-6 w-6" />
                  Track Your Stress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-800">
                  Easily log your stress levels and notes throughout the day to understand your patterns.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-purple-700">
                  <Brain className="h-6 w-6" />
                  Personalized AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-800">
                  Receive intelligent analysis and actionable recommendations tailored to your unique stress data.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-green-700">
                  <Wind className="h-6 w-6" />
                  Guided Breathing Exercises
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-800">
                  Engage in AI-guided breathing sessions designed to help you find calm and peace in minutes.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Auth Form */}
          <div className="max-w-md mx-auto w-full">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6">
                  <Separator />
                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    </p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError(null);
                      }}
                      className="mt-2"
                    >
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
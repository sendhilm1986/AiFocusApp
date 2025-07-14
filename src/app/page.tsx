"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wind, Brain, BarChart3, User, Sparkles, Heart, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Wind className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-primary font-heading">
              Clarity & Peace
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your personal stress management companion. Track your stress, get AI insights, 
            and find peace through guided breathing exercises.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Stress Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Monitor your stress levels throughout the day with our intuitive tracking system.
              </p>
              <Link href="/stress-tracker">
                <Button className="w-full">
                  Start Tracking
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Get personalized insights and recommendations based on your stress patterns.
              </p>
              <Link href="/ai-insights">
                <Button className="w-full">
                  View Insights
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-green-500" />
                Breathing Exercises
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                AI-guided breathing sessions personalized to your current stress level.
              </p>
              <Link href="/stress-tracker">
                <Button className="w-full">
                  Start Session
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Manage your personal information and customize your experience.
              </p>
              <Link href="/profile">
                <Button className="w-full" variant="outline">
                  Edit Profile
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-pink-500" />
                Wellness Journey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Track your progress and celebrate your wellness achievements.
              </p>
              <Link href="/stress-tracker">
                <Button className="w-full" variant="outline">
                  View Progress
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Mindfulness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Discover mindfulness techniques and build healthy stress management habits.
              </p>
              <Link href="/ai-insights">
                <Button className="w-full" variant="outline">
                  Learn More
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to Start Your Wellness Journey?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Take the first step towards better stress management. Track your current stress level 
              and get personalized recommendations to help you find peace and clarity.
            </p>
            <Link href="/stress-tracker">
              <Button size="lg" className="mt-4">
                Get Started Today
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
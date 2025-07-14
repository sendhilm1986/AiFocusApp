"use client";

import React, { useState, useEffect } from 'react';
import { format, parseISO, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle, Smile, Meh, Frown, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface StressEntry {
  id: string;
  stress_score: number;
  notes: string | null;
  created_at: string;
}

interface DayStressData {
  date: Date;
  averageStress: number;
  entryCount: number;
  entries: StressEntry[];
}

interface StressCalendarProps {
  stressEntries: StressEntry[];
}

// Colored SVG icons for stress scores 1-5
const stressIcons: { [key: number]: { icon: React.ElementType; color: string; label: string; bgColor: string; borderColor: string } } = {
  1: { 
    icon: CheckCircle, 
    color: "text-green-600", 
    label: "No Stress",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  2: { 
    icon: Smile, 
    color: "text-lime-600", 
    label: "Low Stress",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-200"
  },
  3: { 
    icon: Meh, 
    color: "text-amber-600", 
    label: "Moderate Stress",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200"
  },
  4: { 
    icon: Frown, 
    color: "text-orange-600", 
    label: "High Stress",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  },
  5: { 
    icon: XCircle, 
    color: "text-red-600", 
    label: "Very High Stress",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  },
};

const getStressLevel = (score: number): number => {
  if (score <= 1.5) return 1;
  if (score <= 2.5) return 2;
  if (score <= 3.5) return 3;
  if (score <= 4.5) return 4;
  return 5;
};

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const StressCalendar: React.FC<StressCalendarProps> = ({ stressEntries }) => {
  const [dayStressData, setDayStressData] = useState<DayStressData[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<DayStressData | null>(null);

  useEffect(() => {
    const aggregatedData = new Map<string, { total: number, count: number, entries: StressEntry[] }>();

    stressEntries.forEach(entry => {
      const date = parseISO(entry.created_at);
      const dateKey = format(date, 'yyyy-MM-dd');

      if (!aggregatedData.has(dateKey)) {
        aggregatedData.set(dateKey, { total: 0, count: 0, entries: [] });
      }
      const data = aggregatedData.get(dateKey)!;
      data.total += entry.stress_score;
      data.count += 1;
      data.entries.push(entry);
    });

    const processedData: DayStressData[] = Array.from(aggregatedData.entries()).map(([dateKey, data]) => ({
      date: parseISO(dateKey),
      averageStress: data.total / data.count,
      entryCount: data.count,
      entries: data.entries.sort((a, b) => parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()),
    }));

    setDayStressData(processedData);
  }, [stressEntries]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for proper calendar layout
  const startPadding = getDay(monthStart);
  const paddingDays = Array.from({ length: startPadding }, (_, i) => {
    const paddingDate = new Date(monthStart);
    paddingDate.setDate(paddingDate.getDate() - (startPadding - i));
    return paddingDate;
  });

  const allDays = [...paddingDays, ...calendarDays];

  const getDayStressData = (date: Date): DayStressData | null => {
    return dayStressData.find(d => isSameDay(d.date, date)) || null;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayData = getDayStressData(date);
    setSelectedDayData(dayData);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    setSelectedDate(null);
    setSelectedDayData(null);
  };

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Stress Calendar View
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on a day to see detailed stress information for that date.
          </p>
        </CardHeader>
        <CardContent>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-xl font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {allDays.map((date, index) => {
              const dayData = getDayStressData(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isToday = isSameDay(date, new Date());
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const stressLevel = dayData ? getStressLevel(dayData.averageStress) : null;
              const stressConfig = stressLevel ? stressIcons[stressLevel] : null;

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    "relative p-2 h-12 w-full rounded-lg border transition-all duration-200",
                    "hover:border-primary hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                    !isCurrentMonth && "text-muted-foreground opacity-50",
                    isCurrentMonth && "border-border",
                    isToday && "ring-2 ring-primary ring-offset-1",
                    isSelected && "bg-primary text-primary-foreground",
                    stressConfig && !isSelected && `${stressConfig.bgColor} ${stressConfig.borderColor}`,
                    dayData && !isSelected && "border-2"
                  )}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected && "text-primary-foreground"
                    )}>
                      {format(date, 'd')}
                    </span>
                    {dayData && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {stressConfig && (
                          <stressConfig.icon className={cn(
                            "h-3 w-3",
                            isSelected ? "text-primary-foreground" : stressConfig.color
                          )} />
                        )}
                        <span className={cn(
                          "text-xs font-bold",
                          isSelected && "text-primary-foreground"
                        )}>
                          {dayData.averageStress.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Stress Level Legend:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {Object.entries(stressIcons).map(([score, data]) => {
                const Icon = data.icon;
                return (
                  <div key={score} className={cn(
                    "flex items-center gap-2 p-2 rounded-md border",
                    data.bgColor,
                    data.borderColor
                  )}>
                    <Icon className={cn("h-4 w-4", data.color)} />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{data.label}</span>
                      <span className="text-xs text-muted-foreground">({score}/5)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDate && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {selectedDayData.averageStress.toFixed(1)}/5
                    </p>
                    <p className="text-sm text-muted-foreground">Average Stress</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-secondary-foreground">
                      {selectedDayData.entryCount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDayData.entryCount === 1 ? 'Entry' : 'Entries'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Stress Entries for this day:</h4>
                  <div className="space-y-2">
                    {selectedDayData.entries.map((entry) => {
                      const Icon = stressIcons[entry.stress_score]?.icon || Meh;
                      const iconColor = stressIcons[entry.stress_score]?.color || "text-amber-600";
                      
                      return (
                        <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <Icon className={cn("h-5 w-5 mt-0.5", iconColor)} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Stress Level: {entry.stress_score}/5</span>
                              <span className="text-sm text-muted-foreground">
                                at {format(parseISO(entry.created_at), 'h:mm a')}
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                "{entry.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Meh className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No stress entries recorded for this day.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start tracking your stress to see data here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
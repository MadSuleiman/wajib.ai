import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type InsightsGridProps = {
  categoryChartData: { name: string; count: number }[];
  recurringBreakdownData: { cadence: string; count: number }[];
  summaryText: string;
  activeCount: number;
  completedCount: number;
  categoryCount: number;
  recurringCount: number;
};

const chartConfig = {
  count: {
    label: "Tasks",
    color: "var(--chart-1)",
  },
  value: {
    label: "Tasks",
    color: "var(--chart-2)",
  },
} as const;

export function InsightsGrid({
  categoryChartData,
  recurringBreakdownData,
  summaryText,
  activeCount,
  completedCount,
  categoryCount,
  recurringCount,
}: InsightsGridProps) {
  const slides = useMemo(
    () => [
      {
        key: "categories",
        content: (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Category distribution</CardTitle>
              <CardDescription>
                How your tasks spread across focus areas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryChartData.length ? (
                <ChartContainer config={chartConfig} className="w-full">
                  <BarChart data={categoryChartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={6} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Start adding items to see category insights.
                </p>
              )}
            </CardContent>
          </Card>
        ),
      },
      {
        key: "recurring",
        content: (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recurring cadence</CardTitle>
              <CardDescription>
                Track how many routines you are maintaining.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {recurringBreakdownData.length ? (
                <ChartContainer config={chartConfig} className="w-full">
                  <LineChart data={recurringBreakdownData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="cadence"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Mark tasks as recurring to see cadence analytics.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Active
                  </p>
                  <p className="text-lg font-semibold">{activeCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-lg font-semibold">{completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ),
      },
      {
        key: "overview",
        content: (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>{summaryText}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-semibold">{activeCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-semibold">{completedCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl font-semibold">{categoryCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recurring</p>
                <p className="text-xl font-semibold">{recurringCount}</p>
              </div>
            </CardContent>
          </Card>
        ),
      },
    ],
    [
      activeCount,
      categoryChartData,
      categoryCount,
      completedCount,
      recurringBreakdownData,
      recurringCount,
      summaryText,
    ],
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Task insights</h2>
      <Carousel
        className="w-full"
        opts={{ align: "start", dragFree: true, loop: true }}
      >
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem
              key={slide.key}
              className="min-w-0 basis-1/1 sm:basis-1/1 lg:basis-1/2 xl:basis-1/3"
            >
              {slide.content}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </section>
  );
}

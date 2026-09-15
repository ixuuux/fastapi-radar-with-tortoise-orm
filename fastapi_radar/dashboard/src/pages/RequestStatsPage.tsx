import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { AreaChart } from "@/components/charts/AreaChart";
import { useDebounce } from "@/hooks/useDebounce";
import { Filter, RefreshCw, Calendar } from "lucide-react";
import { useT } from "@/i18n";
import { Input } from "@/components/ui/input";

export function RequestStatsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState<number | null>(1);
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [timeError, setTimeError] = useState("");
  const t = useT();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const formatToLocalISO = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const applyCustomPreset = (preset: string) => {
    const now = new Date();
    let start = new Date();

    switch (preset) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "yesterday": {
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        setCustomStartTime(formatToLocalISO(start));
        setCustomEndTime(formatToLocalISO(end));
        setTimeError("");
        return;
      }
      case "last3Hours":
        start.setHours(start.getHours() - 3);
        break;
      case "thisWeek":
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case "last7Days":
        start.setDate(start.getDate() - 7);
        break;
      case "lastMonth":
        start.setMonth(start.getMonth() - 1);
        break;
      default:
        start.setHours(start.getHours() - 24);
    }

    setCustomStartTime(formatToLocalISO(start));
    setCustomEndTime(formatToLocalISO(now));
    setTimeError("");
  };

  const validateTimeRange = () => {
    if (customStartTime && customEndTime) {
      const start = new Date(customStartTime);
      const end = new Date(customEndTime);
      if (start > end) {
        setTimeError(t("requests.filters.timeRangeError"));
        return false;
      }
    }
    setTimeError("");
    return true;
  };

  const handleCustomRangeToggle = (enabled: boolean) => {
    setUseCustomRange(enabled);
    if (enabled && !customStartTime && !customEndTime) {
      const now = new Date();
      const start = new Date(now.getTime() - 60 * 60 * 1000);
      setCustomStartTime(formatToLocalISO(start));
      setCustomEndTime(formatToLocalISO(now));
    }
  };

  const getStatusCode = (filter: string) => {
    switch (filter) {
      case "2xx":
        return 200;
      case "3xx":
        return 300;
      case "4xx":
        return 400;
      case "5xx":
        return 500;
      default:
        return undefined;
    }
  };

  const getFilterParams = useCallback(() => {
    const params: any = {
      status_code:
        statusFilter !== "all" ? getStatusCode(statusFilter) : undefined,
      method: methodFilter !== "all" ? methodFilter : undefined,
      search: debouncedSearchTerm || undefined,
    };

    if (useCustomRange) {
      if (customStartTime) {
        params.start_time = new Date(customStartTime).toISOString();
      }
      if (customEndTime) {
        params.end_time = new Date(customEndTime).toISOString();
      }
    } else if (timeRange) {
      params.start_time = new Date(
        Date.now() - timeRange * 60 * 60 * 1000
      ).toISOString();
    }

    return params;
  }, [statusFilter, methodFilter, debouncedSearchTerm, timeRange, useCustomRange, customStartTime, customEndTime]);

  const { data, isLoading, isSuccess, refetch } = useQuery({
    queryKey: ["request-minute-stats", statusFilter, methodFilter, debouncedSearchTerm, timeRange, useCustomRange, customStartTime, customEndTime],
    queryFn: () => apiClient.getRequestMinuteStats(getFilterParams()),
    refetchInterval: 30000,
  });

  const stats = data || [];
  const maxCount = stats.reduce((m, s) => Math.max(m, s.count), 0);

  const chartData = stats.map((s) => {
    const minute = new Date(s.minute);
    return {
      name: `${String(minute.getHours()).padStart(2, "0")}:${String(minute.getMinutes()).padStart(2, "0")}`,
      count: s.count,
    };
  });

  const totalIn = stats.reduce((n, s) => n + s.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("pages.requestStats.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("pages.requestStats.description")}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("common.filter")}</CardTitle>
          <CardDescription>
            {t("requestStats.filters.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="stats-search">{t("common.search")}</Label>
                <SearchInput
                  id="stats-search"
                  placeholder={t("requests.filters.searchPlaceholder")}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stats-status">{t("requests.filters.status")}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="stats-status">
                    <SelectValue placeholder={t("requests.statusFilters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("requests.statusFilters.all")}</SelectItem>
                    <SelectItem value="2xx">{t("requests.statusFilters.success")}</SelectItem>
                    <SelectItem value="3xx">{t("requests.statusFilters.redirect")}</SelectItem>
                    <SelectItem value="4xx">{t("requests.statusFilters.clientErrors")}</SelectItem>
                    <SelectItem value="5xx">{t("requests.statusFilters.serverErrors")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stats-method">{t("requests.filters.method")}</Label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger id="stats-method">
                    <SelectValue placeholder={t("requests.methodFilters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("requests.methodFilters.all")}</SelectItem>
                    <SelectItem value="GET">{t("requests.methodFilters.get")}</SelectItem>
                    <SelectItem value="POST">{t("requests.methodFilters.post")}</SelectItem>
                    <SelectItem value="PUT">{t("requests.methodFilters.put")}</SelectItem>
                    <SelectItem value="PATCH">{t("requests.methodFilters.patch")}</SelectItem>
                    <SelectItem value="DELETE">{t("requests.methodFilters.delete")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      if (validateTimeRange()) {
                        refetch();
                      }
                    }}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {t("requests.filters.apply")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("requests.filters.timeRange")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={!useCustomRange && timeRange === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTimeRange(null); setUseCustomRange(false); }}
                >
                  {t("requests.timeRangeFilters.all")}
                </Button>
                <Button
                  variant={!useCustomRange && timeRange === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTimeRange(1); setUseCustomRange(false); }}
                >
                  {t("requests.timeRangeFilters.lastHour")}
                </Button>
                <Button
                  variant={!useCustomRange && timeRange === 24 ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTimeRange(24); setUseCustomRange(false); }}
                >
                  {t("requests.timeRangeFilters.last24Hours")}
                </Button>
                <Button
                  variant={!useCustomRange && timeRange === 168 ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTimeRange(168); setUseCustomRange(false); }}
                >
                  {t("requests.timeRangeFilters.last7Days")}
                </Button>
                <Button
                  variant={useCustomRange ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCustomRangeToggle(true)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {t("requests.timeRangeFilters.custom")}
                </Button>
              </div>

              {useCustomRange && (
                <div className="mt-4 space-y-4 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex flex-wrap gap-2">
                    {["today", "yesterday", "last3Hours", "thisWeek", "last7Days", "lastMonth"].map((preset) => (
                      <Badge
                        key={preset}
                        variant="secondary"
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => applyCustomPreset(preset)}
                      >
                        {t(`requests.customPresets.${preset}`)}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="stats-startTime">{t("requests.filters.startTime")}</Label>
                      <Input
                        id="stats-startTime"
                        type="datetime-local"
                        value={customStartTime}
                        onChange={(e) => { setCustomStartTime(e.target.value); validateTimeRange(); }}
                        className="w-full"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="stats-endTime">{t("requests.filters.endTime")}</Label>
                      <Input
                        id="stats-endTime"
                        type="datetime-local"
                        value={customEndTime}
                        onChange={(e) => { setCustomEndTime(e.target.value); validateTimeRange(); }}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomStartTime("");
                          setCustomEndTime("");
                          setTimeError("");
                        }}
                      >
                        {t("common.clear")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (validateTimeRange()) {
                            refetch();
                          }
                        }}
                      >
                        {t("requests.filters.apply")}
                      </Button>
                    </div>
                  </div>
                  {timeError && (
                    <p className="text-sm text-red-500">{timeError}</p>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {t("requests.filters.timeRangeHint")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("requestStats.chart.title")}</CardTitle>
          <CardDescription>
            {t("requestStats.chart.description")}
            {isSuccess && (
              <>
                {" "}
                {t("requests.totalCount").replace("{count}", String(totalIn))}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("requestStats.chart.empty")}
            </div>
          ) : (
            <>
              <AreaChart
                data={chartData}
                areas={[
                  {
                    dataKey: "count",
                    name: t("requestStats.chart.concurrency"),
                  },
                ]}
                xDataKey="name"
                height={300}
                formatter="number"
                showGrid={true}
              />
              {maxCount > 0 && (
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  {t("requestStats.chart.maxPerMinute").replace("{count}", String(maxCount))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
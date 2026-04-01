// src/lib/device-farm-types.ts

export interface Layer2Output {
  layer: "runtime_analysis";
  device: {
    name: string;
    os_version: string;
    model_id: string;
  } | null;
  results: {
    launch_success: boolean;
    crashes: CrashReport[];
    crash_count: number;
    test_duration_seconds: number;
    memory_peak_mb: number | null;
    cpu_peak_percent: number | null;
    screenshots: string[];
    video_url: string | null;
    device_logs_url: string | null;
  };
  fuzz_results: {
    events_sent: number | null;
    ui_elements_discovered: number | null;
    unresponsive_periods: number | null;
  };
  skipped: boolean;
  skip_reason: string | null;
}

export interface CrashReport {
  timestamp: string | null;
  message: string;
  stack_trace: string | null;
}

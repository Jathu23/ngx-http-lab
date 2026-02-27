export interface ApiLog {
    id: string;
    timestamp: Date;
    method: string;
    url: string;
    status: number | null;
    duration: number | null;
    requestHeaders: Record<string, string>;
    requestBody: unknown;
    responseBody: unknown;
    responseOverride?: unknown;
    isMocked: boolean;
    isError: boolean;
}

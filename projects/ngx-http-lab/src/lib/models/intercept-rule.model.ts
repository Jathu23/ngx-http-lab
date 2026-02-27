export interface RequestModifier {
    headers?: Record<string, string>;
    bodyPatch?: Record<string, unknown>;
}

export interface MockResponse {
    status: number;
    body: unknown;
    delayMs?: number;
}

export interface InterceptRule {
    id: string;
    urlPattern: string;
    method?: string; // 'GET' | 'POST' | 'PUT' | 'DELETE' | '*'
    modifyRequest?: RequestModifier;
    mockResponse?: MockResponse;
    enabled: boolean;
}

export interface KeyValuePair {
    key: string;
    value: string;
    enabled: boolean;
}

export interface MockScenario {
    id: string;
    name: string;
    status: number;
    body: unknown;
    delayMs?: number;
    isActive: boolean;
    // When set, this scenario only matches if request body contains this JSON subset
    matchBodySubset?: any;
}

export interface RequestModifier {
    headers?: KeyValuePair[];
    queryParams?: KeyValuePair[];   // NEW: add/override query params on the outgoing request
    bodyPatch?: Record<string, unknown>;
}

export interface RequestMatchCriteria {
    queryParams?: KeyValuePair[];  // Match if URL contains these query params
    bodySubset?: any;              // Match if request body contains this JSON subset
}

export interface InterceptRule {
    id: string;
    name: string;
    urlPattern: string;
    method: string;
    enabled: boolean;
    matchCriteria?: RequestMatchCriteria;
    scenarios?: MockScenario[];
    modifyRequest?: RequestModifier;
}

export type ParameterDetails = {
    name: string;
    location: 'header' | 'query' | 'path';
    required: boolean;
    format?: string;
}

export type Parameter = {
    modelName: string;
    refType: 'parameter';
    isReference: boolean;
    parameterDetails: ParameterDetails;
}

export type SchemaReference = {
    modelName: string;
    refType: 'schema';
    type: 'string';
    items: any;
    isReference: boolean;
}

export type Response = {
    description: string;
    content: {
        'application/json': {
            schema: SchemaReference;
        };
    };
}

export type Method = {
    method: string;
    path: string;
    operationId: string;
    summary: string;
    requestBody: any;
    parameters: Parameter[];
    responses: {
        [key: string]: Response;
    };
}

export type Model = {
    name: string;
    type: 'parameter' | 'schema';
    source: string;
    usedIn: {
        endpoint: string;
        operation: string;
        usage: string;
    }[];
}



export interface OllamaModelDetails { 
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
}

export interface OllamaModel {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: OllamaModelDetails;
}

export interface OllamaTagResponse { 
    models: OllamaModel[];
}

export interface LocalModel {
  name: string
  sizeBytes: number | null
  modifiedAt: Date | null
  details: {
    family: string | null
    permanentSize: string | null
    quantizationLevel: string | null
    format: string | null
  }| null
}


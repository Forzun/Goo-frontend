import { LocalModel, OllamaModel, OllamaTagResponse } from "@/types/ollama"

const DEFAULT_BASE_URL = "http://localhost:11434"
const DEFAULT_TIMEOUT_MS = 5000 

export class OllamaConnectionError extends Error {
    readonly code = "OLLAMA_CONNECTION_ERROR"
    
    constructor(baseUrl: string , cause?: unknown) {
    super(
      `Could not connect to Ollama at ${baseUrl}. ` +
        `Make sure Ollama is running (e.g. start "Ollama" on macOS/Windows, ` +
        `or run "ollama serve" on Linux).`,
      { cause }
    )
        this.name = "OllamaConnectionError"
    }
}

export class OllamaResponseError extends Error { 
    readonly code = "OLLAMA_RESPONSE_ERROR" 
    readonly status: number;

    constructor(status: number , body: string) { 
       super(
      `Ollama responded with status ${status} ${body ? body : ""}.`,
      );
        this.name = "OllamaResponseError"
        this.status = status
    }
}

export interface FetchModelsOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** 
 * Normalize the response from the Ollama API into user friendly response
 */

function normalizeModel(raw: OllamaModel): LocalModel{ 
    const modifiedAt = raw.modified_at ? new Date(raw.modified_at) : null

    return { 
        name: raw.name, 
        sizeBytes: raw.size ?? null, 
        modifiedAt: modifiedAt, 
        details: raw.details ? { 
            family: raw.details.family ?? null, 
            permanentSize: raw.details.parameter_size ?? null,
            quantizationLevel: raw.details.quantization_level ?? null,
            format: raw.details.format ?? null,
        } : null,  
    }    
} 

export async function fetchOllamaModels(
    options: FetchModelsOptions = {},
): Promise<LocalModel[]>{ 

    const {
        baseUrl = DEFAULT_BASE_URL ,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        fetchImpl = fetch,
    } = options; 

    const url = `${baseUrl}api/tags`; 

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort() , timeoutMs);

    let response: Response
   
    try{

        response = await fetchImpl(url, { 
            method: "GET", 
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }, 
            signal: controller.signal
        }) 

    }catch(err){ 
        throw new OllamaConnectionError(baseUrl, err) 
    }finally{ 
        clearTimeout(timeout)
    }
   
    if(!response.ok) { 
        const body = await response.text().catch(() => undefined)
        throw new OllamaResponseError(response.status , body ?? "")
    }
    console.log("Response", response)
    console.log("json", response.json())
    
    let payload: OllamaTagResponse;
  
    try{ 
        payload = await response.json() as OllamaTagResponse
    }catch(error){
        throw new OllamaResponseError(response.status , "(Invaild JSON payload")
    }
  
    if (!payload || !Array.isArray(payload.models)) {
        return []
    }

    return (payload.models ?? []).map(normalizeModel) 
}
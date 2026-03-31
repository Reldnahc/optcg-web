import { useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { buildApiRootUrl } from "../api/client";
import { useOpenApiDocument } from "../api/hooks";
import type {
  JsonSchema,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiResponse,
} from "../api/types";

const METHOD_ORDER = ["get", "post", "put", "patch", "delete", "options", "head"] as const;

type OperationEntry = {
  method: string;
  path: string;
  operation: OpenApiOperation;
};

export function ApiDocs() {
  const { data, error, isLoading } = useOpenApiDocument();
  const apiBaseUrl = buildApiRootUrl("/").replace(/\/$/, "");

  if (isLoading) {
    return (
      <PageContainer
        title="API Documentation"
        subtitle={<>Base URL: <code className="text-accent break-all">{apiBaseUrl}</code></>}
      >
        <div className="rounded-xl border border-border bg-bg-card px-5 py-8 text-sm text-text-secondary">
          Loading the published OpenAPI document...
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer
        title="API Documentation"
        subtitle={<>Base URL: <code className="text-accent break-all">{apiBaseUrl}</code></>}
      >
        <div className="rounded-xl border border-banned/30 bg-banned/10 px-5 py-8 text-sm text-text-primary">
          Failed to load <code className="text-accent">/openapi.json</code>: {(error as Error | undefined)?.message ?? "Unknown error"}
        </div>
      </PageContainer>
    );
  }

  const sections = groupOperations(data);
  const openApiJsonUrl = buildApiRootUrl("/openapi.json");
  const docsUrl = buildApiRootUrl("/docs");
  const totalOperations = sections.reduce((total, section) => total + section.entries.length, 0);

  return (
    <PageContainer
      title="API Documentation"
      subtitle={<>The poneglyph.one API is free and public. Base URL: <code className="text-accent break-all">{apiBaseUrl}</code></>}
    >
      <section className="rounded-xl border border-border bg-bg-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              {data.info.description ?? "Published API contract generated from the live route schemas."}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border bg-bg-primary px-2.5 py-1 text-text-secondary">
                OpenAPI {data.openapi}
              </span>
              <span className="rounded-full border border-border bg-bg-primary px-2.5 py-1 text-text-secondary">
                API version {data.info.version}
              </span>
              <span className="rounded-full border border-border bg-bg-primary px-2.5 py-1 text-text-secondary">
                {totalOperations} operations
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-accent hover:bg-bg-hover" href={openApiJsonUrl} rel="noreferrer" target="_blank">
              Open raw JSON
            </a>
            <a className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-accent hover:bg-bg-hover" href={docsUrl} rel="noreferrer" target="_blank">
              Open API docs
            </a>
          </div>
        </div>
      </section>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.tag}>
            <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border pb-2">
              <h2 className="text-lg font-semibold">{section.tag}</h2>
              <span className="text-xs text-text-muted">{section.entries.length} endpoints</span>
            </div>
            <div className="space-y-4">
              {section.entries.map((entry) => (
                <EndpointCard key={`${entry.method}:${entry.path}`} entry={entry} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageContainer>
  );
}

function groupOperations(document: OpenApiDocument) {
  const tagOrder = new Map((document.tags ?? []).map((tag, index) => [tag.name, index]));
  const groups = new Map<string, OperationEntry[]>();

  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      const tag = operation.tags?.[0] ?? "Misc";
      const entries = groups.get(tag) ?? [];
      entries.push({ method, path, operation });
      groups.set(tag, entries);
    }
  }

  return [...groups.entries()]
    .map(([tag, entries]) => ({
      tag,
      entries: entries.sort((a, b) => {
        const methodDiff = methodOrder(a.method) - methodOrder(b.method);
        if (methodDiff !== 0) return methodDiff;
        return a.path.localeCompare(b.path);
      }),
    }))
    .sort((a, b) => {
      const tagDiff = (tagOrder.get(a.tag) ?? Number.MAX_SAFE_INTEGER) - (tagOrder.get(b.tag) ?? Number.MAX_SAFE_INTEGER);
      if (tagDiff !== 0) return tagDiff;
      return a.tag.localeCompare(b.tag);
    });
}

function methodOrder(method: string) {
  const index = METHOD_ORDER.indexOf(method.toLowerCase() as (typeof METHOD_ORDER)[number]);
  return index === -1 ? METHOD_ORDER.length : index;
}

function methodBadgeClass(method: string) {
  switch (method.toLowerCase()) {
    case "get":
      return "bg-legal/20 text-legal";
    case "post":
      return "bg-accent/20 text-accent";
    case "put":
    case "patch":
      return "bg-warning/20 text-warning";
    case "delete":
      return "bg-banned/20 text-banned";
    default:
      return "bg-bg-primary text-text-secondary";
  }
}

function schemaLabel(schema?: JsonSchema): string {
  if (!schema) return "unknown";
  if (typeof schema.$ref === "string") return schema.$ref;

  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf
      .map((item) => (item && typeof item === "object" ? schemaLabel(item as JsonSchema) : "unknown"))
      .join(" | ");
  }

  if (typeof schema.type === "string") {
    if (schema.type === "array") {
      const items = schema.items && typeof schema.items === "object" ? schema.items as JsonSchema : undefined;
      return `${schemaLabel(items)}[]`;
    }

    if (schema.type === "object") {
      if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        return `Record<string, ${schemaLabel(schema.additionalProperties as JsonSchema)}>`;
      }
      return "object";
    }

    return schema.type;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum.map((value) => String(value)).join(" | ");
  }

  return "unknown";
}

function SchemaPreview({ schema, title }: { schema?: JsonSchema; title: string }) {
  if (!schema) return null;

  return (
    <details className="mt-2 rounded-lg border border-border bg-bg-primary">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </summary>
      <pre className="overflow-x-auto border-t border-border px-3 py-3 text-xs text-text-secondary">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </details>
  );
}

function resolveTryItUrl(requestValue: string) {
  const trimmed = requestValue.trim();
  if (!trimmed) {
    throw new Error("Enter a request path before trying it.");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/{[^}]+}/.test(trimmed)) {
    throw new Error("Replace {path_params} in the request path before trying it.");
  }

  const parsed = new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, "https://placeholder.local");
  return buildApiRootUrl(parsed.pathname, Object.fromEntries(parsed.searchParams.entries()));
}

function EndpointCard({ entry }: { entry: OperationEntry }) {
  const { method, path, operation } = entry;
  const [requestValue, setRequestValue] = useState(path);
  const [response, setResponse] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const tryItSupported = method.toLowerCase() === "get";
  let resolvedUrl: string | null = null;
  let requestError: string | null = null;
  try {
    resolvedUrl = resolveTryItUrl(requestValue);
  } catch (error) {
    requestError = (error as Error).message;
  }

  if (!tryItSupported) {
    requestError = "Try it currently supports GET endpoints only.";
    resolvedUrl = null;
  }

  const tryIt = async () => {
    setLoading(true);
    setResponse(null);
    setResponseStatus(null);

    try {
      const targetUrl = resolveTryItUrl(requestValue);
      const res = await fetch(targetUrl, { method: method.toUpperCase() });
      const text = await res.text();
      let formatted = text;

      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // Keep non-JSON responses as plain text.
      }

      setResponseStatus(res.status);
      setResponse(formatted);
    } catch (error) {
      setResponse(`Error: ${(error as Error).message}`);
    }

    setLoading(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${methodBadgeClass(method)}`}>
                {method.toUpperCase()}
              </span>
              <code className="break-all text-sm text-accent">{path}</code>
            </div>
            <p className="mt-2 text-sm text-text-primary">{operation.summary ?? operation.operationId ?? "Untitled operation"}</p>
            {operation.description ? <p className="mt-1 text-sm text-text-secondary">{operation.description}</p> : null}
          </div>
          {operation.operationId ? <code className="break-all text-xs text-text-muted">{operation.operationId}</code> : null}
        </div>
      </div>

      {operation.parameters?.length ? (
        <div className="border-b border-border px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Parameters</p>
          <div className="space-y-2">
            {operation.parameters.map((parameter) => (
              <ParameterCard key={`${parameter.in}:${parameter.name}`} parameter={parameter} />
            ))}
          </div>
        </div>
      ) : null}

      {operation.requestBody ? (
        <div className="border-b border-border px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Request Body</p>
          <div className="space-y-2">
            {Object.entries(operation.requestBody.content ?? {}).map(([contentType, mediaType]) => (
              <div key={contentType} className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                  <code className="text-sm text-accent">{contentType}</code>
                  <span className="text-xs text-text-muted">
                    {schemaLabel(mediaType.schema)}{operation.requestBody?.required ? " · required" : ""}
                  </span>
                </div>
                <SchemaPreview schema={mediaType.schema} title="Request schema" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Responses</p>
        <div className="space-y-2">
          {Object.entries(operation.responses ?? {})
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
            .map(([status, details]) => (
              <ResponseCard key={status} status={status} response={details} />
            ))}
        </div>
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Try It</p>
        <div className="rounded-lg border border-border bg-bg-primary p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
            <span className={`self-start rounded px-2 py-1 text-xs font-bold ${methodBadgeClass(method)}`}>
              {method.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <input
                className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary"
                onChange={(event) => setRequestValue(event.target.value)}
                spellCheck={false}
                value={requestValue}
              />
              <p className="mt-2 break-all text-xs text-text-muted">
                Actual request: <code className="text-accent">{resolvedUrl || "Invalid request path"}</code>
              </p>
              {requestError ? <p className="mt-2 text-xs text-banned">{requestError}</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end px-4 py-3">
        <button
          className="self-start rounded border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || !resolvedUrl}
          onClick={tryIt}
        >
          {loading ? "..." : "Try it"}
        </button>
      </div>

      {response ? (
        <pre className="max-h-80 overflow-x-auto border-t border-border bg-bg-primary px-4 py-3 text-xs text-text-secondary">
          {responseStatus !== null ? `Status: ${responseStatus}\n\n` : ""}
          {response}
        </pre>
      ) : null}
    </div>
  );
}

function ParameterCard({ parameter }: { parameter: OpenApiParameter }) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
        <code className="text-sm text-accent">{parameter.name}</code>
        <span className="text-xs text-text-muted">
          {parameter.in} · {schemaLabel(parameter.schema)}{parameter.required ? " · required" : ""}
        </span>
      </div>
      {parameter.description ? <p className="mt-1 text-sm text-text-secondary">{parameter.description}</p> : null}
      <SchemaPreview schema={parameter.schema} title="Parameter schema" />
    </div>
  );
}

function ResponseCard({ status, response }: { status: string; response: OpenApiResponse }) {
  const contentEntries = Object.entries(response.content ?? {});

  return (
    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-bg-card px-2 py-0.5 text-xs font-semibold text-text-primary">{status}</span>
          <span className="text-sm text-text-secondary">{response.description || `HTTP ${status}`}</span>
        </div>
        <span className="text-xs text-text-muted">
          {contentEntries.length ? contentEntries.map(([contentType]) => contentType).join(", ") : "No content"}
        </span>
      </div>
      {contentEntries.length ? (
        <div className="mt-3 space-y-2">
          {contentEntries.map(([contentType, mediaType]) => (
            <div key={contentType}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <code className="text-sm text-accent">{contentType}</code>
                <span className="text-xs text-text-muted">{schemaLabel(mediaType.schema)}</span>
              </div>
              <SchemaPreview schema={mediaType.schema} title="Response schema" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

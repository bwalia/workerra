{{- define "workerra.labels" -}}
app.kubernetes.io/part-of: workerra
app.kubernetes.io/managed-by: helm
app.kubernetes.io/instance: {{ .Release.Name }}
workerra.uk/env: {{ .Values.env }}
{{- end -}}

{{- define "workerra.selector" -}}
app.kubernetes.io/name: workerra-web
{{- end -}}

{{/* Selector for one of the release's other components (opsapi, opsapi-postgres). */}}
{{- define "workerra.component" -}}
app.kubernetes.io/name: workerra-{{ .name }}
{{- end -}}

{{- define "workerra.opsapiImage" -}}
{{ .Values.opsapi.image.repository }}:{{ .Values.opsapi.image.tag | default .Values.image.tag }}
{{- end -}}

{{/* In-cluster URL of the release's OpsAPI, for the web app. */}}
{{- define "workerra.opsapiUrl" -}}
{{ printf "http://workerra-opsapi.%s.svc.cluster.local" .Release.Namespace }}
{{- end -}}

{{/* OpsAPI env, shared by the server container and its setup initContainer. */}}
{{- define "workerra.opsapiEnv" -}}
- name: LAPIS_ENVIRONMENT
  value: production
- name: OPSAPI_DEPLOY_ENV
  value: {{ .Values.env | quote }}
# Features (and their migrations) this OpsAPI runs: core plus the ATS, whose
# jobs the plugin's listings extend.
- name: PROJECT_CODE
  value: {{ .Values.opsapi.projectCode | quote }}
- name: NAMESPACE_NAME
  value: {{ .Values.opsapi.namespaceName | quote }}
- name: NAMESPACE_SLUG
  value: {{ .Values.opsapi.namespaceSlug | quote }}
# Fully qualified: OpsAPI's nginx resolver ignores the pod's DNS search
# domains, so a short Service name fails to resolve inside `lapis exec`.
- name: POSTGRES_HOST
  value: {{ printf "workerra-opsapi-postgres.%s.svc.cluster.local" .Release.Namespace }}
- name: POSTGRES_PORT
  value: {{ .Values.opsapi.postgres.port | quote }}
- name: POSTGRES_USER
  value: {{ .Values.opsapi.postgres.user | quote }}
- name: POSTGRES_DB
  value: {{ .Values.opsapi.postgres.database | quote }}
- name: POSTGRES_SSL
  value: "false"
- name: JWT_ISSUER
  value: opsapi
# Only Workerra's server calls this OpsAPI (API key, cluster-internal), so there
# are no OTP sessions or public traffic for Redis to rate-limit.
- name: REDIS_ENABLED
  value: "false"
{{- end -}}

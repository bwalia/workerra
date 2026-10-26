{{- define "workerra.labels" -}}
app.kubernetes.io/part-of: workerra
app.kubernetes.io/managed-by: helm
app.kubernetes.io/instance: {{ .Release.Name }}
workerra.uk/env: {{ .Values.env }}
{{- end -}}

{{- define "workerra.selector" -}}
app.kubernetes.io/name: workerra-web
{{- end -}}
